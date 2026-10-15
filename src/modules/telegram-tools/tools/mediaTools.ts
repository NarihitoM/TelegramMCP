import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { CustomFile, getPeerId } from "../../../shared/lib/gramjs.ts";
import { defineTool, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { ToolError } from "../services/errors.ts";
import { mapMessage } from "../services/mappers.ts";
import { getMessageById } from "../services/messages.ts";
import { resolvePeer } from "../services/peers.ts";
import { chatRef, messageId, parseMode, toParseMode } from "../services/schemas.ts";

const MAX_DOWNLOAD_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const DICE = {
  dice: "\u{1F3B2}",
  darts: "\u{1F3AF}",
  basketball: "\u{1F3C0}",
  football: "⚽",
  bowling: "\u{1F3B3}",
  slots: "\u{1F3B0}",
};

type DiceKind = keyof typeof DICE;

const diceKinds = Object.keys(DICE) as [DiceKind, ...DiceKind[]];

function decodeBase64(data: string): Buffer {
  const buffer = Buffer.from(data.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (buffer.length === 0) throw new ToolError("base64 data is empty");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new ToolError("Inline uploads are limited to 3 MB. Pass a public url instead.");
  return buffer;
}

function documentInfo(media: Api.TypeMessageMedia | undefined): { size: number; mimeType: string; fileName: string } | null {
  if (!(media instanceof Api.MessageMediaDocument) || !(media.document instanceof Api.Document)) return null;
  const { document } = media;
  const name = document.attributes.find(
    (attribute): attribute is Api.DocumentAttributeFilename => attribute instanceof Api.DocumentAttributeFilename,
  );
  return { size: Number(document.size.toString()), mimeType: document.mimeType, fileName: name?.fileName ?? "file" };
}

export function registerMediaTools(server: McpServer): void {
  defineTool(server, "send_file", {
    title: "Send file",
    description:
      "Send a photo, video, document or voice note. Pass a public url (Telegram downloads it) or base64 data up to 3 MB.",
    input: z.object({
      chat: chatRef,
      url: z.url().optional(),
      base64: z.string().optional(),
      fileName: z.string().min(1).max(255).optional().describe("Required with base64, e.g. report.pdf"),
      caption: z.string().max(1024).optional(),
      parseMode,
      asDocument: z.boolean().default(false).describe("Send images and videos as files without compression"),
      voiceNote: z.boolean().default(false).describe("Send audio as a voice message (base64 only)"),
      replyTo: messageId.optional(),
      silent: z.boolean().default(false),
    }),
    annotations: WRITE,
    run: async (client, input) => {
      if (Boolean(input.url) === Boolean(input.base64)) throw new ToolError("Provide exactly one of url or base64");

      let file: string | CustomFile;
      if (input.url) {
        file = input.url;
      } else {
        if (!input.fileName) throw new ToolError("fileName is required with base64");
        const buffer = decodeBase64(input.base64 ?? "");
        file = new CustomFile(input.fileName, buffer.length, "", buffer);
      }

      const message = await client.sendFile(await resolvePeer(client, input.chat), {
        file,
        caption: input.caption,
        parseMode: toParseMode(input.parseMode),
        forceDocument: input.asDocument,
        voiceNote: input.voiceNote,
        replyTo: input.replyTo,
        silent: input.silent,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "download_media", {
    title: "Download media",
    description: "Download the photo or file attached to a message (up to 3 MB). Images are returned so they can be viewed.",
    input: z.object({ chat: chatRef, messageId }),
    annotations: READ_ONLY,
    run: async (client, { chat, messageId: id }): Promise<CallToolResult> => {
      const peer = await resolvePeer(client, chat);
      const message = await getMessageById(client, peer, id);
      if (!message.media) throw new ToolError(`Message ${id} has no media`);

      const document = documentInfo(message.media);
      if (document && document.size > MAX_DOWNLOAD_BYTES) {
        throw new ToolError(`File is ${document.size} bytes, larger than the 3 MB download limit`);
      }

      const downloaded = await client.downloadMedia(message, {});
      if (!Buffer.isBuffer(downloaded)) throw new ToolError("This media type cannot be downloaded");
      if (downloaded.length > MAX_DOWNLOAD_BYTES) throw new ToolError("File is larger than the 3 MB download limit");

      const mimeType = document?.mimeType ?? "image/jpeg";
      const data = downloaded.toString("base64");
      const meta = { type: "text" as const, text: JSON.stringify({ messageId: id, mimeType, size: downloaded.length, fileName: document?.fileName ?? null }) };

      if (mimeType.startsWith("image/")) {
        return { content: [{ type: "image", data, mimeType }, meta] };
      }

      return {
        content: [
          {
            type: "resource",
            resource: { uri: `telegram://chat/${getPeerId(peer)}/message/${id}`, mimeType, blob: data },
          },
          meta,
        ],
      };
    },
  });

  defineTool(server, "send_location", {
    title: "Send location",
    description: "Send a map location.",
    input: z.object({
      chat: chatRef,
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      replyTo: messageId.optional(),
      silent: z.boolean().default(false),
    }),
    annotations: WRITE,
    run: async (client, { chat, latitude, longitude, replyTo, silent }) => {
      const message = await client.sendFile(await resolvePeer(client, chat), {
        file: new Api.InputMediaGeoPoint({ geoPoint: new Api.InputGeoPoint({ lat: latitude, long: longitude }) }),
        replyTo,
        silent,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "send_contact", {
    title: "Send contact",
    description: "Share a phone contact card in a chat.",
    input: z.object({
      chat: chatRef,
      phone: z.string().min(3).max(32),
      firstName: z.string().min(1).max(64),
      lastName: z.string().max(64).default(""),
      replyTo: messageId.optional(),
    }),
    annotations: WRITE,
    run: async (client, { chat, phone, firstName, lastName, replyTo }) => {
      const message = await client.sendFile(await resolvePeer(client, chat), {
        file: new Api.InputMediaContact({ phoneNumber: phone, firstName, lastName, vcard: "" }),
        replyTo,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "send_dice", {
    title: "Send dice",
    description: "Send an animated dice, darts, basketball, football, bowling or slot machine with a random result.",
    input: z.object({
      chat: chatRef,
      kind: z.enum(diceKinds).default("dice"),
      replyTo: messageId.optional(),
    }),
    annotations: WRITE,
    run: async (client, { chat, kind, replyTo }) => {
      const message = await client.sendFile(await resolvePeer(client, chat), {
        file: new Api.InputMediaDice({ emoticon: DICE[kind] }),
        replyTo,
      });
      return mapMessage(message);
    },
  });
}

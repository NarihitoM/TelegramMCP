import type { McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { CustomFile } from "../../../shared/lib/gramjs.ts";
import { fetchPublic } from "../../../shared/lib/remoteFetch.ts";
import { defineTool, DESTRUCTIVE, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { ToolError } from "../services/errors.ts";
import { mapEntity } from "../services/mappers.ts";
import { resolveGroup, resolvePeer, resolvePeers } from "../services/peers.ts";
import { chatRef, userRef } from "../services/schemas.ts";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const adminRights = z
  .object({
    changeInfo: z.boolean().default(true),
    deleteMessages: z.boolean().default(true),
    banUsers: z.boolean().default(true),
    inviteUsers: z.boolean().default(true),
    pinMessages: z.boolean().default(true),
    manageCall: z.boolean().default(false),
    postMessages: z.boolean().default(false).describe("Channels only"),
    editMessages: z.boolean().default(false).describe("Channels only"),
    addAdmins: z.boolean().default(false),
    anonymous: z.boolean().default(false),
  })
  .default({
    changeInfo: true,
    deleteMessages: true,
    banUsers: true,
    inviteUsers: true,
    pinMessages: true,
    manageCall: false,
    postMessages: false,
    editMessages: false,
    addAdmins: false,
    anonymous: false,
  });

async function loadPhoto(url: string | undefined, base64: string | undefined): Promise<Buffer> {
  if (Boolean(url) === Boolean(base64)) throw new ToolError("Provide exactly one of url or base64");
  if (url) return (await fetchPublic(url, { maxBytes: MAX_PHOTO_BYTES })).buffer;

  const buffer = Buffer.from((base64 ?? "").replace(/^data:[^;]+;base64,/, ""), "base64");
  if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) throw new ToolError("Photo must be between 1 byte and 5 MB");
  return buffer;
}

export function registerAdminTools(server: McpServer): void {
  defineTool(server, "get_participants", {
    title: "Get members",
    description: "List members of a group or channel. Channel member lists are only visible to admins.",
    input: z.object({
      chat: chatRef,
      limit: z.number().int().min(1).max(200).default(50),
      search: z.string().optional(),
      adminsOnly: z.boolean().default(false),
    }),
    annotations: READ_ONLY,
    run: async (client, { chat, limit, search, adminsOnly }) => {
      const participants = await client.getParticipants(await resolvePeer(client, chat), {
        limit,
        search,
        filter: adminsOnly ? new Api.ChannelParticipantsAdmins() : undefined,
      });
      return participants.map(mapEntity);
    },
  });

  defineTool(server, "add_members", {
    title: "Add members",
    description: "Add users to a group or channel you administer.",
    input: z.object({ chat: chatRef, users: z.array(userRef).min(1).max(100) }),
    annotations: WRITE,
    run: async (client, { chat, users }) => {
      const group = await resolveGroup(client, chat);
      const peers = await resolvePeers(client, users);

      if (group instanceof Api.Channel) {
        await client.invoke(new Api.channels.InviteToChannel({ channel: group, users: peers }));
      } else {
        for (const userId of peers) {
          await client.invoke(new Api.messages.AddChatUser({ chatId: group.id, userId, fwdLimit: 50 }));
        }
      }
      return { chat: mapEntity(group), added: users };
    },
  });

  defineTool(server, "remove_member", {
    title: "Remove member",
    description: "Remove a user from a group or channel. With ban=true they cannot rejoin.",
    input: z.object({ chat: chatRef, user: userRef, ban: z.boolean().default(false) }),
    annotations: DESTRUCTIVE,
    run: async (client, { chat, user, ban }) => {
      const group = await resolveGroup(client, chat);
      const participant = await resolvePeer(client, user);

      if (group instanceof Api.Channel) {
        await client.invoke(
          new Api.channels.EditBanned({
            channel: group,
            participant,
            bannedRights: new Api.ChatBannedRights({ untilDate: 0, viewMessages: true }),
          }),
        );
        if (!ban) {
          await client.invoke(
            new Api.channels.EditBanned({ channel: group, participant, bannedRights: new Api.ChatBannedRights({ untilDate: 0 }) }),
          );
        }
      } else {
        await client.invoke(new Api.messages.DeleteChatUser({ chatId: group.id, userId: participant }));
      }
      return { chat: mapEntity(group), removed: user, banned: ban };
    },
  });

  defineTool(server, "promote_admin", {
    title: "Promote admin",
    description: "Make a member an admin with the given rights and an optional custom title.",
    input: z.object({
      chat: chatRef,
      user: userRef,
      title: z.string().max(16).optional().describe("Custom admin title shown in the group"),
      rights: adminRights,
    }),
    annotations: WRITE,
    run: async (client, { chat, user, title, rights }) => {
      const group = await resolveGroup(client, chat);
      const userId = await resolvePeer(client, user);

      if (group instanceof Api.Channel) {
        await client.invoke(
          new Api.channels.EditAdmin({ channel: group, userId, adminRights: new Api.ChatAdminRights(rights), rank: title ?? "" }),
        );
      } else {
        await client.invoke(new Api.messages.EditChatAdmin({ chatId: group.id, userId, isAdmin: true }));
      }
      return { chat: mapEntity(group), promoted: user };
    },
  });

  defineTool(server, "demote_admin", {
    title: "Demote admin",
    description: "Remove admin rights from a member.",
    input: z.object({ chat: chatRef, user: userRef }),
    annotations: DESTRUCTIVE,
    run: async (client, { chat, user }) => {
      const group = await resolveGroup(client, chat);
      const userId = await resolvePeer(client, user);

      if (group instanceof Api.Channel) {
        await client.invoke(
          new Api.channels.EditAdmin({ channel: group, userId, adminRights: new Api.ChatAdminRights({}), rank: "" }),
        );
      } else {
        await client.invoke(new Api.messages.EditChatAdmin({ chatId: group.id, userId, isAdmin: false }));
      }
      return { chat: mapEntity(group), demoted: user };
    },
  });

  defineTool(server, "set_chat_title", {
    title: "Rename chat",
    description: "Change the title of a group or channel.",
    input: z.object({ chat: chatRef, title: z.string().min(1).max(128) }),
    annotations: WRITE,
    run: async (client, { chat, title }) => {
      const group = await resolveGroup(client, chat);
      if (group instanceof Api.Channel) {
        await client.invoke(new Api.channels.EditTitle({ channel: group, title }));
      } else {
        await client.invoke(new Api.messages.EditChatTitle({ chatId: group.id, title }));
      }
      return { chat: group.id.toString(), title };
    },
  });

  defineTool(server, "set_chat_description", {
    title: "Set chat description",
    description: "Change the description (about text) of a group or channel.",
    input: z.object({ chat: chatRef, description: z.string().max(255) }),
    annotations: WRITE,
    run: async (client, { chat, description }) => {
      await client.invoke(new Api.messages.EditChatAbout({ peer: await resolvePeer(client, chat), about: description }));
      return { chat, description };
    },
  });

  defineTool(server, "set_chat_photo", {
    title: "Set chat photo",
    description: "Change the photo of a group or channel from a public image url or base64 data (up to 5 MB).",
    input: z.object({
      chat: chatRef,
      url: z.url({ protocol: /^https?$/ }).optional(),
      base64: z.string().optional(),
    }),
    annotations: WRITE,
    run: async (client, { chat, url, base64 }) => {
      const group = await resolveGroup(client, chat);
      const buffer = await loadPhoto(url, base64);
      const file = await client.uploadFile({ file: new CustomFile("photo.jpg", buffer.length, "", buffer), workers: 1 });
      const photo = new Api.InputChatUploadedPhoto({ file });

      if (group instanceof Api.Channel) {
        await client.invoke(new Api.channels.EditPhoto({ channel: group, photo }));
      } else {
        await client.invoke(new Api.messages.EditChatPhoto({ chatId: group.id, photo }));
      }
      return { chat: mapEntity(group), photoUpdated: true };
    },
  });
}

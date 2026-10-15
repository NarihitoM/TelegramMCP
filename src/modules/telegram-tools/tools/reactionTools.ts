import type { McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { getDisplayName, getPeerId } from "../../../shared/lib/gramjs.ts";
import { defineTool, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { mapReaction, mapReactions } from "../services/mappers.ts";
import { getMessageById } from "../services/messages.ts";
import { resolvePeer } from "../services/peers.ts";
import { chatRef, messageId } from "../services/schemas.ts";

export function registerReactionTools(server: McpServer): void {
  defineTool(server, "send_reaction", {
    title: "React to message",
    description: "Add an emoji reaction to a message. The emoji must be one the chat allows.",
    input: z.object({
      chat: chatRef,
      messageId,
      emoji: z.string().min(1).max(16).describe("A single emoji, for example a thumbs up or heart"),
      big: z.boolean().default(false).describe("Play the large reaction animation"),
    }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id, emoji, big }) => {
      await client.invoke(
        new Api.messages.SendReaction({
          peer: await resolvePeer(client, chat),
          msgId: id,
          reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
          big,
          addToRecent: true,
        }),
      );
      return { chat, messageId: id, reaction: emoji };
    },
  });

  defineTool(server, "remove_reaction", {
    title: "Remove my reaction",
    description: "Remove your reaction from a message.",
    input: z.object({ chat: chatRef, messageId }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id }) => {
      await client.invoke(new Api.messages.SendReaction({ peer: await resolvePeer(client, chat), msgId: id, reaction: [] }));
      return { chat, messageId: id, removed: true };
    },
  });

  defineTool(server, "get_message_reactions", {
    title: "Get message reactions",
    description: "Show reaction counts on a message and, where Telegram allows it, who reacted.",
    input: z.object({
      chat: chatRef,
      messageId,
      limit: z.number().int().min(1).max(100).default(50),
    }),
    annotations: READ_ONLY,
    run: async (client, { chat, messageId: id, limit }) => {
      const peer = await resolvePeer(client, chat);
      const message = await getMessageById(client, peer, id);
      const summary = mapReactions(message.reactions);

      try {
        const list = await client.invoke(new Api.messages.GetMessageReactionsList({ peer, id, limit }));
        const names = new Map([...list.users, ...list.chats].map((entity) => [getPeerId(entity), getDisplayName(entity)]));
        const reactors = list.reactions.map((reaction) => {
          const reactorId = getPeerId(reaction.peerId);
          return {
            id: reactorId,
            name: names.get(reactorId) ?? null,
            reaction: mapReaction(reaction.reaction),
            date: new Date(reaction.date * 1000).toISOString(),
          };
        });
        return { summary, reactors };
      } catch {
        return { summary, reactors: null, note: "Telegram does not reveal who reacted in this chat." };
      }
    },
  });
}

import type { McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { defineTool, DESTRUCTIVE, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { mapDialog, mapMessage } from "../services/mappers.ts";
import { normalizeChatRef, resolvePeer } from "../services/peers.ts";
import { chatRef, isoDateTime, messageId, messageText, parseMode, toParseMode, toUnixSeconds, userRef } from "../services/schemas.ts";

const SEARCH_FILTERS = {
  photos: () => new Api.InputMessagesFilterPhotos(),
  videos: () => new Api.InputMessagesFilterVideo(),
  photosAndVideos: () => new Api.InputMessagesFilterPhotoVideo(),
  documents: () => new Api.InputMessagesFilterDocument(),
  links: () => new Api.InputMessagesFilterUrl(),
  voice: () => new Api.InputMessagesFilterVoice(),
  music: () => new Api.InputMessagesFilterMusic(),
  gifs: () => new Api.InputMessagesFilterGif(),
  pinned: () => new Api.InputMessagesFilterPinned(),
  mentions: () => new Api.InputMessagesFilterMyMentions(),
};

type SearchFilter = keyof typeof SEARCH_FILTERS;

const searchFilterNames = Object.keys(SEARCH_FILTERS) as [SearchFilter, ...SearchFilter[]];

export function registerMessageTools(server: McpServer): void {
  defineTool(server, "get_messages", {
    title: "Get messages",
    description: "Read recent messages from a chat, newest first. Use offsetId to page back through history.",
    input: z.object({
      chat: chatRef,
      limit: z.number().int().min(1).max(100).default(20),
      offsetId: z.number().int().positive().optional().describe("Return messages older than this message id"),
      fromUser: userRef.optional().describe("Only messages sent by this user"),
    }),
    annotations: READ_ONLY,
    run: async (client, { chat, limit, offsetId, fromUser }) => {
      const peer = await resolvePeer(client, chat);
      const messages = await client.getMessages(peer, {
        limit,
        offsetId,
        fromUser: fromUser ? normalizeChatRef(fromUser) : undefined,
      });
      return messages.map(mapMessage);
    },
  });

  defineTool(server, "get_unread", {
    title: "Get unread messages",
    description: "Collect unread messages across chats. Use this to check what is new, since push updates are not available.",
    input: z.object({
      maxChats: z.number().int().min(1).max(50).default(10),
      messagesPerChat: z.number().int().min(1).max(50).default(10),
    }),
    annotations: READ_ONLY,
    run: async (client, { maxChats, messagesPerChat }) => {
      const dialogs = await client.getDialogs({ limit: 100 });
      const unread = dialogs.filter((dialog) => dialog.unreadCount > 0).slice(0, maxChats);

      const result = [];
      for (const dialog of unread) {
        const messages = await client.getMessages(dialog.inputEntity, {
          limit: Math.min(dialog.unreadCount, messagesPerChat),
        });
        result.push({ chat: mapDialog(dialog), messages: messages.map(mapMessage) });
      }
      return result;
    },
  });

  defineTool(server, "search_messages", {
    title: "Search messages",
    description: "Search messages by text inside one chat, or across all chats when chat is omitted.",
    input: z.object({
      query: z.string().default(""),
      chat: chatRef.optional(),
      filter: z.enum(searchFilterNames).optional().describe("Only messages of this kind"),
      before: isoDateTime.optional().describe("Only messages sent before this time"),
      fromUser: userRef.optional().describe("Only messages from this user (requires chat)"),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    annotations: READ_ONLY,
    run: async (client, { query, chat, filter, before, fromUser, limit }) => {
      const peer = chat ? await resolvePeer(client, chat) : undefined;
      const messages = await client.getMessages(peer, {
        search: query,
        limit,
        filter: filter ? SEARCH_FILTERS[filter]() : undefined,
        offsetDate: before ? toUnixSeconds(before) : undefined,
        fromUser: peer && fromUser ? normalizeChatRef(fromUser) : undefined,
      });
      return messages.map(mapMessage);
    },
  });

  defineTool(server, "send_message", {
    title: "Send message",
    description: "Send a text message. Supports markdown or HTML formatting, replies, silent sending and scheduling.",
    input: z.object({
      chat: chatRef,
      text: messageText,
      parseMode,
      replyTo: messageId.optional().describe("Reply to this message id"),
      silent: z.boolean().default(false).describe("Send without notification sound"),
      scheduleAt: isoDateTime.optional().describe("Schedule the message for this time"),
      linkPreview: z.boolean().default(true),
    }),
    annotations: WRITE,
    run: async (client, { chat, text, parseMode: mode, replyTo, silent, scheduleAt, linkPreview }) => {
      const message = await client.sendMessage(await resolvePeer(client, chat), {
        message: text,
        parseMode: toParseMode(mode),
        replyTo,
        silent,
        linkPreview,
        schedule: scheduleAt ? toUnixSeconds(scheduleAt) : undefined,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "reply_to_message", {
    title: "Reply to message",
    description: "Reply to a specific message in a chat.",
    input: z.object({
      chat: chatRef,
      messageId,
      text: messageText,
      parseMode,
      silent: z.boolean().default(false),
    }),
    annotations: WRITE,
    run: async (client, { chat, messageId: replyTo, text, parseMode: mode, silent }) => {
      const message = await client.sendMessage(await resolvePeer(client, chat), {
        message: text,
        parseMode: toParseMode(mode),
        replyTo,
        silent,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "edit_message", {
    title: "Edit message",
    description: "Edit the text of a message you sent.",
    input: z.object({
      chat: chatRef,
      messageId,
      text: messageText,
      parseMode,
      linkPreview: z.boolean().default(true),
    }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id, text, parseMode: mode, linkPreview }) => {
      const message = await client.editMessage(await resolvePeer(client, chat), {
        message: id,
        text,
        parseMode: toParseMode(mode),
        linkPreview,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "delete_messages", {
    title: "Delete messages",
    description: "Delete messages. By default they are deleted for everyone where Telegram allows it.",
    input: z.object({
      chat: chatRef,
      messageIds: z.array(messageId).min(1).max(100),
      forEveryone: z.boolean().default(true),
    }),
    annotations: DESTRUCTIVE,
    run: async (client, { chat, messageIds, forEveryone }) => {
      await client.deleteMessages(await resolvePeer(client, chat), messageIds, { revoke: forEveryone });
      return { deleted: messageIds, forEveryone };
    },
  });

  defineTool(server, "forward_messages", {
    title: "Forward messages",
    description: "Forward messages from one chat to another.",
    input: z.object({
      fromChat: chatRef,
      messageIds: z.array(messageId).min(1).max(100),
      toChat: chatRef,
      hideSender: z.boolean().default(false).describe("Forward without the original author header"),
      silent: z.boolean().default(false),
    }),
    annotations: WRITE,
    run: async (client, { fromChat, messageIds, toChat, hideSender, silent }) => {
      const forwarded = await client.forwardMessages(await resolvePeer(client, toChat), {
        messages: messageIds,
        fromPeer: await resolvePeer(client, fromChat),
        dropAuthor: hideSender,
        silent,
      });
      return forwarded.map(mapMessage);
    },
  });

  defineTool(server, "pin_message", {
    title: "Pin message",
    description: "Pin a message in a chat.",
    input: z.object({
      chat: chatRef,
      messageId,
      notify: z.boolean().default(false).describe("Notify members about the pinned message"),
      bothSides: z.boolean().default(true).describe("In private chats, pin for both participants"),
    }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id, notify, bothSides }) => {
      await client.pinMessage(await resolvePeer(client, chat), id, { notify, pmOneSide: !bothSides });
      return { chat, pinned: id };
    },
  });

  defineTool(server, "unpin_message", {
    title: "Unpin message",
    description: "Unpin one message, or every pinned message in the chat when messageId is omitted.",
    input: z.object({ chat: chatRef, messageId: messageId.optional() }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id }) => {
      const peer = await resolvePeer(client, chat);
      if (id) {
        await client.unpinMessage(peer, id);
      } else {
        await client.unpinMessage(peer);
      }
      return { chat, unpinned: id ?? "all" };
    },
  });

  defineTool(server, "mark_read", {
    title: "Mark as read",
    description: "Mark messages in a chat as read, up to maxId or everything when omitted.",
    input: z.object({ chat: chatRef, maxId: messageId.optional() }),
    annotations: WRITE,
    run: async (client, { chat, maxId }) => {
      await client.markAsRead(await resolvePeer(client, chat), undefined, { maxId, clearMentions: true });
      return { chat, read: true };
    },
  });

  defineTool(server, "get_replies", {
    title: "Get replies",
    description: "Read the reply thread of a message, or the comments under a channel post.",
    input: z.object({
      chat: chatRef,
      messageId,
      limit: z.number().int().min(1).max(100).default(30),
    }),
    annotations: READ_ONLY,
    run: async (client, { chat, messageId: replyTo, limit }) => {
      const messages = await client.getMessages(await resolvePeer(client, chat), { replyTo, limit });
      return messages.map(mapMessage);
    },
  });

  defineTool(server, "get_scheduled_messages", {
    title: "Get scheduled messages",
    description: "List messages scheduled to be sent later in a chat.",
    input: z.object({ chat: chatRef }),
    annotations: READ_ONLY,
    run: async (client, { chat }) => {
      const messages = await client.getMessages(await resolvePeer(client, chat), { scheduled: true });
      return messages.map(mapMessage);
    },
  });
}

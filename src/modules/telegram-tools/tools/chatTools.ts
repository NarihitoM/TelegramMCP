import type { McpServer } from "@modelcontextprotocol/server";
import { Api, type TelegramClient } from "telegram";
import { z } from "zod";
import { defineTool, DESTRUCTIVE, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { ToolError } from "../services/errors.ts";
import { mapDialog, mapEntity } from "../services/mappers.ts";
import { chatsFromUpdates } from "../services/messages.ts";
import { resolveEntity, resolveGroup, resolvePeer, resolvePeers } from "../services/peers.ts";
import { chatRef, userRef } from "../services/schemas.ts";

const ARCHIVE_FOLDER = 1;
const MAIN_FOLDER = 0;
const MUTE_FOREVER = 2147483647;

const INVITE_PATTERN = /(?:t(?:elegram)?\.me\/(?:\+|joinchat\/)|^\+)([\w-]+)/i;

async function fullInfo(client: TelegramClient, entity: Api.User | Api.Chat | Api.Channel) {
  if (entity instanceof Api.User) {
    const { fullUser } = await client.invoke(new Api.users.GetFullUser({ id: entity }));
    return { about: fullUser.about ?? null, commonChatsCount: fullUser.commonChatsCount, blocked: Boolean(fullUser.blocked) };
  }

  const { fullChat } =
    entity instanceof Api.Channel
      ? await client.invoke(new Api.channels.GetFullChannel({ channel: entity }))
      : await client.invoke(new Api.messages.GetFullChat({ chatId: entity.id }));

  if (fullChat instanceof Api.ChannelFull) {
    return {
      about: fullChat.about,
      participantsCount: fullChat.participantsCount ?? null,
      adminsCount: fullChat.adminsCount ?? null,
      onlineCount: fullChat.onlineCount ?? null,
      linkedChatId: fullChat.linkedChatId?.toString() ?? null,
    };
  }

  return { about: fullChat.about, participantsCount: entity instanceof Api.Chat ? entity.participantsCount : null };
}

export function registerChatTools(server: McpServer): void {
  defineTool(server, "list_dialogs", {
    title: "List chats",
    description: "List chats, groups and channels ordered by most recent activity, with unread counts and the last message.",
    input: z.object({
      limit: z.number().int().min(1).max(200).default(30),
      archived: z.boolean().default(false).describe("List the archive folder instead of the main list"),
      unreadOnly: z.boolean().default(false),
    }),
    annotations: READ_ONLY,
    run: async (client, { limit, archived, unreadOnly }) => {
      const dialogs = await client.getDialogs({ limit, folder: archived ? ARCHIVE_FOLDER : MAIN_FOLDER });
      return dialogs.filter((dialog) => !unreadOnly || dialog.unreadCount > 0).map(mapDialog);
    },
  });

  defineTool(server, "get_chat", {
    title: "Get chat info",
    description: "Get details about a user, group or channel, including its description and member counts.",
    input: z.object({ chat: chatRef }),
    annotations: READ_ONLY,
    run: async (client, { chat }) => {
      const entity = await resolveEntity(client, chat);
      if (!(entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel)) {
        return mapEntity(entity);
      }
      return { ...mapEntity(entity), ...(await fullInfo(client, entity)) };
    },
  });

  defineTool(server, "search_public_chats", {
    title: "Search public chats",
    description: "Search public users, groups and channels on Telegram by name or username.",
    input: z.object({
      query: z.string().min(2),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    annotations: READ_ONLY,
    run: async (client, { query, limit }) => {
      const found = await client.invoke(new Api.contacts.Search({ q: query, limit }));
      return [...found.chats, ...found.users].map(mapEntity);
    },
  });

  defineTool(server, "join_chat", {
    title: "Join chat",
    description: "Join a public group or channel by @username or link, or a private one by invite link (t.me/+hash).",
    input: z.object({ target: z.string().min(1).describe("@username, t.me link, or invite link") }),
    annotations: WRITE,
    run: async (client, { target }) => {
      const invite = target.trim().match(INVITE_PATTERN);
      const updates = invite
        ? await client.invoke(new Api.messages.ImportChatInvite({ hash: invite[1] }))
        : await (async () => {
            const entity = await resolveEntity(client, target);
            if (!(entity instanceof Api.Channel)) throw new ToolError("Only public groups and channels can be joined by username");
            return client.invoke(new Api.channels.JoinChannel({ channel: entity }));
          })();
      return { joined: true, chats: chatsFromUpdates(updates).map(mapEntity) };
    },
  });

  defineTool(server, "leave_chat", {
    title: "Leave chat",
    description: "Leave a group or channel.",
    input: z.object({ chat: chatRef }),
    annotations: DESTRUCTIVE,
    run: async (client, { chat }) => {
      const group = await resolveGroup(client, chat);
      if (group instanceof Api.Channel) {
        await client.invoke(new Api.channels.LeaveChannel({ channel: group }));
      } else {
        await client.invoke(new Api.messages.DeleteChatUser({ chatId: group.id, userId: new Api.InputUserSelf() }));
      }
      return { left: true, chat: mapEntity(group) };
    },
  });

  const createInput = z.object({
    title: z.string().min(1).max(128),
    about: z.string().max(255).optional(),
    members: z.array(userRef).max(200).optional().describe("Users to add right away"),
  });

  defineTool(server, "create_group", {
    title: "Create group",
    description: "Create a new group (supergroup) and optionally add members.",
    input: createInput,
    annotations: WRITE,
    run: async (client, { title, about, members }) => {
      const updates = await client.invoke(new Api.channels.CreateChannel({ title, about: about ?? "", megagroup: true }));
      const [created] = chatsFromUpdates(updates);
      if (!(created instanceof Api.Channel)) throw new ToolError("Telegram did not return the new group");
      if (members?.length) {
        await client.invoke(new Api.channels.InviteToChannel({ channel: created, users: await resolvePeers(client, members) }));
      }
      return mapEntity(created);
    },
  });

  defineTool(server, "create_channel", {
    title: "Create channel",
    description: "Create a new broadcast channel and optionally add subscribers.",
    input: createInput,
    annotations: WRITE,
    run: async (client, { title, about, members }) => {
      const updates = await client.invoke(new Api.channels.CreateChannel({ title, about: about ?? "", broadcast: true }));
      const [created] = chatsFromUpdates(updates);
      if (!(created instanceof Api.Channel)) throw new ToolError("Telegram did not return the new channel");
      if (members?.length) {
        await client.invoke(new Api.channels.InviteToChannel({ channel: created, users: await resolvePeers(client, members) }));
      }
      return mapEntity(created);
    },
  });

  defineTool(server, "archive_chat", {
    title: "Archive chat",
    description: "Move a chat to the archive folder, or back to the main list.",
    input: z.object({ chat: chatRef, archived: z.boolean().default(true) }),
    annotations: WRITE,
    run: async (client, { chat, archived }) => {
      const peer = await resolvePeer(client, chat);
      await client.invoke(
        new Api.folders.EditPeerFolders({
          folderPeers: [new Api.InputFolderPeer({ peer, folderId: archived ? ARCHIVE_FOLDER : MAIN_FOLDER })],
        }),
      );
      return { chat, archived };
    },
  });

  defineTool(server, "mute_chat", {
    title: "Mute chat",
    description: "Mute or unmute notifications for a chat, forever or for a number of seconds.",
    input: z.object({
      chat: chatRef,
      muted: z.boolean().default(true),
      durationSeconds: z.number().int().positive().optional().describe("Mute for this long; omit to mute forever"),
    }),
    annotations: WRITE,
    run: async (client, { chat, muted, durationSeconds }) => {
      const peer = await resolvePeer(client, chat);
      const muteUntil = !muted ? 0 : durationSeconds ? Math.floor(Date.now() / 1000) + durationSeconds : MUTE_FOREVER;
      await client.invoke(
        new Api.account.UpdateNotifySettings({
          peer: new Api.InputNotifyPeer({ peer }),
          settings: new Api.InputPeerNotifySettings({ muteUntil }),
        }),
      );
      return { chat, muted, mutedUntil: muted && muteUntil !== MUTE_FOREVER ? new Date(muteUntil * 1000).toISOString() : null };
    },
  });

  defineTool(server, "pin_chat", {
    title: "Pin chat",
    description: "Pin or unpin a chat at the top of the chat list.",
    input: z.object({ chat: chatRef, pinned: z.boolean().default(true) }),
    annotations: WRITE,
    run: async (client, { chat, pinned }) => {
      const peer = await resolvePeer(client, chat);
      await client.invoke(new Api.messages.ToggleDialogPin({ peer: new Api.InputDialogPeer({ peer }), pinned }));
      return { chat, pinned };
    },
  });

  defineTool(server, "export_invite_link", {
    title: "Create invite link",
    description: "Create an invite link for a group or channel you administer.",
    input: z.object({
      chat: chatRef,
      title: z.string().max(32).optional(),
      expireInSeconds: z.number().int().positive().optional(),
      usageLimit: z.number().int().min(1).max(99999).optional(),
      requestApproval: z.boolean().default(false).describe("Require admin approval to join"),
    }),
    annotations: WRITE,
    run: async (client, { chat, title, expireInSeconds, usageLimit, requestApproval }) => {
      const invite = await client.invoke(
        new Api.messages.ExportChatInvite({
          peer: await resolvePeer(client, chat),
          title,
          usageLimit: requestApproval ? undefined : usageLimit,
          requestNeeded: requestApproval,
          expireDate: expireInSeconds ? Math.floor(Date.now() / 1000) + expireInSeconds : undefined,
        }),
      );
      if (!(invite instanceof Api.ChatInviteExported)) throw new ToolError("Telegram did not return an invite link");
      return { link: invite.link, expiresAt: invite.expireDate ? new Date(invite.expireDate * 1000).toISOString() : null };
    },
  });

}

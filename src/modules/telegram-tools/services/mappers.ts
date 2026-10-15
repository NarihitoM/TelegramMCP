import { Api } from "telegram";
import type { Entity } from "telegram/define.js";
import type { Dialog } from "telegram/tl/custom/dialog.js";
import { getDisplayName, getPeerId } from "../../../shared/lib/gramjs.ts";

const PREVIEW_LENGTH = 200;

function isoDate(seconds: number | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function optionKey(option: Buffer): string {
  return Buffer.from(option).toString("hex");
}

export function mapEntity(entity: Entity) {
  const id = getPeerId(entity);

  if (entity instanceof Api.User) {
    return {
      type: entity.bot ? "bot" : "user",
      id,
      name: getDisplayName(entity),
      username: entity.username ?? null,
      phone: entity.phone ?? null,
      isSelf: Boolean(entity.self),
      isContact: Boolean(entity.contact),
      verified: Boolean(entity.verified),
      premium: Boolean(entity.premium),
    };
  }

  if (entity instanceof Api.Chat) {
    return { type: "group", id, title: entity.title, participantsCount: entity.participantsCount };
  }

  if (entity instanceof Api.Channel) {
    return {
      type: entity.megagroup ? "supergroup" : "channel",
      id,
      title: entity.title,
      username: entity.username ?? null,
      participantsCount: entity.participantsCount ?? null,
      isCreator: Boolean(entity.creator),
      isAdmin: Boolean(entity.adminRights),
    };
  }

  return { type: "unavailable", id };
}

export function mapReaction(reaction: Api.TypeReaction): string {
  if (reaction instanceof Api.ReactionEmoji) return reaction.emoticon;
  if (reaction instanceof Api.ReactionCustomEmoji) return `custom:${reaction.documentId.toString()}`;
  return reaction.className;
}

export function mapReactions(reactions: Api.TypeMessageReactions | undefined) {
  if (!(reactions instanceof Api.MessageReactions)) return [];
  return reactions.results.map((result) => ({
    reaction: mapReaction(result.reaction),
    count: result.count,
    chosenByMe: result.chosenOrder !== undefined,
  }));
}

export function mapPoll(media: Api.MessageMediaPoll) {
  const { poll, results } = media;
  const votes = new Map((results.results ?? []).map((result) => [optionKey(result.option), result]));

  return {
    pollId: poll.id.toString(),
    question: poll.question.text,
    closed: Boolean(poll.closed),
    quiz: Boolean(poll.quiz),
    multipleChoice: Boolean(poll.multipleChoice),
    anonymous: !poll.publicVoters,
    totalVoters: results.totalVoters ?? 0,
    closeDate: isoDate(poll.closeDate),
    options: poll.answers.map((answer, index) => {
      const result = votes.get(optionKey(answer.option));
      return {
        index,
        text: answer.text.text,
        voters: result?.voters ?? 0,
        chosenByMe: Boolean(result?.chosen),
        correct: result?.correct ?? null,
      };
    }),
    solution: results.solution ?? null,
  };
}

function mapMedia(media: Api.TypeMessageMedia | undefined) {
  if (!media || media instanceof Api.MessageMediaEmpty) return null;
  if (media instanceof Api.MessageMediaPhoto) return { type: "photo" };
  if (media instanceof Api.MessageMediaPoll) return { type: "poll", ...mapPoll(media) };
  if (media instanceof Api.MessageMediaGeo && media.geo instanceof Api.GeoPoint) {
    return { type: "location", latitude: media.geo.lat, longitude: media.geo.long };
  }
  if (media instanceof Api.MessageMediaContact) {
    return { type: "contact", phone: media.phoneNumber, firstName: media.firstName, lastName: media.lastName };
  }
  if (media instanceof Api.MessageMediaDice) return { type: "dice", emoji: media.emoticon, value: media.value };
  if (media instanceof Api.MessageMediaWebPage) return { type: "webpage" };

  if (media instanceof Api.MessageMediaDocument && media.document instanceof Api.Document) {
    const { document } = media;
    const fileName = document.attributes.find(
      (attribute): attribute is Api.DocumentAttributeFilename => attribute instanceof Api.DocumentAttributeFilename,
    );
    const isVoice = document.attributes.some(
      (attribute) => attribute instanceof Api.DocumentAttributeAudio && Boolean(attribute.voice),
    );
    return {
      type: isVoice ? "voice" : "document",
      fileName: fileName?.fileName ?? null,
      mimeType: document.mimeType,
      size: Number(document.size.toString()),
    };
  }

  return { type: media.className };
}

export function mapMessage(message: Api.Message) {
  return {
    id: message.id,
    chatId: getPeerId(message.peerId),
    senderId: message.senderId?.toString() ?? null,
    sender: message.sender ? getDisplayName(message.sender) : null,
    date: isoDate(message.date),
    editedAt: isoDate(message.editDate),
    out: Boolean(message.out),
    pinned: Boolean(message.pinned),
    text: message.message,
    replyToId: message.replyTo instanceof Api.MessageReplyHeader ? (message.replyTo.replyToMsgId ?? null) : null,
    views: message.views ?? null,
    forwards: message.forwards ?? null,
    media: mapMedia(message.media),
    reactions: mapReactions(message.reactions),
  };
}

export function mapDialog(dialog: Dialog) {
  const lastMessage = dialog.message;

  return {
    id: dialog.entity ? getPeerId(dialog.entity) : (dialog.id?.toString() ?? null),
    title: dialog.title ?? dialog.name ?? null,
    type: dialog.isUser ? "user" : dialog.isChannel && !dialog.isGroup ? "channel" : "group",
    username: dialog.entity && "username" in dialog.entity ? (dialog.entity.username ?? null) : null,
    unreadCount: dialog.unreadCount,
    unreadMentions: dialog.unreadMentionsCount,
    pinned: dialog.pinned,
    archived: dialog.archived,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          date: isoDate(lastMessage.date),
          out: Boolean(lastMessage.out),
          text: lastMessage.message?.slice(0, PREVIEW_LENGTH) ?? "",
        }
      : null,
  };
}

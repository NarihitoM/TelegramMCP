import { Api, type TelegramClient } from "telegram";
import { ToolError } from "./errors.ts";

export async function getMessageById(client: TelegramClient, peer: Api.TypeInputPeer, id: number): Promise<Api.Message> {
  const [message] = await client.getMessages(peer, { ids: id });
  if (!(message instanceof Api.Message)) throw new ToolError(`Message ${id} not found`);
  return message;
}

export async function getPollMessage(
  client: TelegramClient,
  peer: Api.TypeInputPeer,
  id: number,
): Promise<{ message: Api.Message; media: Api.MessageMediaPoll }> {
  const message = await getMessageById(client, peer, id);
  if (!(message.media instanceof Api.MessageMediaPoll)) throw new ToolError(`Message ${id} is not a poll`);
  return { message, media: message.media };
}

export function chatsFromUpdates(updates: Api.TypeUpdates): Api.TypeChat[] {
  return updates instanceof Api.Updates || updates instanceof Api.UpdatesCombined ? updates.chats : [];
}

import { Api, type TelegramClient } from "telegram";
import type { Entity, EntityLike } from "telegram/define.js";
import { returnBigInt } from "../../../shared/lib/gramjs.ts";
import { ToolError } from "./errors.ts";

const DIALOG_WARMUP_LIMIT = 200;

export function normalizeChatRef(ref: string): EntityLike {
  const value = ref.trim();
  if (/^(me|self)$/i.test(value)) return "me";

  const link = value.match(/^(?:https?:\/\/)?(?:t|telegram)\.me\/(.+)$/i);
  if (link) {
    const [first, second] = link[1].split(/[/?#]/);
    if (first === "c" && second && /^\d+$/.test(second)) return returnBigInt(`-100${second}`);
    return first.replace(/^@/, "");
  }

  if (/^-?\d+$/.test(value)) return returnBigInt(value);
  return value.replace(/^@/, "");
}

async function withDialogWarmup<T>(client: TelegramClient, target: EntityLike, resolve: () => Promise<T>): Promise<T> {
  try {
    return await resolve();
  } catch (error) {
    if (typeof target === "string") throw error;
    await client.getDialogs({ limit: DIALOG_WARMUP_LIMIT });
    return resolve();
  }
}

export async function resolvePeer(client: TelegramClient, ref: string): Promise<Api.TypeInputPeer> {
  const target = normalizeChatRef(ref);
  return withDialogWarmup(client, target, () => client.getInputEntity(target));
}

export async function resolvePeers(client: TelegramClient, refs: string[]): Promise<Api.TypeInputPeer[]> {
  const peers: Api.TypeInputPeer[] = [];
  for (const ref of refs) peers.push(await resolvePeer(client, ref));
  return peers;
}

export async function resolveEntity(client: TelegramClient, ref: string): Promise<Entity> {
  const target = normalizeChatRef(ref);
  return withDialogWarmup(client, target, () => client.getEntity(target));
}

export async function resolveUser(client: TelegramClient, ref: string): Promise<Api.User> {
  const entity = await resolveEntity(client, ref);
  if (!(entity instanceof Api.User)) throw new ToolError(`${ref} is not a user`);
  return entity;
}

export async function resolveGroup(client: TelegramClient, ref: string): Promise<Api.Channel | Api.Chat> {
  const entity = await resolveEntity(client, ref);
  if (entity instanceof Api.Channel || entity instanceof Api.Chat) return entity;
  throw new ToolError(`${ref} is not a group or channel`);
}

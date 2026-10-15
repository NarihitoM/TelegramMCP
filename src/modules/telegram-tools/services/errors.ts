import { FloodWaitError } from "../../../shared/lib/gramjs.ts";
import { RemoteFetchError } from "../../../shared/lib/remoteFetch.ts";
import { rpcErrorMessage } from "../../../shared/lib/telegramClient.ts";

export class ToolError extends Error {}

const REVOKED_SESSION_ERRORS = new Set([
  "AUTH_KEY_UNREGISTERED",
  "AUTH_KEY_INVALID",
  "SESSION_REVOKED",
  "SESSION_EXPIRED",
  "USER_DEACTIVATED",
  "USER_DEACTIVATED_BAN",
]);

export function describeError(error: unknown): string {
  if (error instanceof ToolError || error instanceof RemoteFetchError) return error.message;

  if (error instanceof FloodWaitError) {
    return `Telegram rate limit reached. Retry in ${error.seconds} seconds.`;
  }

  const rpc = rpcErrorMessage(error);
  if (rpc && REVOKED_SESSION_ERRORS.has(rpc)) {
    return "The Telegram session was revoked or expired. Reconnect the Telegram connector to log in again.";
  }
  if (rpc) return `Telegram error: ${rpc}`;

  if (error instanceof Error && /Could not find the input entity|Cannot find any entity/i.test(error.message)) {
    return "Chat or user not found. Use a @username, a t.me link, or an id returned by list_dialogs.";
  }

  console.error("Telegram tool failed:", error instanceof Error ? error.message : String(error));
  return "Unexpected error while talking to Telegram.";
}

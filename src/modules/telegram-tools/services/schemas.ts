import { z } from "zod";

export const chatRef = z
  .string()
  .min(1)
  .describe("Chat reference: @username, numeric id from list_dialogs, 'me' for Saved Messages, or a t.me link");

export const userRef = z
  .string()
  .min(1)
  .describe("User reference: @username, numeric user id, or a t.me link");

export const messageId = z.number().int().positive().describe("Message id within the chat");

export const parseMode = z
  .enum(["markdown", "html", "none"])
  .default("markdown")
  .describe("How to format the text");

export const isoDateTime = z.iso.datetime({ offset: true }).describe("ISO 8601 date-time, e.g. 2026-10-15T18:30:00Z");

export function toParseMode(mode: z.infer<typeof parseMode>): "md" | "html" | false {
  if (mode === "markdown") return "md";
  if (mode === "html") return "html";
  return false;
}

export function toUnixSeconds(value: string): number {
  return Math.floor(Date.parse(value) / 1000);
}

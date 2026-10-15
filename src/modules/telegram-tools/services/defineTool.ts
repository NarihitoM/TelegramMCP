import {
  isCallToolResult,
  type CallToolResult,
  type McpServer,
  type ServerContext,
  type StandardSchemaWithJSON,
  type ToolAnnotations,
  type ToolCallback,
} from "@modelcontextprotocol/server";
import type { TelegramClient } from "telegram";
import type { z } from "zod";
import { withTelegramClient } from "../../../shared/lib/telegramClient.ts";
import { describeError } from "./errors.ts";

interface ToolDefinition<S extends z.ZodObject> {
  title: string;
  description: string;
  input: S;
  annotations?: ToolAnnotations;
  run: (client: TelegramClient, args: StandardSchemaWithJSON.InferOutput<S>) => Promise<unknown>;
}

function textResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function sessionFrom(ctx: ServerContext): string | undefined {
  const session = ctx.http?.authInfo?.extra?.session;
  return typeof session === "string" ? session : undefined;
}

export function defineTool<S extends z.ZodObject>(server: McpServer, name: string, definition: ToolDefinition<S>): void {
  const { title, description, input, annotations, run } = definition;

  const handler = async (args: StandardSchemaWithJSON.InferOutput<S>, ctx: ServerContext): Promise<CallToolResult> => {
    const session = sessionFrom(ctx);
    if (!session) return errorResult("Not authenticated. Reconnect the Telegram connector to log in.");

    try {
      const value = await withTelegramClient(session, (client) => run(client, args));
      return isCallToolResult(value) ? value : textResult(value);
    } catch (error) {
      return errorResult(describeError(error));
    }
  };

  server.registerTool<StandardSchemaWithJSON, S>(
    name,
    {
      title,
      description,
      inputSchema: input,
      annotations: { title, openWorldHint: true, ...annotations },
    },
    handler as unknown as ToolCallback<S>,
  );
}

export const READ_ONLY: ToolAnnotations = { readOnlyHint: true };
export const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false };
export const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true };

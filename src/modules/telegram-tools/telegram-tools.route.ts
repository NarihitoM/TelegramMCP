import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { withCors } from "../../shared/utils/http.ts";
import type { Routes } from "../../shared/utils/routes.ts";
import { MCP_PATH, RESOURCE_METADATA_PATH, verifyAccessToken } from "../oauth/index.ts";
import { registerTelegramTools } from "./telegram-tools.ts";

const mcpHandler = createMcpHandler(registerTelegramTools, {
  serverInfo: { name: "telegram-mcp", version: "0.1.0" },
  instructions:
    "Tools for the user's own Telegram account. Chats accept @username, numeric ids from list_dialogs, 'me' for Saved Messages, or t.me links. There are no push updates, so call get_unread to check for new messages.",
});

const handler = withCors(
  withMcpAuth(mcpHandler, (_req, token) => verifyAccessToken(token), {
    required: true,
    resourceMetadataPath: RESOURCE_METADATA_PATH,
  }),
);

export const mcpRoutes: Routes = {
  [MCP_PATH]: { GET: handler, POST: handler, DELETE: handler },
};

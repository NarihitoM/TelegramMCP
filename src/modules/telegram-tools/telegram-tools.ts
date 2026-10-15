import type { McpServer } from "@modelcontextprotocol/server";
import { registerAccountTools } from "./tools/accountTools.ts";
import { registerAdminTools } from "./tools/adminTools.ts";
import { registerChatTools } from "./tools/chatTools.ts";
import { registerContactTools } from "./tools/contactTools.ts";
import { registerMediaTools } from "./tools/mediaTools.ts";
import { registerMessageTools } from "./tools/messageTools.ts";
import { registerPollTools } from "./tools/pollTools.ts";
import { registerReactionTools } from "./tools/reactionTools.ts";

export function registerTelegramTools(server: McpServer): void {
  registerAccountTools(server);
  registerChatTools(server);
  registerMessageTools(server);
  registerReactionTools(server);
  registerPollTools(server);
  registerMediaTools(server);
  registerContactTools(server);
  registerAdminTools(server);
}

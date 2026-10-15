import { card, escapeHtml, htmlPage } from "../../shared/utils/html.ts";
import { appOrigin } from "../../shared/utils/http.ts";
import { MCP_PATH } from "../oauth/index.ts";

export function handleHome(req: Request): Response {
  const serverUrl = `${appOrigin(req)}${MCP_PATH}`;

  return htmlPage({
    title: "Telegram MCP",
    body: card(
      "Telegram MCP",
      "Use your Telegram account from Claude, Cursor and other MCP clients.",
      `<div class="stack">
  <p class="muted">Add this server URL as a custom connector:</p>
  <code>${escapeHtml(serverUrl)}</code>
  <p class="muted">Your client opens a Telegram QR login automatically. The encrypted session is stored by your client, not on this server.</p>
</div>`,
    ),
  });
}

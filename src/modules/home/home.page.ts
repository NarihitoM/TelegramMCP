import { escapeHtml, htmlPage } from "../../shared/utils/html.ts";
import { AGENT_LOGOS, CLIENT_LOGOS, OPENCODE_LOGO } from "./clientLogos.ts";

const REPOSITORY_URL = "https://github.com/NarihitoM/TelegramMCP";
const AUTHOR_URL = "https://github.com/NarihitoM";

interface GuideStep {
  text: string;
  code?: { file?: string; value: string };
}

interface ClientGuide {
  id: string;
  name: string;
  logo: string;
  summary: string;
  steps: GuideStep[];
}

const PLANE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.6 3.6 3.4 10.3c-.9.4-.9 1.6 0 1.9l4.3 1.5 1.6 5c.3.8 1.3 1 1.9.4l2.4-2.3 4.4 3.2c.7.5 1.7.1 1.9-.7l2.9-14.1c.2-1-.8-1.9-1.8-1.5Z" fill="currentColor"/><path d="m8.2 13.6 9.4-6.9-7.3 8.3" fill="none" stroke="var(--logo-fold)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function icon(path: string, evenOdd = false): string {
  const rule = evenOdd ? ' fill-rule="evenodd" clip-rule="evenodd"' : "";
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="currentColor"${rule}/></svg>`;
}

function guides(serverUrl: string): ClientGuide[] {
  const url = escapeHtml(serverUrl);

  return [
    {
      id: "claude-code",
      name: "Claude Code",
      logo: icon(CLIENT_LOGOS.claude),
      summary: "Add the server from your terminal, then sign in from inside Claude Code.",
      steps: [
        {
          text: "Add the server.",
          code: { value: `claude mcp add --transport http telegram ${serverUrl}` },
        },
        { text: "Start Claude Code, run <kbd>/mcp</kbd>, choose <strong>telegram</strong> and select <strong>Authenticate</strong>." },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      logo: icon(CLIENT_LOGOS.claude),
      summary: "Works in Claude Desktop and on claude.ai with the same steps.",
      steps: [
        { text: "Open <strong>Settings</strong>, then <strong>Connectors</strong>, and select <strong>Add custom connector</strong>." },
        { text: `Name it <strong>Telegram</strong> and paste <code>${url}</code> as the URL.` },
        { text: "Select <strong>Connect</strong> and scan the QR code that opens." },
      ],
    },
    {
      id: "codex",
      name: "Codex",
      logo: icon(AGENT_LOGOS.codex, true),
      summary: "Add the server to the Codex CLI or IDE extension from your terminal.",
      steps: [
        { text: "Add the server.", code: { value: `codex mcp add telegram --url ${serverUrl}` } },
        { text: "Sign in.", code: { value: "codex mcp login telegram" } },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "cursor",
      name: "Cursor",
      logo: icon(CLIENT_LOGOS.cursor),
      summary: "Add the server to your global or project MCP config.",
      steps: [
        {
          text: "Add this to <code>~/.cursor/mcp.json</code>, or to <code>.cursor/mcp.json</code> in a project.",
          code: {
            file: "mcp.json",
            value: `{
  "mcpServers": {
    "telegram": {
      "url": "${serverUrl}"
    }
  }
}`,
          },
        },
        { text: "Open <strong>Settings</strong>, then <strong>MCP</strong>, and select <strong>Login</strong> next to telegram." },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "vscode",
      name: "VS Code",
      logo: icon(CLIENT_LOGOS.copilot),
      summary: "Use the server from GitHub Copilot agent mode.",
      steps: [
        {
          text: "Add this to <code>.vscode/mcp.json</code> in your workspace.",
          code: {
            file: ".vscode/mcp.json",
            value: `{
  "servers": {
    "telegram": {
      "type": "http",
      "url": "${serverUrl}"
    }
  }
}`,
          },
        },
        { text: "Select <strong>Start</strong> above the server entry and allow the sign-in prompt." },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "windsurf",
      name: "Windsurf",
      logo: icon(AGENT_LOGOS.windsurf, true),
      summary: "Add the server to your Windsurf MCP config.",
      steps: [
        {
          text: "In Cascade, select the <strong>MCPs</strong> icon, then <strong>Configure</strong>, and add this to <code>mcp_config.json</code>.",
          code: {
            file: "~/.codeium/windsurf/mcp_config.json",
            value: `{
  "mcpServers": {
    "telegram": {
      "serverUrl": "${serverUrl}"
    }
  }
}`,
          },
        },
        { text: "Save the file and refresh the MCP list. Windsurf opens a sign-in page in your browser." },
        { text: "Scan the QR code on that page." },
      ],
    },
    {
      id: "antigravity",
      name: "Antigravity",
      logo: icon(AGENT_LOGOS.antigravity, true),
      summary: "Add the server to your Antigravity MCP config, then authenticate it from Agent settings.",
      steps: [
        {
          text: "In the agent panel, open the <strong>...</strong> menu, select <strong>MCP Servers</strong>, then <strong>Manage MCP Servers</strong> and <strong>View raw config</strong>. Add this to the file.",
          code: {
            file: "mcp_config.json",
            value: `{
  "mcpServers": {
    "telegram": {
      "serverUrl": "${serverUrl}"
    }
  }
}`,
          },
        },
        { text: "Open Agent settings with <kbd>Ctrl+,</kbd> or <kbd>Cmd+,</kbd> on macOS, go to <strong>Customizations</strong> and select <strong>Authenticate</strong> next to telegram." },
        { text: "Scan the QR code, then paste the code shown in your browser into Antigravity and select <strong>Submit</strong>." },
      ],
    },
    {
      id: "gemini-cli",
      name: "Gemini CLI",
      logo: icon(AGENT_LOGOS.gemini, true),
      summary: "Add the server from your terminal, then sign in from inside Gemini CLI.",
      steps: [
        { text: "Add the server.", code: { value: `gemini mcp add --transport http telegram ${serverUrl}` } },
        { text: "Start Gemini CLI and run <kbd>/mcp auth telegram</kbd>." },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "cline",
      name: "Cline",
      logo: icon(AGENT_LOGOS.cline, true),
      summary: "Add the server from the Cline panel in VS Code.",
      steps: [
        { text: "Open Cline, select the <strong>MCP Servers</strong> icon and go to the <strong>Remote Servers</strong> tab." },
        { text: `Enter <strong>telegram</strong> as the name, paste <code>${url}</code> as the URL, choose <strong>Streamable HTTP</strong> and select <strong>Add Server</strong>.` },
        { text: "Complete the sign-in Cline opens in your browser by scanning the QR code." },
      ],
    },
    {
      id: "opencode",
      name: "OpenCode",
      logo: OPENCODE_LOGO,
      summary: "Add a remote server to your OpenCode config.",
      steps: [
        {
          text: "Add this to <code>opencode.json</code>.",
          code: {
            file: "opencode.json",
            value: `{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "telegram": {
      "type": "remote",
      "url": "${serverUrl}",
      "enabled": true
    }
  }
}`,
          },
        },
        { text: "Sign in.", code: { value: "opencode mcp auth telegram" } },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "hermes",
      name: "Hermes Agent",
      logo: icon(AGENT_LOGOS.hermes, true),
      summary: "Add the server to your Hermes config.",
      steps: [
        {
          text: "Add this to <code>~/.hermes/config.yaml</code>.",
          code: {
            file: "~/.hermes/config.yaml",
            value: `mcp_servers:
  telegram:
    url: "${serverUrl}"
    auth: oauth`,
          },
        },
        { text: "Sign in.", code: { value: "hermes mcp login telegram" } },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
    {
      id: "other",
      name: "Other clients",
      logo: icon(CLIENT_LOGOS.mcp),
      summary: "Any client that supports remote MCP servers with OAuth can use the URL directly. For clients that only run local servers, use mcp-remote.",
      steps: [
        {
          text: "Add this to your client's MCP config. Node.js 18 or newer is required.",
          code: {
            file: "mcp.json",
            value: `{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${serverUrl}"]
    }
  }
}`,
          },
        },
        { text: "Restart the client. A browser window opens for sign-in." },
        { text: "Scan the QR code that opens in your browser." },
      ],
    },
  ];
}

function codeBlock(id: string, code: NonNullable<GuideStep["code"]>): string {
  return `<div class="snippet">
  <div class="snippet-bar">
    <span>${code.file ? escapeHtml(code.file) : "Terminal"}</span>
    <button type="button" class="copy" data-copy="${id}">Copy</button>
  </div>
  <pre id="${id}"><code>${escapeHtml(code.value)}</code></pre>
</div>`;
}

function renderTabs(list: ClientGuide[]): string {
  return list
    .map(
      (guide, index) => `<button type="button" role="tab" id="tab-${guide.id}" aria-controls="panel-${guide.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">
  <span class="tab-logo tab-logo-${guide.id}">${guide.logo}</span>${escapeHtml(guide.name)}
</button>`,
    )
    .join("");
}

function renderPanels(list: ClientGuide[]): string {
  return list
    .map(
      (guide, index) => `<div role="tabpanel" id="panel-${guide.id}" aria-labelledby="tab-${guide.id}" tabindex="0"${index === 0 ? "" : " hidden"}>
  <p class="panel-summary">${escapeHtml(guide.summary)}</p>
  <ol class="guide">
    ${guide.steps
      .map(
        (step, stepIndex) =>
          `<li><p>${step.text}</p>${step.code ? codeBlock(`code-${guide.id}-${stepIndex}`, step.code) : ""}</li>`,
      )
      .join("")}
  </ol>
</div>`,
    )
    .join("");
}

const PAGE_STYLES = `
:root { --logo-fold: #1c7fd6; --bubble: #e7eef5; }
@media (prefers-color-scheme: dark) { :root { --logo-fold: #5ab1f2; --bubble: #1b2c3e; } }
.shell { width: 100%; max-width: 1080px; margin: 0 auto; padding: 0 24px; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; color: var(--text); text-decoration: none; }
.brand-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--accent); color: #ffffff; }
.brand-mark svg { width: 20px; height: 20px; }
.topbar a.source { color: var(--muted); text-decoration: none; font-weight: 500; }
.topbar a.source:hover { color: var(--text); }
.hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 56px; align-items: center; padding: 48px 0 72px; }
.hero h1 { margin: 0 0 18px; font-size: clamp(2.4rem, 5.2vw, 3.7rem); line-height: 1.02; letter-spacing: -0.035em; font-weight: 800; max-width: 12ch; text-wrap: balance; }
.lead { margin: 0 0 32px; font-size: 1.15rem; color: var(--muted); max-width: 46ch; }
.url-label { display: block; font-weight: 600; margin-bottom: 8px; }
.url-box { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; max-width: 520px; }
.url-box code { flex: 1; min-width: 0; padding: 0; border: 0; background: none; font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; word-break: normal; }
.copy { font: inherit; font-size: 0.875rem; font-weight: 600; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; white-space: nowrap; }
.copy:hover { border-color: var(--accent); }
.url-box .copy { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.url-note { margin: 12px 0 0; color: var(--muted); font-size: 0.95rem; max-width: 48ch; }
.chat { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 22px; display: grid; gap: 12px; box-shadow: 0 24px 48px -32px rgba(15, 30, 46, 0.35); }
.chat-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid var(--border); font-weight: 600; }
.chat-head .brand-mark { width: 28px; height: 28px; border-radius: 8px; }
.chat-head .brand-mark svg { width: 16px; height: 16px; }
.chat-head span.status { margin-left: auto; font-size: 0.85rem; font-weight: 500; color: var(--success); }
.bubble { max-width: 88%; padding: 10px 14px; border-radius: 16px; font-size: 0.95rem; }
.bubble p { margin: 0; }
.bubble.you { justify-self: end; background: var(--accent); color: var(--accent-text); border-bottom-right-radius: 4px; }
.bubble.ai { background: var(--bubble); border-bottom-left-radius: 4px; }
.calls { display: flex; flex-wrap: wrap; gap: 6px; }
.call { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 0.78rem; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
.call::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
section.block { padding: 72px 0; border-top: 1px solid var(--border); }
.block h2 { margin: 0 0 10px; font-size: clamp(1.6rem, 3vw, 2.1rem); letter-spacing: -0.025em; line-height: 1.15; }
.block-intro { margin: 0 0 36px; color: var(--muted); max-width: 60ch; font-size: 1.05rem; }
.flow { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; counter-reset: flow; }
.flow li { counter-increment: flow; }
.flow li::before { content: counter(flow); display: grid; place-items: center; width: 36px; height: 36px; margin-bottom: 16px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 700; }
.flow h3 { margin: 0 0 6px; font-size: 1.1rem; }
.flow p { margin: 0; color: var(--muted); }
.setup { min-width: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
[role="tablist"] { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; border-bottom: 1px solid var(--border); }
[role="tab"] { display: inline-flex; align-items: center; gap: 8px; flex: none; font: inherit; font-weight: 600; font-size: 0.95rem; padding: 10px 14px; border: 0; border-radius: 10px; background: none; color: var(--muted); cursor: pointer; }
[role="tab"]:hover { color: var(--text); background: var(--bg); }
[role="tab"][aria-selected="true"] { background: var(--accent-soft); color: var(--text); }
.tab-logo { display: grid; place-items: center; width: 20px; height: 20px; }
.tab-logo svg { width: 18px; height: 18px; }
.tab-logo-claude-code, .tab-logo-claude-desktop { color: #d97757; }
[role="tabpanel"] { padding: 28px; }
.panel-summary { margin: 0 0 20px; color: var(--muted); max-width: 64ch; }
.guide { margin: 0; padding: 0 0 0 22px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.guide li { min-width: 0; }
.guide li::marker { color: var(--accent); font-weight: 700; }
.guide p { margin: 0; }
kbd { font-family: var(--mono); font-size: 0.85em; padding: 1px 6px; border-radius: 5px; border: 1px solid var(--border); border-bottom-width: 2px; background: var(--bg); }
.snippet { margin-top: 10px; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--bg); max-width: 720px; }
.snippet-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 6px 6px 14px; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--muted); }
.snippet-bar .copy { padding: 5px 12px; font-size: 0.8rem; }
.snippet pre { margin: 0; padding: 14px 16px; overflow-x: auto; font-family: var(--mono); font-size: 0.86rem; line-height: 1.6; }
.snippet pre code { padding: 0; border: 0; background: none; font-size: inherit; word-break: normal; }
.footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 28px 0 40px; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.9rem; }
.footer a { color: inherit; }
.footer .author { color: var(--text); font-weight: 600; }
@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; gap: 40px; padding: 24px 0 56px; }
  .flow { grid-template-columns: 1fr; gap: 24px; }
}
@media (max-width: 520px) {
  .shell { padding: 0 16px; }
  section.block { padding: 56px 0; }
  [role="tabpanel"] { padding: 20px 16px; }
  .chat { padding: 16px; }
}
`;

const PAGE_SCRIPT = `
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

function select(tab, focus) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden = !active;
  }
  if (focus) tab.focus();
}

const keys = { ArrowRight: 1, ArrowLeft: -1 };
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => select(tab, false));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key in keys) next = (index + keys[event.key] + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next], true);
  });
});

const initial = tabs.find((tab) => "#" + tab.id.slice(4) === location.hash);
if (initial) {
  select(initial, false);
  document.getElementById("setup").scrollIntoView();
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copy);
    try {
      await navigator.clipboard.writeText(source.textContent.trim());
      button.textContent = "Copied";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Press Ctrl+C";
    }
    setTimeout(() => { button.textContent = "Copy"; }, 2000);
  });
}
`;

export function homePage(serverUrl: string): Response {
  const list = guides(serverUrl);

  return htmlPage({
    title: "Telegram MCP",
    description: "Connect your Telegram account to Claude, Cursor, VS Code and other MCP clients.",
    styles: PAGE_STYLES,
    script: PAGE_SCRIPT,
    body: `<div class="shell">
<header class="topbar">
  <a class="brand" href="/"><span class="brand-mark">${PLANE}</span>Telegram MCP</a>
  <a class="source" href="${REPOSITORY_URL}" rel="noopener">Source on GitHub</a>
</header>

<main>
  <section class="hero">
    <div>
      <h1>Your Telegram, inside your AI tools</h1>
      <p class="lead">Read chats, reply, run polls and manage groups from Claude, Codex, Cursor, Gemini and any other MCP client.</p>
      <span class="url-label">Server URL</span>
      <div class="url-box">
        <code id="server-url">${escapeHtml(serverUrl)}</code>
        <button type="button" class="copy" data-copy="server-url">Copy</button>
      </div>
      <p class="url-note">Sign in once with a QR code from the Telegram app. No phone number, no session strings.</p>
    </div>

    <div class="chat" aria-label="Example conversation">
      <div class="chat-head"><span class="brand-mark">${PLANE}</span>Telegram<span class="status">Connected</span></div>
      <div class="bubble you"><p>What did I miss in the Family group today?</p></div>
      <div class="calls"><span class="call">get_unread</span></div>
      <div class="bubble ai"><p>Mum shared lunch photos, Leo asked who can pick up the cake at 6, and there is a weekend poll: coast 3, mountains 2.</p></div>
      <div class="bubble you"><p>Vote for the coast and tell Leo I can do 6.</p></div>
      <div class="calls"><span class="call">vote_poll</span><span class="call">reply_to_message</span></div>
      <div class="bubble ai"><p>Done. Voted for the coast and replied to Leo.</p></div>
    </div>
  </section>

  <section class="block" aria-labelledby="how-title">
    <h2 id="how-title">Connect in under a minute</h2>
    <p class="block-intro">There is nothing to install and no API keys to create.</p>
    <ol class="flow">
      <li><h3>Add the server</h3><p>Paste the server URL into your MCP client using the setup below.</p></li>
      <li><h3>Scan with Telegram</h3><p>A sign-in page opens. In Telegram, go to Settings, Devices, Link Desktop Device and scan the code.</p></li>
      <li><h3>Ask in plain words</h3><p>Your assistant can now read and act on your chats whenever you ask.</p></li>
    </ol>
  </section>

  <section class="block" id="setup" aria-labelledby="setup-title">
    <h2 id="setup-title">Set up your client</h2>
    <p class="block-intro">Pick your client. If you use two-step verification, the sign-in page asks for your password after the scan.</p>
    <div class="setup">
      <div role="tablist" aria-label="MCP clients">${renderTabs(list)}</div>
      ${renderPanels(list)}
    </div>
  </section>
</main>

<footer class="footer">
  <span>Developed by <a class="author" href="${AUTHOR_URL}" rel="noopener">Narihito</a>. Not affiliated with Telegram.</span>
  <a href="${REPOSITORY_URL}" rel="noopener">Source on GitHub</a>
</footer>
</div>`,
  });
}

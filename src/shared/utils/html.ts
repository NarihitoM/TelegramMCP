import { randomBytes } from "node:crypto";

const STYLES = `
:root {
  --bg: #f4f6f9;
  --surface: #ffffff;
  --text: #16202c;
  --muted: #5b6878;
  --border: #dde3ea;
  --accent: #2a8bd8;
  --accent-text: #ffffff;
  --success: #1f8f55;
  --danger: #c43d3d;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f151c;
    --surface: #18212b;
    --text: #e8edf3;
    --muted: #93a1b1;
    --border: #2a3643;
    --accent: #4aa3ea;
    --accent-text: #0b1218;
    --success: #4cc489;
    --danger: #ef7070;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.5; }
.page { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
.card { width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px 28px; }
.card-header { margin-bottom: 24px; }
.card-header h1 { margin: 0 0 6px; font-size: 1.5rem; }
.muted { color: var(--muted); margin: 0; }
.stack { display: grid; gap: 16px; }
.qr-frame { display: grid; place-items: center; padding: 16px; background: #ffffff; border-radius: 12px; border: 1px solid var(--border); }
.qr-frame img, .qr-skeleton { width: 280px; height: 280px; max-width: 100%; }
.qr-skeleton { border-radius: 8px; background: linear-gradient(90deg, #eef1f5 25%, #e2e7ed 50%, #eef1f5 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.steps { margin: 0; padding-left: 20px; color: var(--muted); display: grid; gap: 4px; }
.steps strong { color: var(--text); }
.field { display: grid; gap: 6px; font-weight: 500; }
.field input { font: inherit; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); }
.field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.button { font: inherit; font-weight: 600; padding: 11px 16px; border: none; border-radius: 10px; background: var(--accent); color: var(--accent-text); cursor: pointer; }
.button:disabled { opacity: 0.6; cursor: default; }
.notice { margin: 0; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); }
.notice.success { color: var(--success); }
.notice.error { color: var(--danger); }
code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.9em; padding: 2px 6px; border-radius: 6px; background: var(--bg); border: 1px solid var(--border); word-break: break-all; }
`;

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

interface PageOptions {
  title: string;
  body: string;
  script?: string;
  status?: number;
}

export function htmlPage({ title, body, script, status = 200 }: PageOptions): Response {
  const nonce = randomBytes(16).toString("base64");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style nonce="${nonce}">${STYLES}</style>
</head>
<body>
${body}
${script ? `<script nonce="${nonce}">${script}</script>` : ""}
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": [
        "default-src 'none'",
        "img-src data:",
        `style-src 'nonce-${nonce}'`,
        `script-src 'nonce-${nonce}'`,
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function card(title: string, subtitle: string | undefined, content: string): string {
  return `<main class="page">
  <section class="card">
    <header class="card-header">
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="muted">${escapeHtml(subtitle)}</p>` : ""}
    </header>
    ${content}
  </section>
</main>`;
}

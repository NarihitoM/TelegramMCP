import { randomBytes } from "node:crypto";

const STYLES = `
:root {
  --bg: #eef2f6;
  --surface: #ffffff;
  --text: #0f1e2e;
  --muted: #5a6b7d;
  --border: #d3dce5;
  --accent: #1c7fd6;
  --accent-soft: #dcebfa;
  --accent-text: #ffffff;
  --success: #1f8f5f;
  --danger: #c2412d;
  --font: "Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e1924;
    --surface: #142231;
    --text: #e6eef6;
    --muted: #8da0b3;
    --border: #22364a;
    --accent: #5ab1f2;
    --accent-soft: #16324b;
    --accent-text: #08131d;
    --success: #49c08a;
    --danger: #f07a66;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); line-height: 1.5; -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.page { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
.card { width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px 28px; }
.card-header { margin-bottom: 24px; }
.card-header h1 { margin: 0 0 6px; font-size: 1.5rem; }
.muted { color: var(--muted); margin: 0; }
.stack { display: grid; gap: 16px; }
.qr-frame { display: grid; place-items: center; padding: 16px; background: #ffffff; border-radius: 12px; border: 1px solid var(--border); }
.qr-frame img, .qr-skeleton { width: 100%; max-width: 280px; height: auto; aspect-ratio: 1 / 1; }
.qr-skeleton { border-radius: 8px; background: linear-gradient(90deg, #eef1f5 25%, #e2e7ed 50%, #eef1f5 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.steps { margin: 0; padding-left: 20px; color: var(--muted); display: grid; gap: 4px; }
.steps strong { color: var(--text); }
.field { display: grid; gap: 6px; font-weight: 500; }
.field input { font: inherit; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); }
.field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.password-input { position: relative; display: grid; }
.password-input input { padding-right: 48px; }
.password-toggle { position: absolute; top: 50%; right: 6px; transform: translateY(-50%); display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 8px; background: none; color: var(--muted); cursor: pointer; }
.password-toggle:hover { color: var(--text); }
.password-toggle svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.button { font: inherit; font-weight: 600; padding: 11px 16px; border: none; border-radius: 10px; background: var(--accent); color: var(--accent-text); cursor: pointer; }
.button:disabled { opacity: 0.6; cursor: default; }
.notice { margin: 0; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); }
.notice.success { color: var(--success); }
.notice.error { color: var(--danger); }
@media (max-width: 480px) {
  .page { padding: 16px 12px; }
  .card { padding: 24px 18px; border-radius: 14px; }
  .card-header { margin-bottom: 18px; }
  .card-header h1 { font-size: 1.35rem; }
  .qr-frame { padding: 12px; }
}
code { font-family: var(--mono); font-size: 0.9em; padding: 2px 6px; border-radius: 6px; background: var(--bg); border: 1px solid var(--border); word-break: break-all; }
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

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap";

interface PageOptions {
  title: string;
  body: string;
  script?: string;
  styles?: string;
  description?: string;
  status?: number;
}

export function htmlPage({ title, body, script, styles = "", description, status = 200 }: PageOptions): Response {
  const nonce = randomBytes(16).toString("base64");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}">
<style nonce="${nonce}">${STYLES}${styles}</style>
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
        `style-src 'nonce-${nonce}' https://fonts.googleapis.com`,
        "font-src https://fonts.gstatic.com",
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

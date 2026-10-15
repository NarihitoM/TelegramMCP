import { card, escapeHtml, htmlPage } from "../../shared/utils/html.ts";

interface AuthorizeView {
  request: string;
  clientName: string;
  redirectHost: string;
}

const LOGIN_SCRIPT = `
const $ = (id) => document.getElementById(id);
const request = $("login").dataset.request;
const views = ["qr-view", "password-view", "status-view"];
const POLL_INTERVAL_MS = 3000;
let timer;

function show(id) {
  for (const view of views) $(view).hidden = view !== id;
}

function showStatus(text, tone, canRestart) {
  show("status-view");
  $("status-text").textContent = text;
  $("status-text").className = tone ? "notice " + tone : "notice";
  $("restart").hidden = !canRestart;
}

async function call(path, body) {
  try {
    const response = await fetch("/api/telegram/login/" + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return await response.json();
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

function render(step) {
  clearTimeout(timer);
  switch (step.status) {
    case "qr":
      show("qr-view");
      $("qr").src = step.qr;
      $("qr").hidden = false;
      $("qr-loading").hidden = true;
      timer = setTimeout(() => run(call("qr")), POLL_INTERVAL_MS);
      break;
    case "password":
      show("password-view");
      $("hint").textContent = step.hint ? "(hint: " + step.hint + ")" : "";
      $("password-error").textContent = step.error || "";
      $("password-error").hidden = !step.error;
      $("password-submit").disabled = false;
      $("password").focus();
      break;
    case "wait":
      showStatus("Telegram asked us to slow down. Retrying in " + step.retryAfter + "s.");
      timer = setTimeout(() => run(call("qr")), step.retryAfter * 1000);
      break;
    case "done":
      showStatus("Logged in. Returning you to your app...", "success");
      window.location.assign(step.redirectTo);
      break;
    case "expired":
      showStatus("This login session expired.", "", true);
      break;
    default:
      showStatus(step.message || "Something went wrong.", "error", true);
  }
}

async function run(pending) {
  render(await pending);
}

function start() {
  show("qr-view");
  $("qr").hidden = true;
  $("qr-loading").hidden = false;
  run(call("start", { request }));
}

$("password-view").addEventListener("submit", (event) => {
  event.preventDefault();
  const password = $("password").value;
  if (!password) return;
  $("password-submit").disabled = true;
  run(call("password", { password }));
});

$("password-toggle").addEventListener("click", () => {
  const input = $("password");
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  $("password-toggle").setAttribute("aria-pressed", String(visible));
  $("password-toggle").setAttribute("aria-label", visible ? "Hide password" : "Show password");
  $("eye-open").hidden = visible;
  $("eye-closed").hidden = !visible;
  input.focus();
  try {
    input.setSelectionRange(input.value.length, input.value.length);
  } catch {}
});

$("restart").addEventListener("click", start);

start();
`;

export function authorizePage({ request, clientName, redirectHost }: AuthorizeView): Response {
  const content = `<div class="stack" id="login" data-request="${escapeHtml(request)}">
  <p class="muted">
    After login you will be sent to <strong>${escapeHtml(redirectHost)}</strong>.
    Only continue if you started this from your own app.
  </p>

  <div class="stack" id="qr-view">
    <div class="qr-frame">
      <img id="qr" alt="Telegram login QR code" width="280" height="280" hidden>
      <div id="qr-loading" class="qr-skeleton" aria-label="Loading QR code"></div>
    </div>
    <ol class="steps">
      <li>Open Telegram on your phone</li>
      <li>Go to <strong>Settings &gt; Devices &gt; Link Desktop Device</strong></li>
      <li>Point your phone at this screen to confirm login</li>
    </ol>
  </div>

  <form class="stack" id="password-view" hidden>
    <p class="muted">Your account is protected with two-step verification. Enter your cloud password.</p>
    <div class="field">
      <label for="password">Password <span class="muted" id="hint"></span></label>
      <div class="password-input">
        <input type="password" id="password" autocomplete="current-password" spellcheck="false">
        <button type="button" class="password-toggle" id="password-toggle" aria-label="Show password" aria-pressed="false" aria-controls="password">
          <svg id="eye-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg id="eye-closed" viewBox="0 0 24 24" aria-hidden="true" hidden><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/></svg>
        </button>
      </div>
    </div>
    <p class="notice error" id="password-error" hidden></p>
    <button class="button" type="submit" id="password-submit">Continue</button>
  </form>

  <div class="stack" id="status-view" hidden>
    <p class="notice" id="status-text"></p>
    <button class="button" type="button" id="restart" hidden>Start again</button>
  </div>
</div>`;

  return htmlPage({
    title: "Connect Telegram",
    body: card("Connect Telegram", `${clientName} wants access to your Telegram account.`, content),
    script: LOGIN_SCRIPT,
  });
}

export function messagePage(title: string, message: string, status = 400): Response {
  return htmlPage({
    title,
    status,
    body: card(title, undefined, `<p class="muted">${escapeHtml(message)}</p>`),
  });
}

import { getPublicOrigin } from "mcp-handler";
import { z } from "zod";
import { seal, unseal } from "../../shared/lib/seal.ts";
import { readCookie, serializeCookie } from "../../shared/utils/cookies.ts";
import { json } from "../../shared/utils/http.ts";
import { validateAuthorizeRequest } from "../oauth/index.ts";
import { authorizePage, messagePage } from "./login.page.ts";
import { pollLogin, startLogin, submitPassword } from "./login.service.ts";
import { loginStateSchema, type LoginOutcome, type LoginState } from "./login.types.ts";

const COOKIE_NAME = "tg_login";
const COOKIE_PATH = "/api/telegram/login";
const LOGIN_TTL = 10 * 60;

const startSchema = z.object({ request: z.string().min(1) });
const passwordSchema = z.object({ password: z.string().min(1).max(256) });

function readState(req: Request): LoginState | null {
  const value = readCookie(req, COOKIE_NAME);
  return value ? (unseal("login", value, loginStateSchema)?.data ?? null) : null;
}

function stateCookie(req: Request, state: LoginState | null): string {
  return serializeCookie(COOKIE_NAME, state ? seal("login", state, LOGIN_TTL) : "", {
    path: COOKIE_PATH,
    maxAge: state ? LOGIN_TTL : 0,
    httpOnly: true,
    secure: getPublicOrigin(req).startsWith("https:"),
    sameSite: "Lax",
  });
}

async function respond(req: Request, run: () => Promise<LoginOutcome>): Promise<Response> {
  try {
    const outcome = await run();
    const headers: Record<string, string> = outcome.state === undefined ? {} : { "Set-Cookie": stateCookie(req, outcome.state) };
    return json(outcome.step, 200, headers);
  } catch (error) {
    console.error("Telegram login failed:", error instanceof Error ? error.message : String(error));
    return json({ status: "error", message: "Telegram login failed. Try again in a moment." }, 500);
  }
}

async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const parsed = schema.safeParse(await req.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function handleAuthorize(req: Request): Promise<Response> {
  const check = await validateAuthorizeRequest(Object.fromEntries(new URL(req.url).searchParams));

  if (!check.ok) {
    return check.redirectTo ? Response.redirect(check.redirectTo, 302) : messagePage("Cannot connect", check.message);
  }

  return authorizePage(check);
}

export async function handleStart(req: Request): Promise<Response> {
  const body = await readBody(req, startSchema);
  if (!body) return json({ status: "error", message: "Invalid request" }, 400);
  return respond(req, () => startLogin(body.request));
}

export function handlePoll(req: Request): Promise<Response> {
  return respond(req, () => pollLogin(readState(req)));
}

export async function handlePassword(req: Request): Promise<Response> {
  const body = await readBody(req, passwordSchema);
  if (!body) return json({ status: "error", message: "Password is required" }, 400);
  return respond(req, () => submitPassword(readState(req), body.password));
}

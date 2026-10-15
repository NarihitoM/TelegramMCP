import QRCode from "qrcode";
import { Api, type TelegramClient } from "telegram";
import { createAuthorizationRedirect, openAuthorizeRequest } from "../oauth/index.ts";
import { computeCheck, FloodWaitError, type StringSession } from "../../shared/lib/gramjs.ts";
import { rpcErrorMessage, telegramCredentials, withTelegramClient } from "../../shared/lib/telegramClient.ts";
import type { LoginOutcome, LoginState, LoginStep } from "./login.types.ts";

const EXPIRED: LoginOutcome = { step: { status: "expired" }, state: null };

function nextState(session: StringSession, request: string): LoginState {
  return { session: session.save(), request };
}

async function qrStep(token: Api.auth.LoginToken): Promise<LoginStep> {
  const link = `tg://login?token=${Buffer.from(token.token).toString("base64url")}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: "M" });
  return { status: "qr", qr, expiresAt: token.expires * 1000 };
}

function complete(session: StringSession, request: string, authorization: Api.auth.TypeAuthorization): LoginOutcome {
  const authorizeRequest = openAuthorizeRequest(request);
  if (!authorizeRequest) return EXPIRED;

  if (!(authorization instanceof Api.auth.Authorization)) {
    return { step: { status: "error", message: "This Telegram account needs to finish sign up in the official app first." }, state: null };
  }

  const redirectTo = createAuthorizationRedirect(authorizeRequest, session.save(), authorization.user.id.toString());
  return { step: { status: "done", redirectTo }, state: null };
}

function logStep(step: string): void {
  console.info(`Telegram login: ${step}`);
}

async function passwordStep(client: TelegramClient, error?: string): Promise<LoginStep> {
  const password = await client.invoke(new Api.account.GetPassword());
  return { status: "password", hint: password.hint ?? "", error };
}

async function recover(error: unknown, client: TelegramClient, state: LoginState): Promise<LoginOutcome> {
  if (error instanceof FloodWaitError) {
    return { step: { status: "wait", retryAfter: error.seconds }, state };
  }
  if (rpcErrorMessage(error) === "SESSION_PASSWORD_NEEDED") {
    logStep("password required");
    return { step: await passwordStep(client), state };
  }
  logStep(`failed with ${rpcErrorMessage(error) ?? (error instanceof Error ? error.message : "unknown error")}`);
  throw error;
}

async function importOnDataCenter(client: TelegramClient, migration: Api.auth.LoginTokenMigrateTo, request: string): Promise<LoginOutcome> {
  const dataCenter = await client.getDC(migration.dcId);
  logStep(`migrating to DC ${migration.dcId}`);

  return withTelegramClient(
    "",
    async (migrated, session) => {
      try {
        const imported = await migrated.invoke(new Api.auth.ImportLoginToken({ token: migration.token }));
        if (!(imported instanceof Api.auth.LoginTokenSuccess)) throw new Error(`Unexpected login result ${imported.className}`);
        logStep("authorized after migration");
        return complete(session, request, imported.authorization);
      } catch (error) {
        return recover(error, migrated, nextState(session, request));
      }
    },
    dataCenter,
  );
}

async function exportLoginToken(client: TelegramClient, session: StringSession, request: string): Promise<LoginOutcome> {
  try {
    const result = await client.invoke(new Api.auth.ExportLoginToken({ ...telegramCredentials(), exceptIds: [] }));

    if (result instanceof Api.auth.LoginToken) {
      return { step: await qrStep(result), state: nextState(session, request) };
    }

    if (result instanceof Api.auth.LoginTokenMigrateTo) {
      return importOnDataCenter(client, result, request);
    }

    logStep("authorized");
    return complete(session, request, result.authorization);
  } catch (error) {
    return recover(error, client, nextState(session, request));
  }
}

export async function startLogin(request: string): Promise<LoginOutcome> {
  if (!openAuthorizeRequest(request)) return EXPIRED;
  return withTelegramClient("", (client, session) => exportLoginToken(client, session, request));
}

export async function pollLogin(state: LoginState | null): Promise<LoginOutcome> {
  if (!state) return EXPIRED;
  return withTelegramClient(state.session, (client, session) => exportLoginToken(client, session, state.request));
}

export async function submitPassword(state: LoginState | null, password: string): Promise<LoginOutcome> {
  if (!state) return EXPIRED;

  return withTelegramClient(state.session, async (client, session) => {
    try {
      const info = await client.invoke(new Api.account.GetPassword());
      const check = await computeCheck(info, password);
      const authorization = await client.invoke(new Api.auth.CheckPassword({ password: check }));
      return complete(session, state.request, authorization);
    } catch (error) {
      if (rpcErrorMessage(error) === "PASSWORD_HASH_INVALID") {
        return { step: await passwordStep(client, "Wrong password, try again."), state: nextState(session, state.request) };
      }
      return recover(error, client, nextState(session, state.request));
    }
  });
}

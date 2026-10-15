import { TelegramClient } from "telegram";
import { getEnv } from "./env.ts";
import { RPCError, SilentLogger, StringSession } from "./gramjs.ts";

export type TelegramRun<T> = (client: TelegramClient, session: StringSession) => Promise<T>;

export interface DataCenter {
  id: number;
  ipAddress: string;
  port: number;
}

export async function withTelegramClient<T>(savedSession: string, run: TelegramRun<T>, dataCenter?: DataCenter): Promise<T> {
  const { TELEGRAM_API_ID, TELEGRAM_API_HASH } = getEnv();
  const session = new StringSession(savedSession);
  if (dataCenter) session.setDC(dataCenter.id, dataCenter.ipAddress, dataCenter.port);
  const client = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
    connectionRetries: 2,
    autoReconnect: false,
    floodSleepThreshold: 0,
    deviceModel: "Telegram MCP",
    appVersion: "0.1.0",
    baseLogger: new SilentLogger(),
  });

  await client.connect();
  try {
    return await run(client, session);
  } finally {
    await client.destroy();
  }
}

export function rpcErrorMessage(error: unknown): string | undefined {
  return error instanceof RPCError ? error.errorMessage : undefined;
}

export function telegramCredentials(): { apiId: number; apiHash: string } {
  const { TELEGRAM_API_ID, TELEGRAM_API_HASH } = getEnv();
  return { apiId: TELEGRAM_API_ID, apiHash: TELEGRAM_API_HASH };
}

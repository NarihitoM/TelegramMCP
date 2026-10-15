import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { getEnv } from "./env.ts";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export type SealType = "client" | "authorize" | "login" | "code" | "access" | "refresh";

export interface Unsealed<T> {
  data: T;
  expiresAt?: number;
}

const envelopeSchema = z.object({
  data: z.unknown(),
  exp: z.number().optional(),
});

function encryptionKey(): Buffer {
  return Buffer.from(getEnv().SESSION_ENCRYPTION_KEY, "hex");
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function seal<T>(type: SealType, data: T, ttlSeconds?: number): string {
  const envelope = {
    data,
    exp: ttlSeconds === undefined ? undefined : nowSeconds() + ttlSeconds,
  };
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(Buffer.from(type));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(envelope), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function unseal<T>(type: SealType, token: string, schema: z.ZodType<T>): Unsealed<T> | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length <= IV_LENGTH + TAG_LENGTH) return null;

    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
    decipher.setAAD(Buffer.from(type));
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

    const envelope = envelopeSchema.parse(JSON.parse(json));
    if (envelope.exp !== undefined && envelope.exp <= nowSeconds()) return null;

    const parsed = schema.safeParse(envelope.data);
    if (!parsed.success) return null;

    return { data: parsed.data, expiresAt: envelope.exp };
  } catch {
    return null;
  }
}

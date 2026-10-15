import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(1),
  SESSION_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "SESSION_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters"),
  APP_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  const defined = Object.entries(process.env).filter(([, value]) => value !== "");
  cached ??= envSchema.parse(Object.fromEntries(defined));
  return cached;
}

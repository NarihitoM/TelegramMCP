import { z } from "zod";

export const SCOPE = "telegram";

export const registeredClientSchema = z.object({
  redirectUris: z.array(z.string()).min(1),
  clientName: z.string().optional(),
});

export const authorizeRequestSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  redirectUri: z.string(),
  codeChallenge: z.string(),
  state: z.string().optional(),
  resource: z.string().optional(),
});

export const grantSchema = z.object({
  session: z.string(),
  clientId: z.string(),
  userId: z.string(),
});

export const authorizationCodeSchema = grantSchema.extend({
  redirectUri: z.string(),
  codeChallenge: z.string(),
});

export type RegisteredClient = z.infer<typeof registeredClientSchema>;
export type AuthorizeRequest = z.infer<typeof authorizeRequestSchema>;
export type Grant = z.infer<typeof grantSchema>;
export type AuthorizationCode = z.infer<typeof authorizationCodeSchema>;

export type OAuthResult<T> = { ok: true; value: T } | { ok: false; error: string; description: string };

export type AuthorizeCheck =
  | { ok: true; request: string; clientName: string; redirectHost: string }
  | { ok: false; message: string; redirectTo?: string };

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

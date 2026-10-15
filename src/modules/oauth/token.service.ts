import type { AuthInfo } from "@modelcontextprotocol/server";
import { seal, unseal } from "../../shared/lib/seal.ts";
import {
  authorizationCodeSchema,
  grantSchema,
  SCOPE,
  type Grant,
  type OAuthResult,
  type TokenResponse,
} from "./oauth.types.ts";
import { verifyPkce } from "./pkce.service.ts";

const ACCESS_TOKEN_TTL = 30 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL = 180 * 24 * 60 * 60;

function issueTokens(grant: Grant): TokenResponse {
  return {
    access_token: seal<Grant>("access", grant, ACCESS_TOKEN_TTL),
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: seal<Grant>("refresh", grant, REFRESH_TOKEN_TTL),
    scope: SCOPE,
  };
}

function invalidGrant(description: string): OAuthResult<TokenResponse> {
  return { ok: false, error: "invalid_grant", description };
}

function exchangeAuthorizationCode(params: URLSearchParams): OAuthResult<TokenResponse> {
  const code = params.get("code");
  const verifier = params.get("code_verifier");
  if (!code || !verifier) {
    return { ok: false, error: "invalid_request", description: "code and code_verifier are required" };
  }

  const payload = unseal("code", code, authorizationCodeSchema)?.data;
  if (!payload) return invalidGrant("Authorization code is invalid or expired");

  const clientId = params.get("client_id");
  if (clientId && clientId !== payload.clientId) return invalidGrant("client_id does not match");

  const redirectUri = params.get("redirect_uri");
  if (redirectUri && redirectUri !== payload.redirectUri) return invalidGrant("redirect_uri does not match");

  if (!verifyPkce(verifier, payload.codeChallenge)) return invalidGrant("PKCE verification failed");

  return { ok: true, value: issueTokens({ session: payload.session, clientId: payload.clientId, userId: payload.userId }) };
}

function exchangeRefreshToken(params: URLSearchParams): OAuthResult<TokenResponse> {
  const token = params.get("refresh_token");
  if (!token) return { ok: false, error: "invalid_request", description: "refresh_token is required" };

  const grant = unseal("refresh", token, grantSchema)?.data;
  if (!grant) return invalidGrant("Refresh token is invalid or expired");

  const clientId = params.get("client_id");
  if (clientId && clientId !== grant.clientId) return invalidGrant("client_id does not match");

  return { ok: true, value: issueTokens(grant) };
}

export function exchangeToken(params: URLSearchParams): OAuthResult<TokenResponse> {
  switch (params.get("grant_type")) {
    case "authorization_code":
      return exchangeAuthorizationCode(params);
    case "refresh_token":
      return exchangeRefreshToken(params);
    default:
      return { ok: false, error: "unsupported_grant_type", description: "Use authorization_code or refresh_token" };
  }
}

export function verifyAccessToken(token: string | undefined): AuthInfo | undefined {
  if (!token) return undefined;

  const unsealed = unseal("access", token, grantSchema);
  if (!unsealed) return undefined;

  return {
    token,
    clientId: unsealed.data.clientId,
    scopes: [SCOPE],
    expiresAt: unsealed.expiresAt,
    extra: {
      session: unsealed.data.session,
      userId: unsealed.data.userId,
    },
  };
}

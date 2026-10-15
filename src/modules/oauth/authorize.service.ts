import { seal, unseal } from "../../shared/lib/seal.ts";
import {
  authorizeRequestSchema,
  type AuthorizationCode,
  type AuthorizeCheck,
  type AuthorizeRequest,
} from "./oauth.types.ts";
import { redirectUriMatches, resolveClient } from "./client.service.ts";
import { isValidChallenge } from "./pkce.service.ts";

const AUTHORIZE_REQUEST_TTL = 15 * 60;
const AUTHORIZATION_CODE_TTL = 2 * 60;

export type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function errorRedirect(redirectUri: string, error: string, description: string, state?: string): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export async function validateAuthorizeRequest(params: SearchParams): Promise<AuthorizeCheck> {
  const clientId = single(params, "client_id");
  const redirectUri = single(params, "redirect_uri");
  const state = single(params, "state");

  if (!clientId || !redirectUri) {
    return { ok: false, message: "The authorization request is missing client_id or redirect_uri." };
  }

  const client = await resolveClient(clientId);
  if (!client) {
    return { ok: false, message: "This MCP client is not registered. Remove the connector and add it again." };
  }

  if (!client.redirectUris.some((registered) => redirectUriMatches(registered, redirectUri))) {
    return { ok: false, message: "The redirect_uri does not match the registered client." };
  }

  if (single(params, "response_type") !== "code") {
    return {
      ok: false,
      message: "Unsupported response_type.",
      redirectTo: errorRedirect(redirectUri, "unsupported_response_type", "Only response_type=code is supported", state),
    };
  }

  const codeChallenge = single(params, "code_challenge");
  if (!codeChallenge || single(params, "code_challenge_method") !== "S256" || !isValidChallenge(codeChallenge)) {
    return {
      ok: false,
      message: "PKCE with S256 is required.",
      redirectTo: errorRedirect(redirectUri, "invalid_request", "PKCE code_challenge with S256 is required", state),
    };
  }

  const clientName = client.clientName ?? "an MCP client";
  const request: AuthorizeRequest = {
    clientId,
    clientName,
    redirectUri,
    codeChallenge,
    state,
    resource: single(params, "resource"),
  };

  const redirect = new URL(redirectUri);
  const redirectHost = redirect.host || redirect.protocol.replace(/:$/, "");

  return { ok: true, request: seal("authorize", request, AUTHORIZE_REQUEST_TTL), clientName, redirectHost };
}

export function openAuthorizeRequest(sealed: string): AuthorizeRequest | null {
  return unseal("authorize", sealed, authorizeRequestSchema)?.data ?? null;
}

export function createAuthorizationRedirect(request: AuthorizeRequest, session: string, userId: string): string {
  const code = seal<AuthorizationCode>(
    "code",
    {
      session,
      userId,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
    },
    AUTHORIZATION_CODE_TTL,
  );

  const url = new URL(request.redirectUri);
  url.searchParams.set("code", code);
  if (request.state) url.searchParams.set("state", request.state);
  return url.toString();
}

import { z } from "zod";
import { fetchPublic } from "../../shared/lib/remoteFetch.ts";
import { seal, unseal } from "../../shared/lib/seal.ts";
import { registeredClientSchema, type OAuthResult, type RegisteredClient } from "./oauth.types.ts";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const BLOCKED_SCHEMES = new Set(["javascript:", "data:", "file:", "vbscript:", "blob:"]);
const METADATA_DOCUMENT_MAX_BYTES = 64 * 1024;

const registrationSchema = z.object({
  redirect_uris: z.array(z.string()).min(1),
  client_name: z.string().max(200).optional(),
});

const metadataDocumentSchema = z.object({
  client_id: z.string(),
  redirect_uris: z.array(z.string()).min(1),
  client_name: z.string().max(200).optional(),
});

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopback(url: URL): boolean {
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

export function isAllowedRedirectUri(value: string): boolean {
  const url = parseUrl(value);
  if (!url || url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return isLoopback(url);
  return !BLOCKED_SCHEMES.has(url.protocol);
}

export function redirectUriMatches(registered: string, requested: string): boolean {
  if (registered === requested) return true;

  const expected = parseUrl(registered);
  const actual = parseUrl(requested);
  if (!expected || !actual) return false;

  return (
    isLoopback(expected) &&
    isLoopback(actual) &&
    expected.hostname === actual.hostname &&
    expected.pathname === actual.pathname &&
    expected.search === actual.search
  );
}

export function registerClient(body: unknown): OAuthResult<Record<string, unknown>> {
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_client_metadata", description: "redirect_uris is required" };
  }

  const { redirect_uris: redirectUris, client_name: clientName } = parsed.data;
  if (!redirectUris.every(isAllowedRedirectUri)) {
    return { ok: false, error: "invalid_redirect_uri", description: "One or more redirect_uris are not allowed" };
  }

  const clientId = seal<RegisteredClient>("client", { redirectUris, clientName });

  return {
    ok: true,
    value: {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
  };
}

async function fetchMetadataDocument(clientId: string): Promise<RegisteredClient | null> {
  const url = parseUrl(clientId);
  if (!url || url.protocol !== "https:" || url.pathname === "/") return null;

  try {
    const { buffer } = await fetchPublic(clientId, {
      maxBytes: METADATA_DOCUMENT_MAX_BYTES,
      timeoutMs: 5_000,
      httpsOnly: true,
    });
    const document = metadataDocumentSchema.safeParse(JSON.parse(buffer.toString("utf8")));
    if (!document.success || document.data.client_id !== clientId) return null;

    const redirectUris = document.data.redirect_uris.filter(isAllowedRedirectUri);
    if (redirectUris.length === 0) return null;

    return { redirectUris, clientName: document.data.client_name ?? url.hostname };
  } catch {
    return null;
  }
}

export async function resolveClient(clientId: string): Promise<RegisteredClient | null> {
  if (clientId.startsWith("https://")) return fetchMetadataDocument(clientId);
  return unseal("client", clientId, registeredClientSchema)?.data ?? null;
}

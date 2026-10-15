import { json, oauthError } from "../../shared/utils/http.ts";
import { registerClient } from "./client.service.ts";
import { exchangeToken } from "./token.service.ts";

async function readTokenParams(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return new URLSearchParams(await req.text());

  const body: unknown = await req.json();
  const entries = typeof body === "object" && body !== null ? Object.entries(body) : [];
  return new URLSearchParams(entries.filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export async function handleRegister(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return oauthError("invalid_client_metadata", "Body must be JSON");
  }

  const result = registerClient(body);
  return result.ok ? json(result.value, 201) : oauthError(result.error, result.description);
}

export async function handleToken(req: Request): Promise<Response> {
  let params: URLSearchParams;
  try {
    params = await readTokenParams(req);
  } catch {
    return oauthError("invalid_request", "Malformed token request");
  }

  const result = exchangeToken(params);
  return result.ok ? json(result.value) : oauthError(result.error, result.description);
}

import { getPublicOrigin } from "mcp-handler";
import { getEnv } from "../lib/env.ts";

export type Handler = (req: Request) => Response | Promise<Response>;

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Last-Event-ID, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function oauthError(error: string, description: string, status = 400): Response {
  return json({ error, error_description: description }, status);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function withCors(handler: Handler): Handler {
  return async (req) => {
    const response = await handler(req);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
}

export function appOrigin(req: Request): string {
  const configured = getEnv().APP_URL;
  return configured ? configured.replace(/\/$/, "") : getPublicOrigin(req);
}

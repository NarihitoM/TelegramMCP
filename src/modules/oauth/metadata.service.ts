import { protectedResourceHandler } from "mcp-handler";
import { appOrigin, json } from "../../shared/utils/http.ts";
import { SCOPE } from "./oauth.types.ts";

export const MCP_PATH = "/mcp";
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

export function authorizationServerMetadata(req: Request): Response {
  const issuer = appOrigin(req);

  return json(
    {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      scopes_supported: [SCOPE],
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
    },
    200,
    { "Cache-Control": "max-age=3600" },
  );
}

export function protectedResourceMetadata(req: Request): Response {
  const origin = appOrigin(req);
  return protectedResourceHandler({
    authServerUrls: [origin],
    resourceUrl: `${origin}${MCP_PATH}`,
  })(req);
}

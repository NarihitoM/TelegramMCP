import type { Routes } from "../../shared/utils/router.ts";
import { authorizationServerMetadata, protectedResourceMetadata } from "./metadata.service.ts";
import { handleRegister, handleToken } from "./oauth.controller.ts";

export const oauthRoutes: Routes = {
  "/.well-known/oauth-authorization-server": { GET: authorizationServerMetadata },
  "/.well-known/oauth-protected-resource": { GET: protectedResourceMetadata },
  "/.well-known/oauth-protected-resource/mcp": { GET: protectedResourceMetadata },
  "/oauth/register": { POST: handleRegister },
  "/oauth/token": { POST: handleToken },
};

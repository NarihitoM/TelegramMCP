import { homeRoutes } from "./modules/home/index.ts";
import { oauthRoutes } from "./modules/oauth/index.ts";
import { loginRoutes } from "./modules/telegram-auth/index.ts";
import { mcpRoutes } from "./modules/telegram-tools/index.ts";
import { json } from "./shared/utils/http.ts";
import { createRouter } from "./shared/utils/router.ts";

const router = createRouter({
  ...homeRoutes,
  ...oauthRoutes,
  ...loginRoutes,
  ...mcpRoutes,
});

export async function handle(req: Request): Promise<Response> {
  try {
    return await router(req);
  } catch (error) {
    console.error("Unhandled request error:", error instanceof Error ? error.message : String(error));
    return json({ error: "server_error" }, 500);
  }
}

export default { fetch: handle };

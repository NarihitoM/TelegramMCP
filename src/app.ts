import express, { type ErrorRequestHandler } from "express";
import { homeRoutes } from "./modules/home/index.ts";
import { oauthRoutes } from "./modules/oauth/index.ts";
import { loginRoutes } from "./modules/telegram-auth/index.ts";
import { mcpRoutes } from "./modules/telegram-tools/index.ts";
import { registerRoutes } from "./shared/utils/routes.ts";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

registerRoutes(app, homeRoutes);
registerRoutes(app, oauthRoutes);
registerRoutes(app, loginRoutes);
registerRoutes(app, mcpRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled request error:", error instanceof Error ? error.message : String(error));
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.status(500).json({ error: "server_error" });
};

app.use(errorHandler);

export default app;

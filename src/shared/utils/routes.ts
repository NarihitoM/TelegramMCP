import type { Express, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { preflight, type Handler } from "./http.ts";
import { sendWebResponse, toWebRequest } from "./nodeAdapter.ts";

type Method = "GET" | "POST" | "DELETE";

export type Routes = Record<string, Partial<Record<Method, Handler>>>;

function adapt(handler: Handler) {
  return async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const response = await handler(await toWebRequest(req, req.originalUrl));
    await sendWebResponse(res, response);
  };
}

export function registerRoutes(app: Express, routes: Routes): void {
  for (const [path, methods] of Object.entries(routes)) {
    if (methods.GET) app.get(path, adapt(methods.GET));
    if (methods.POST) app.post(path, adapt(methods.POST));
    if (methods.DELETE) app.delete(path, adapt(methods.DELETE));
    app.options(path, adapt(preflight));
  }
}

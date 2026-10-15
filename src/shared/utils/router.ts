import { json, preflight, type Handler } from "./http.ts";

export type Routes = Record<string, Partial<Record<string, Handler>>>;

export function createRouter(routes: Routes): Handler {
  return (req) => {
    const pathname = new URL(req.url).pathname.replace(/(.)\/$/, "$1");
    const methods = routes[pathname];
    if (!methods) return json({ error: "not_found" }, 404);

    if (req.method === "OPTIONS" && !methods.OPTIONS) return preflight();

    const handler = methods[req.method] ?? (req.method === "HEAD" ? methods.GET : undefined);
    if (handler) return handler(req);

    return json({ error: "method_not_allowed" }, 405, { Allow: Object.keys(methods).join(", ") });
  };
}

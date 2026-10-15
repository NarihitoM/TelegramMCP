import app from "../dist/app.js";

const PATH_PARAM = "__path";

function originalPath(request, url) {
  const fromQuery = url.searchParams.get(PATH_PARAM);
  if (fromQuery !== null) return fromQuery;

  const routeMatches = request.headers.get("x-now-route-matches");
  if (routeMatches) {
    const fromHeader = new URLSearchParams(routeMatches).get("path");
    if (fromHeader !== null) return fromHeader;
  }

  return null;
}

async function restoreOriginalPath(request) {
  const url = new URL(request.url);
  const path = originalPath(request, url);
  if (path === null) return null;

  url.searchParams.delete(PATH_PARAM);
  url.pathname = `/${path}`;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });
}

function unresolved(request) {
  const url = new URL(request.url);
  return Response.json(
    {
      error: "unresolved_path",
      pathname: url.pathname,
      search: url.search,
      headers: [...request.headers.keys()],
    },
    { status: 404 },
  );
}

export default {
  async fetch(request) {
    const restored = await restoreOriginalPath(request);
    if (restored) return app.fetch(restored);
    if (new URL(request.url).pathname === "/api") return unresolved(request);
    return app.fetch(request);
  },
};

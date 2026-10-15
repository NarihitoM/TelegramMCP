import app from "../dist/app.js";

const PATH_PARAM = "__path";

async function restoreOriginalPath(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get(PATH_PARAM);
  if (path === null) return request;

  url.searchParams.delete(PATH_PARAM);
  url.pathname = `/${path}`;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });
}

export default {
  async fetch(request) {
    return app.fetch(await restoreOriginalPath(request));
  },
};

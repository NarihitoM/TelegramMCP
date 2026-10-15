import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

async function readBody(req: IncomingMessage): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

export async function toWebRequest(req: IncomingMessage, path = req.url ?? "/"): Promise<Request> {
  const url = new URL(path, `http://${req.headers.host ?? "localhost"}`);
  const method = req.method ?? "GET";

  const headers = new Headers();
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    headers.append(req.rawHeaders[index], req.rawHeaders[index + 1]);
  }

  const hasBody = method !== "GET" && method !== "HEAD";
  return new Request(url, { method, headers, body: hasBody ? await readBody(req) : undefined });
}

export async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") headers[name] = value;
  });

  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) headers["set-cookie"] = cookies;

  res.writeHead(response.status, headers);

  if (!response.body) {
    res.end();
    return;
  }

  await pipeline(Readable.fromWeb(response.body), res);
}

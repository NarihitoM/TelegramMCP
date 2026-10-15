import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class RemoteFetchError extends Error {}

export interface RemoteFile {
  buffer: Buffer;
  contentType: string | null;
}

interface FetchOptions {
  maxBytes: number;
  timeoutMs?: number;
  httpsOnly?: boolean;
}

function isPrivateIpv4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);

  const normalized = address.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new RemoteFetchError("Local addresses are not allowed");
  }

  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new RemoteFetchError("Private network addresses are not allowed");
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new RemoteFetchError(`File is larger than ${maxBytes} bytes`);
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new RemoteFetchError(`File is larger than ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function fetchPublic(target: string, { maxBytes, timeoutMs = 10_000, httpsOnly = false }: FetchOptions): Promise<RemoteFile> {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new RemoteFetchError("Invalid URL");
  }

  const allowed = httpsOnly ? ["https:"] : ["https:", "http:"];
  if (!allowed.includes(url.protocol)) throw new RemoteFetchError(`Unsupported URL scheme ${url.protocol}`);

  await assertPublicHost(url);

  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new RemoteFetchError(`Remote server answered ${response.status}`);

  return {
    buffer: await readLimited(response, maxBytes),
    contentType: response.headers.get("content-type"),
  };
}

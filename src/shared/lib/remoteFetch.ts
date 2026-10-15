import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

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

const blockedIpv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) {
  blockedIpv4.addSubnet(network, prefix, "ipv4");
}

const blockedIpv6 = new BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["100::", 64],
] as const) {
  blockedIpv6.addSubnet(network, prefix, "ipv6");
}

function expandIpv6(address: string): number[] | null {
  const [head, tail] = address.toLowerCase().split("::");
  const parse = (part: string | undefined): string[] => (part ? part.split(":") : []);
  const headParts = parse(head);
  const tailParts = parse(tail);

  const lastPart = (tail === undefined ? headParts : tailParts).at(-1);
  if (lastPart && isIP(lastPart) === 4) {
    const [a, b, c, d] = lastPart.split(".").map(Number);
    const replacement = [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
    (tail === undefined ? headParts : tailParts).splice(-1, 1, ...replacement);
  }

  const missing = 8 - headParts.length - tailParts.length;
  if (tail === undefined ? missing !== 0 : missing < 0) return null;

  const hextets = [...headParts, ...Array<string>(tail === undefined ? 0 : missing).fill("0"), ...tailParts];
  const numbers = hextets.map((part) => Number.parseInt(part, 16));
  return numbers.length === 8 && numbers.every((value) => value >= 0 && value <= 0xffff) ? numbers : null;
}

function ipv4FromHextets(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function embeddedIpv4(hextets: number[]): string | null {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;
  const firstFiveZero = h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0;

  if (firstFiveZero && (h5 === 0xffff || h5 === 0)) return ipv4FromHextets(h6, h7);
  if (h0 === 0x64 && h1 === 0xff9b && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) return ipv4FromHextets(h6, h7);
  if (h0 === 0x2002) return ipv4FromHextets(h1, h2);
  return null;
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blockedIpv4.check(address, "ipv4");
  if (family !== 6) return true;

  const hextets = expandIpv6(address);
  if (!hextets) return true;

  const ipv4 = embeddedIpv4(hextets);
  if (ipv4) return blockedIpv4.check(ipv4, "ipv4");

  return blockedIpv6.check(address, "ipv6");
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) {
      callback(error, "", 4);
      return;
    }

    const allowed = addresses.find(({ address }) => !isBlockedAddress(address));
    if (!allowed || addresses.some(({ address }) => isBlockedAddress(address))) {
      callback(new RemoteFetchError("Private network addresses are not allowed"), "", 4);
      return;
    }

    if (options.all) {
      callback(null, [allowed]);
    } else {
      callback(null, allowed.address, allowed.family);
    }
  });
};

function readLimited(response: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(response.headers["content-length"] ?? "0");
    if (declared > maxBytes) {
      response.destroy();
      reject(new RemoteFetchError(`File is larger than ${maxBytes} bytes`));
      return;
    }

    const chunks: Buffer[] = [];
    let received = 0;

    response.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > maxBytes) {
        response.destroy();
        reject(new RemoteFetchError(`File is larger than ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks)));
    response.on("error", reject);
  });
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

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new RemoteFetchError("Local addresses are not allowed");
  }
  if (isIP(hostname) && isBlockedAddress(hostname)) {
    throw new RemoteFetchError("Private network addresses are not allowed");
  }

  const send = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise<RemoteFile>((resolve, reject) => {
    const req = send(url, { method: "GET", lookup: safeLookup, timeout: timeoutMs }, (response) => {
      const status = response.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new RemoteFetchError(`Remote server answered ${status}`));
        return;
      }

      readLimited(response, maxBytes)
        .then((buffer) => resolve({ buffer, contentType: response.headers["content-type"] ?? null }))
        .catch(reject);
    });

    req.on("timeout", () => req.destroy(new RemoteFetchError("Remote server timed out")));
    req.on("error", (error) => reject(error instanceof RemoteFetchError ? error : new RemoteFetchError("Could not fetch the URL")));
    req.end();
  });
}

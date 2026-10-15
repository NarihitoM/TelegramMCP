import { createHash, timingSafeEqual } from "node:crypto";

const VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
const CHALLENGE_PATTERN = /^[A-Za-z0-9\-_]{43}$/;

export function isValidChallenge(challenge: string): boolean {
  return CHALLENGE_PATTERN.test(challenge);
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!VERIFIER_PATTERN.test(verifier)) return false;

  const expected = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const actual = Buffer.from(challenge);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

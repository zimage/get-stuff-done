import { createHash, randomBytes } from "node:crypto";

// A distinct, greppable prefix (unlike a raw refresh token or a JWT access
// token) so incoming Authorization headers can be routed to the right
// verification path without any ambiguity or fragile heuristics.
const API_TOKEN_PREFIX = "gsd_pat_";

export interface IssuedApiToken {
  /** The raw token to show the user once — never stored. */
  token: string;
  /** SHA-256 hex digest to persist/look up instead of the raw token. */
  tokenHash: string;
  /** Last 4 characters, safe to display so the user can tell tokens apart. */
  tokenPreview: string;
}

export function issueApiToken(): IssuedApiToken {
  const secret = randomBytes(24).toString("hex");
  const token = `${API_TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashApiToken(token),
    tokenPreview: secret.slice(-4),
  };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeApiToken(value: string): boolean {
  return value.startsWith(API_TOKEN_PREFIX);
}

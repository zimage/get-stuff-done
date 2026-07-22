import { createHash, randomBytes } from "node:crypto";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface IssuedRefreshToken {
  /** The raw token to hand back to the client — never stored. */
  token: string;
  /** SHA-256 hex digest to persist/look up instead of the raw token. */
  tokenHash: string;
  expiresAt: Date;
}

export function issueRefreshToken(): IssuedRefreshToken {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

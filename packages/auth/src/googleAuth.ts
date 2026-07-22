import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * Verifies a Google-issued ID token (signature, audience, issuer) and returns
 * the identity claims we care about. Throws if the token is invalid/expired
 * or wasn't issued for our client ID.
 */
export async function verifyGoogleIdToken(idToken: string, googleClientId: string): Promise<GoogleIdentity> {
  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Google ID token payload is missing required claims");
  }
  return {
    googleSub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null,
  };
}

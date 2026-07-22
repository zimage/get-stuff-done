import { jwtVerify, SignJWT } from "jose";

export interface AccessTokenPayload {
  userId: string;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export async function signAccessToken(payload: AccessTokenPayload, secret: string): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  if (typeof payload.userId !== "string") {
    throw new Error("Access token payload is missing userId");
  }
  return { userId: payload.userId };
}

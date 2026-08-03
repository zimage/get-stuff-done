import "@fastify/cookie";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { hashApiToken, looksLikeApiToken, verifyAccessToken } from "@gsd/auth";
import { prisma } from "@gsd/db";

const REFRESH_TOKEN_COOKIE = "refreshToken";
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Personal access tokens (prefix `gsd_pat_`) authenticate directly against
 * the API — no browser session/cookie involved. They're long-lived and only
 * ever compared by hash, same pattern as refresh tokens.
 */
async function resolveUserIdFromApiToken(token: string): Promise<string | null> {
  const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash: hashApiToken(token) } });
  if (!apiToken || apiToken.revokedAt) return null;

  // Best-effort, non-blocking — a slow/failed write here shouldn't fail the request.
  prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return apiToken.userId;
}

async function resolveUserFromAuthHeader(authHeader: string | null | undefined) {
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    if (looksLikeApiToken(token)) {
      userId = await resolveUserIdFromApiToken(token);
    } else {
      try {
        const payload = await verifyAccessToken(token, process.env.JWT_SECRET ?? "");
        userId = payload.userId;
      } catch {
        userId = null;
      }
    }
  }

  return userId ? prisma.user.findUnique({ where: { id: userId } }) : null;
}

// Context exposes only plain-data cookie accessors — never the raw Fastify
// req/res — so the inferred AppRouter type stays framework-agnostic and
// portable across the workspace boundary (a leaked FastifyRequest/FastifyReply
// type breaks TS's "inferred type cannot be named" check for consumers like
// apps/web that don't depend on fastify directly).
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = await resolveUserFromAuthHeader(req.headers.authorization);

  return {
    prisma,
    user,
    getRefreshTokenCookie: (): string | undefined => req.cookies?.[REFRESH_TOKEN_COOKIE],
    setRefreshTokenCookie: (token: string): void => {
      res.setCookie(REFRESH_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
      });
    },
    clearRefreshTokenCookie: (): void => {
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Used by the REST/OpenAPI surface (see apps/api), which bridges through a
// Fetch API Request rather than a Fastify req/res pair. Direct API clients
// authenticate with a bearer token, not a browser cookie jar, so refresh
// token access mirrors the existing "mobile" fallback: body-only, no cookie.
export async function createRestContext({ req }: { req: Request }): Promise<Context> {
  const user = await resolveUserFromAuthHeader(req.headers.get("authorization"));

  return {
    prisma,
    user,
    getRefreshTokenCookie: () => undefined,
    setRefreshTokenCookie: () => {},
    clearRefreshTokenCookie: () => {},
  };
}

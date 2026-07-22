import "@fastify/cookie";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyAccessToken } from "@gsd/auth";
import { prisma } from "@gsd/db";

const REFRESH_TOKEN_COOKIE = "refreshToken";
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Context exposes only plain-data cookie accessors — never the raw Fastify
// req/res — so the inferred AppRouter type stays framework-agnostic and
// portable across the workspace boundary (a leaked FastifyRequest/FastifyReply
// type breaks TS's "inferred type cannot be named" check for consumers like
// apps/web that don't depend on fastify directly).
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice("Bearer ".length), process.env.JWT_SECRET ?? "");
      userId = payload.userId;
    } catch {
      userId = null;
    }
  }

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

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

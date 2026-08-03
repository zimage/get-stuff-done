import { TRPCError } from "@trpc/server";
import {
  hashRefreshToken,
  issueRefreshToken,
  signAccessToken,
  verifyGoogleIdToken,
} from "@gsd/auth";
import type { PrismaClient, User } from "@gsd/db";
import {
  loginWithGoogleInputSchema,
  publicUserOutputSchema,
  refreshInputSchema,
  sessionOutputSchema,
  successOutputSchema,
} from "@gsd/validation";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

// Excludes googleSub — an internal identifier the client never needs.
function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    familyId: user.familyId,
  };
}

async function issueSessionForUser(prisma: PrismaClient, userId: string) {
  const accessToken = await signAccessToken({ userId }, JWT_SECRET);
  const refresh = issueRefreshToken();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt },
  });
  return { accessToken, refreshToken: refresh.token };
}

export const authRouter = router({
  loginWithGoogle: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/login/google", tags: ["auth"], protect: false } })
    .input(loginWithGoogleInputSchema)
    .output(sessionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const identity = await verifyGoogleIdToken(input.idToken, GOOGLE_CLIENT_ID);
      const user = await ctx.prisma.user.upsert({
        where: { googleSub: identity.googleSub },
        update: { email: identity.email, name: identity.name, avatarUrl: identity.avatarUrl },
        create: {
          googleSub: identity.googleSub,
          email: identity.email,
          name: identity.name,
          avatarUrl: identity.avatarUrl,
        },
      });
      const session = await issueSessionForUser(ctx.prisma, user.id);
      ctx.setRefreshTokenCookie(session.refreshToken);
      return { user: toPublicUser(user), ...session };
    }),

  // `refreshToken` comes from the request body on mobile (no cookie jar) or
  // from the httpOnly cookie on web (JS can't read it, so the client can't
  // pass it explicitly there).
  refresh: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/refresh", tags: ["auth"], protect: false } })
    .input(refreshInputSchema)
    .output(sessionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const token = input.refreshToken ?? ctx.getRefreshTokenCookie();
      if (!token) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "No refresh token provided" });
      }
      const tokenHash = hashRefreshToken(token);
      const existing = await ctx.prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired refresh token" });
      }
      await ctx.prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
      const user = await ctx.prisma.user.findUnique({ where: { id: existing.userId } });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User no longer exists" });
      }
      const session = await issueSessionForUser(ctx.prisma, existing.userId);
      ctx.setRefreshTokenCookie(session.refreshToken);
      return { user: toPublicUser(user), ...session };
    }),

  logout: publicProcedure
    .meta({ openapi: { method: "POST", path: "/auth/logout", tags: ["auth"], protect: false } })
    .input(refreshInputSchema)
    .output(successOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const token = input.refreshToken ?? ctx.getRefreshTokenCookie();
      if (token) {
        const tokenHash = hashRefreshToken(token);
        await ctx.prisma.refreshToken.updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      ctx.clearRefreshTokenCookie();
      return { success: true };
    }),

  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/auth/me", tags: ["auth"], protect: true } })
    .input(z.object({}))
    .output(publicUserOutputSchema)
    .query(({ ctx }) => toPublicUser(ctx.user)),
});

import { TRPCError } from "@trpc/server";
import { issueApiToken } from "@gsd/auth";
import {
  apiTokenCreatedOutputSchema,
  apiTokenOutputSchema,
  createApiTokenInputSchema,
  successOutputSchema,
} from "@gsd/validation";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";

const idInput = z.object({ id: z.string().min(1) });

const REDACTED_SELECT = {
  id: true,
  name: true,
  tokenPreview: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

export const apiTokensRouter = router({
  // Never selects tokenHash — the raw token is unrecoverable after creation.
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/api-tokens", tags: ["api-tokens"], protect: true } })
    .input(z.object({}))
    .output(z.array(apiTokenOutputSchema))
    .query(async ({ ctx }) => {
      return ctx.prisma.apiToken.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        select: REDACTED_SELECT,
      });
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/api-tokens", tags: ["api-tokens"], protect: true } })
    .input(createApiTokenInputSchema)
    .output(apiTokenCreatedOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const issued = issueApiToken();
      const record = await ctx.prisma.apiToken.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          tokenHash: issued.tokenHash,
          tokenPreview: issued.tokenPreview,
        },
        select: REDACTED_SELECT,
      });
      // The only time the raw token is ever returned — the caller must save it now.
      return { ...record, token: issued.token };
    }),

  revoke: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/api-tokens/{id}/revoke", tags: ["api-tokens"], protect: true } })
    .input(idInput)
    .output(successOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.apiToken.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.prisma.apiToken.update({ where: { id: input.id }, data: { revokedAt: new Date() } });
      return { success: true };
    }),
});

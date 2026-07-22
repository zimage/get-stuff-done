import { TRPCError } from "@trpc/server";
import { canWriteTag } from "@gsd/domain";
import { createTagInputSchema, tagStatusSchema, updateTagInputSchema } from "@gsd/validation";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";

const idInput = z.object({ id: z.string().min(1) });

export const tagsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: tagStatusSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { ownerId: ctx.user.id };
      if (input?.status) where.status = input.status;

      return ctx.prisma.tag.findMany({ where, orderBy: { title: "asc" } });
    }),

  create: protectedProcedure.input(createTagInputSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.tag.create({ data: { ...input, ownerId: ctx.user.id } });
  }),

  update: protectedProcedure.input(updateTagInputSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteTag(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    return ctx.prisma.tag.update({ where: { id }, data });
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.tag.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteTag(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    await ctx.prisma.tag.delete({ where: { id: input.id } });
    return { success: true };
  }),
});

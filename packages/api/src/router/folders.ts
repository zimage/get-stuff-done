import { TRPCError } from "@trpc/server";
import { canWriteFolder } from "@gsd/domain";
import { createFolderInputSchema, updateFolderInputSchema } from "@gsd/validation";
import { z } from "zod";
import type { Context } from "../context.js";
import { protectedProcedure, router } from "../trpc.js";

const idInput = z.object({ id: z.string().min(1) });

type AuthedContext = Context & { user: NonNullable<Context["user"]> };

/** Appends to the end of the (ownerId, parentFolderId) sibling group. */
async function nextSortOrder(ctx: AuthedContext, parentFolderId: string | null): Promise<number> {
  const result = await ctx.prisma.folder.aggregate({
    where: { ownerId: ctx.user.id, parentFolderId },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

export const foldersRouter = router({
  // Flat, owner-scoped — the client builds the nested tree from parentFolderId.
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.folder.findMany({
      where: { ownerId: ctx.user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }),

  create: protectedProcedure.input(createFolderInputSchema).mutation(async ({ ctx, input }) => {
    if (input.parentFolderId) {
      const parent = await ctx.prisma.folder.findUnique({ where: { id: input.parentFolderId } });
      if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent folder not found" });
      if (!canWriteFolder(parent, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { sortOrder, ...data } = input;
    const resolvedSortOrder = sortOrder ?? (await nextSortOrder(ctx, data.parentFolderId ?? null));

    return ctx.prisma.folder.create({
      data: { ...data, sortOrder: resolvedSortOrder, ownerId: ctx.user.id },
    });
  }),

  update: protectedProcedure.input(updateFolderInputSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.folder.findUnique({ where: { id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteFolder(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    if (data.parentFolderId) {
      if (data.parentFolderId === id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A folder cannot be its own parent" });
      }
      const parent = await ctx.prisma.folder.findUnique({ where: { id: data.parentFolderId } });
      if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent folder not found" });
      if (!canWriteFolder(parent, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.prisma.folder.update({ where: { id }, data });
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.folder.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteFolder(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    // Sub-folders and projects are un-filed (parentFolderId/folderId -> null
    // via onDelete: SetNull), not deleted.
    await ctx.prisma.folder.delete({ where: { id: input.id } });
    return { success: true };
  }),
});

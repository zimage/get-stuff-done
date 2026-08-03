import { TRPCError } from "@trpc/server";
import { canWriteFolder } from "@gsd/domain";
import {
  createFolderInputSchema,
  folderOutputSchema,
  successOutputSchema,
  updateFolderInputSchema,
} from "@gsd/validation";
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

/** Walks up from newParentId to the root, rejecting if it ever reaches folderId (a cycle). */
async function assertNoCycle(ctx: AuthedContext, folderId: string, newParentId: string) {
  let currentId: string | null = newParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === folderId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot move a folder inside its own descendant" });
    }
    if (visited.has(currentId)) break; // corrupt data guard, not a real cycle
    visited.add(currentId);
    const current: { parentFolderId: string | null } | null = await ctx.prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentFolderId: true },
    });
    currentId = current?.parentFolderId ?? null;
  }
}

export const foldersRouter = router({
  // Flat, owner-scoped — the client builds the nested tree from parentFolderId.
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/folders", tags: ["folders"], protect: true } })
    .input(z.object({}))
    .output(z.array(folderOutputSchema))
    .query(async ({ ctx }) => {
      return ctx.prisma.folder.findMany({
        where: { ownerId: ctx.user.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/folders", tags: ["folders"], protect: true } })
    .input(createFolderInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ ctx, input }) => {
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

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/folders/{id}", tags: ["folders"], protect: true } })
    .input(updateFolderInputSchema)
    .output(folderOutputSchema)
    .mutation(async ({ ctx, input }) => {
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
        await assertNoCycle(ctx, id, data.parentFolderId);
      }

      return ctx.prisma.folder.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/folders/{id}", tags: ["folders"], protect: true } })
    .input(idInput)
    .output(successOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.folder.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteFolder(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      // Sub-folders and projects are un-filed (parentFolderId/folderId -> null
      // via onDelete: SetNull), not deleted.
      await ctx.prisma.folder.delete({ where: { id: input.id } });
      return { success: true };
    }),
});

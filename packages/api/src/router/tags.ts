import { TRPCError } from "@trpc/server";
import { canWriteTag } from "@gsd/domain";
import {
  createTagInputSchema,
  successOutputSchema,
  tagOutputSchema,
  tagStatusSchema,
  updateTagInputSchema,
} from "@gsd/validation";
import { z } from "zod";
import type { Context } from "../context.js";
import { protectedProcedure, router } from "../trpc.js";

const idInput = z.object({ id: z.string().min(1) });

type AuthedContext = Context & { user: NonNullable<Context["user"]> };

async function assertParentTagIsWritable(ctx: AuthedContext, parentTagId: string) {
  const parent = await ctx.prisma.tag.findUnique({ where: { id: parentTagId } });
  if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent tag not found" });
  if (!canWriteTag(parent, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
}

/** Walks up from newParentId to the root, rejecting if it ever reaches tagId (a cycle). */
async function assertNoCycle(ctx: AuthedContext, tagId: string, newParentId: string) {
  let currentId: string | null = newParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === tagId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot move a tag inside its own descendant" });
    }
    if (visited.has(currentId)) break; // corrupt data guard, not a real cycle
    visited.add(currentId);
    const current: { parentTagId: string | null } | null = await ctx.prisma.tag.findUnique({
      where: { id: currentId },
      select: { parentTagId: true },
    });
    currentId = current?.parentTagId ?? null;
  }
}

export const tagsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/tags", tags: ["tags"], protect: true } })
    .input(z.object({ status: tagStatusSchema.optional() }))
    .output(z.array(tagOutputSchema))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { ownerId: ctx.user.id };
      if (input.status) where.status = input.status;

      return ctx.prisma.tag.findMany({ where, orderBy: { title: "asc" } });
    }),

  // Fetch a single tag by id — used by the Inspector.
  get: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/tags/{id}", tags: ["tags"], protect: true } })
    .input(idInput)
    .output(tagOutputSchema)
    .query(async ({ ctx, input }) => {
      const tag = await ctx.prisma.tag.findFirst({ where: { id: input.id, ownerId: ctx.user.id } });
      if (!tag) throw new TRPCError({ code: "NOT_FOUND" });
      return tag;
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/tags", tags: ["tags"], protect: true } })
    .input(createTagInputSchema)
    .output(tagOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.parentTagId) await assertParentTagIsWritable(ctx, input.parentTagId);
      return ctx.prisma.tag.create({ data: { ...input, ownerId: ctx.user.id } });
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/tags/{id}", tags: ["tags"], protect: true } })
    .input(updateTagInputSchema)
    .output(tagOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.prisma.tag.findUnique({ where: { id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteTag(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      if (data.parentTagId) {
        if (data.parentTagId === id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A tag cannot be its own parent" });
        }
        await assertParentTagIsWritable(ctx, data.parentTagId);
        await assertNoCycle(ctx, id, data.parentTagId);
      }

      return ctx.prisma.tag.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/tags/{id}", tags: ["tags"], protect: true } })
    .input(idInput)
    .output(successOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.tag.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteTag(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.prisma.tag.delete({ where: { id: input.id } });
      return { success: true };
    }),
});

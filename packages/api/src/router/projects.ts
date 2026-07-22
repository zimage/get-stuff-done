import { TRPCError } from "@trpc/server";
import {
  canReviewProject,
  canWriteFolder,
  canWriteProject,
  computeActionable,
  computeNextReviewDate,
  visibleProjectsWhere,
} from "@gsd/domain";
import { createProjectInputSchema, projectStatusSchema, updateProjectInputSchema } from "@gsd/validation";
import { z } from "zod";
import type { Context } from "../context.js";
import { protectedProcedure, router } from "../trpc.js";

const idInput = z.object({ id: z.string().min(1) });

type AuthedContext = Context & { user: NonNullable<Context["user"]> };

async function assertFolderIsWritable(ctx: AuthedContext, folderId: string) {
  const folder = await ctx.prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
  if (!canWriteFolder(folder, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
}

export const projectsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: projectStatusSchema.optional(),
          flagged: z.boolean().optional(),
          // Projects with a reviewDate in the past — for the Review tab.
          // Restricted to active/on_hold projects unless a status filter is
          // explicitly given (a completed/dropped project doesn't need review).
          dueForReview: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { ...visibleProjectsWhere(ctx.user.id) };
      if (input?.status) where.status = input.status;
      if (input?.flagged !== undefined) where.flagged = input.flagged;
      if (input?.dueForReview) {
        where.reviewDate = { lte: new Date() };
        if (!input.status) where.status = { in: ["active", "on_hold"] };
      }

      return ctx.prisma.project.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        include: {
          tags: { include: { tag: true } },
          _count: { select: { actions: { where: { status: "active" } } } },
        },
      });
    }),

  get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const project = await ctx.prisma.project.findFirst({
      where: { id: input.id, ...visibleProjectsWhere(ctx.user.id) },
      include: { tags: { include: { tag: true } } },
    });
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });

    const actions = await ctx.prisma.action.findMany({
      where: { projectId: project.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { tags: { include: { tag: true } } },
    });

    const actionableActionIds = Array.from(computeActionable(actions, project.type));

    return { project, actions, actionableActionIds };
  }),

  create: protectedProcedure.input(createProjectInputSchema).mutation(async ({ ctx, input }) => {
    const { tagIds, ...data } = input;
    if (data.folderId) await assertFolderIsWritable(ctx, data.folderId);

    return ctx.prisma.project.create({
      data: {
        ...data,
        ownerId: ctx.user.id,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
  }),

  update: protectedProcedure.input(updateProjectInputSchema).mutation(async ({ ctx, input }) => {
    const { id, tagIds, ...data } = input;
    const existing = await ctx.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteProject(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
    if (data.folderId !== undefined && data.folderId !== null) await assertFolderIsWritable(ctx, data.folderId);

    return ctx.prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(tagIds ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      include: { tags: { include: { tag: true } } },
    });
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.project.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteProject(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    await ctx.prisma.project.delete({ where: { id: input.id } });
    return { success: true };
  }),

  markReviewed: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.project.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canReviewProject(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    const reviewedAt = new Date();
    const reviewDate = computeNextReviewDate(reviewedAt, existing.reviewIntervalCount, existing.reviewIntervalUnit);

    return ctx.prisma.project.update({
      where: { id: input.id },
      data: { lastReviewedAt: reviewedAt, reviewDate },
      include: { tags: { include: { tag: true } } },
    });
  }),
});

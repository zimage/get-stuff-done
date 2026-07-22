import { TRPCError } from "@trpc/server";
import { canWriteAction, canWriteProject, computeNextOccurrenceDates, visibleActionsWhere } from "@gsd/domain";
import { actionStatusSchema, createActionInputSchema, updateActionInputSchema } from "@gsd/validation";
import { z } from "zod";
import type { Context } from "../context.js";
import { protectedProcedure, router } from "../trpc.js";

const idInput = z.object({ id: z.string().min(1) });

type AuthedContext = Context & { user: NonNullable<Context["user"]> };

async function assertProjectIsWritable(ctx: AuthedContext, projectId: string) {
  const project = await ctx.prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  if (!canWriteProject(project, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
}

async function assertParentActionIsWritable(ctx: AuthedContext, parentActionId: string) {
  const parent = await ctx.prisma.action.findUnique({ where: { id: parentActionId } });
  if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent action not found" });
  if (!canWriteAction(parent, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
}

/** Appends to the end of the (projectId, parentActionId) sibling group. */
async function nextSortOrder(ctx: AuthedContext, projectId: string | null, parentActionId: string | null): Promise<number> {
  const result = await ctx.prisma.action.aggregate({
    where: { projectId, parentActionId },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

export const actionsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().min(1).nullable().optional(),
          status: actionStatusSchema.optional(),
          flagged: z.boolean().optional(),
          tagId: z.string().min(1).optional(),
          untagged: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { ...visibleActionsWhere(ctx.user.id) };
      if (input?.projectId !== undefined) where.projectId = input.projectId;
      if (input?.status) where.status = input.status;
      if (input?.flagged !== undefined) where.flagged = input.flagged;
      if (input?.tagId) where.tags = { some: { tagId: input.tagId } };
      if (input?.untagged) where.tags = { none: {} };

      return ctx.prisma.action.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { tags: { include: { tag: true } } },
      });
    }),

  // Actions with at least one of defer/planned/due set, sorted by whichever
  // of those is earliest — sorting across three nullable columns isn't a
  // single Prisma orderBy, so it's computed in JS over the (small) result set.
  calendar: protectedProcedure.query(async ({ ctx }) => {
    const actions = await ctx.prisma.action.findMany({
      where: {
        AND: [
          visibleActionsWhere(ctx.user.id),
          { status: "active" },
          {
            OR: [
              { deferredDate: { not: null } },
              { plannedDate: { not: null } },
              { dueDate: { not: null } },
            ],
          },
        ],
      },
      include: { tags: { include: { tag: true } } },
    });

    function earliestDate(action: (typeof actions)[number]): number {
      const dates = [action.deferredDate, action.plannedDate, action.dueDate].filter(
        (d): d is Date => d != null,
      );
      return Math.min(...dates.map((d) => d.getTime()));
    }

    return actions.sort((a, b) => earliestDate(a) - earliestDate(b));
  }),

  // All actions regardless of status, most-recently-touched first — the
  // "Changed" perspective.
  changed: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.action.findMany({
      where: visibleActionsWhere(ctx.user.id),
      orderBy: { updatedAt: "desc" },
      include: { tags: { include: { tag: true } } },
    });
  }),

  create: protectedProcedure.input(createActionInputSchema).mutation(async ({ ctx, input }) => {
    const { tagIds, sortOrder, ...data } = input;

    if (data.projectId) await assertProjectIsWritable(ctx, data.projectId);
    if (data.parentActionId) await assertParentActionIsWritable(ctx, data.parentActionId);

    const resolvedSortOrder = sortOrder ?? (await nextSortOrder(ctx, data.projectId ?? null, data.parentActionId ?? null));

    return ctx.prisma.action.create({
      data: {
        ...data,
        sortOrder: resolvedSortOrder,
        createdById: ctx.user.id,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
  }),

  update: protectedProcedure.input(updateActionInputSchema).mutation(async ({ ctx, input }) => {
    const { id, tagIds, ...data } = input;
    const existing = await ctx.prisma.action.findUnique({ where: { id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    if (data.projectId !== undefined && data.projectId !== null) await assertProjectIsWritable(ctx, data.projectId);
    if (data.parentActionId !== undefined && data.parentActionId !== null) {
      await assertParentActionIsWritable(ctx, data.parentActionId);
    }

    return ctx.prisma.action.update({
      where: { id },
      data: {
        ...data,
        ...(tagIds ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      include: { tags: { include: { tag: true } } },
    });
  }),

  complete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.action.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    const completedAt = new Date();
    const completed = await ctx.prisma.action.update({
      where: { id: input.id },
      data: { status: "completed", completedAt },
    });

    if (existing.repeats && existing.recurrenceInterval && existing.recurrenceFrequency && existing.recurrenceSchedule) {
      const nextDates = computeNextOccurrenceDates(
        { deferredDate: existing.deferredDate, plannedDate: existing.plannedDate, dueDate: existing.dueDate },
        {
          interval: existing.recurrenceInterval,
          frequency: existing.recurrenceFrequency,
          schedule: existing.recurrenceSchedule,
          catchUpAutomatically: existing.recurrenceCatchUpAutomatically,
          basedOn: existing.recurrenceBasedOn,
        },
        completedAt,
      );

      const existingTags = await ctx.prisma.actionTag.findMany({ where: { actionId: existing.id } });

      await ctx.prisma.action.create({
        data: {
          title: existing.title,
          note: existing.note,
          projectId: existing.projectId,
          parentActionId: existing.parentActionId,
          status: "active",
          flagged: existing.flagged,
          deferredDate: nextDates.deferredDate,
          plannedDate: nextDates.plannedDate,
          dueDate: nextDates.dueDate,
          sortOrder: existing.sortOrder,
          repeats: true,
          recurrenceInterval: existing.recurrenceInterval,
          recurrenceFrequency: existing.recurrenceFrequency,
          recurrenceSchedule: existing.recurrenceSchedule,
          recurrenceCatchUpAutomatically: existing.recurrenceCatchUpAutomatically,
          recurrenceBasedOn: existing.recurrenceBasedOn,
          previousOccurrenceId: existing.id,
          createdById: existing.createdById,
          assignedToId: existing.assignedToId,
          tags: existingTags.length
            ? { create: existingTags.map((t) => ({ tagId: t.tagId })) }
            : undefined,
        },
      });
    }

    return completed;
  }),

  drop: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.action.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    return ctx.prisma.action.update({ where: { id: input.id }, data: { status: "dropped" } });
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.action.findUnique({ where: { id: input.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

    await ctx.prisma.action.delete({ where: { id: input.id } });
    return { success: true };
  }),
});

import { TRPCError } from "@trpc/server";
import type { Action } from "@gsd/db";
import { canWriteAction, canWriteProject, computeNextOccurrenceDates, visibleActionsWhere } from "@gsd/domain";
import {
  actionOutputSchema,
  actionStatusSchema,
  actionWithChildCountOutputSchema,
  createActionInputSchema,
  successOutputSchema,
  updateActionInputSchema,
} from "@gsd/validation";
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

/** Marks a project "changed" when one of its actions is added/edited/removed. */
async function touchProject(ctx: AuthedContext, projectId: string) {
  await ctx.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
}

/**
 * Call when an action's status has just transitioned to "completed". Touches
 * the project, and — if completeWithLastAction is on and no active actions
 * remain in the project — marks the project itself completed. A repeating
 * action's completion first clones a fresh active occurrence into the same
 * project (see `complete` below), so that occurrence is counted here too:
 * the project correctly stays open as long as there's a next occurrence.
 */
async function touchProjectAndMaybeAutoComplete(ctx: AuthedContext, projectId: string) {
  const project = await ctx.prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const remainingActive = await ctx.prisma.action.count({ where: { projectId, status: "active" } });
  const shouldAutoComplete =
    project.completeWithLastAction && project.status !== "completed" && remainingActive === 0;

  await ctx.prisma.project.update({
    where: { id: projectId },
    data: shouldAutoComplete ? { status: "completed", updatedAt: new Date() } : { updatedAt: new Date() },
  });
}

/**
 * Call when an action's status has just transitioned to "completed", before
 * touching the project. Walks up the parentActionId chain: a parent with
 * completeWithLastAction on and no remaining active children is itself
 * marked completed, then its own parent is checked the same way, and so on.
 * Stops at the first parent that doesn't auto-complete — that parent is
 * still active, so nothing further up needs to change.
 */
async function touchParentActionsAndMaybeAutoComplete(ctx: AuthedContext, parentActionId: string) {
  let currentParentId: string | null = parentActionId;

  while (currentParentId) {
    const parent: Action | null = await ctx.prisma.action.findUnique({ where: { id: currentParentId } });
    if (!parent) break;

    const remainingActiveChildren = await ctx.prisma.action.count({
      where: { parentActionId: currentParentId, status: "active" },
    });
    const shouldAutoComplete =
      parent.completeWithLastAction && parent.status !== "completed" && remainingActiveChildren === 0;
    if (!shouldAutoComplete) break;

    await ctx.prisma.action.update({
      where: { id: currentParentId },
      data: { status: "completed", completedAt: new Date() },
    });
    currentParentId = parent.parentActionId;
  }
}

export const actionsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/actions", tags: ["actions"], protect: true } })
    .input(
      z.object({
        projectId: z.string().min(1).nullable().optional(),
        status: actionStatusSchema.optional(),
        flagged: z.boolean().optional(),
        tagId: z.string().min(1).optional(),
        untagged: z.boolean().optional(),
      }),
    )
    .output(z.array(actionOutputSchema))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { ...visibleActionsWhere(ctx.user.id) };
      if (input.projectId !== undefined) where.projectId = input.projectId;
      if (input.status) where.status = input.status;
      if (input.flagged !== undefined) where.flagged = input.flagged;
      if (input.tagId) where.tags = { some: { tagId: input.tagId } };
      if (input.untagged) where.tags = { none: {} };

      return ctx.prisma.action.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { tags: { include: { tag: true } } },
      });
    }),

  // Actions with at least one of defer/planned/due set, sorted by whichever
  // of those is earliest — sorting across three nullable columns isn't a
  // single Prisma orderBy, so it's computed in JS over the (small) result set.
  calendar: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/actions/calendar", tags: ["actions"], protect: true } })
    .input(z.object({}))
    .output(z.array(actionOutputSchema))
    .query(async ({ ctx }) => {
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
  changed: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/actions/changed", tags: ["actions"], protect: true } })
    .input(z.object({}))
    .output(z.array(actionOutputSchema))
    .query(async ({ ctx }) => {
      return ctx.prisma.action.findMany({
        where: visibleActionsWhere(ctx.user.id),
        orderBy: { updatedAt: "desc" },
        include: { tags: { include: { tag: true } } },
      });
    }),

  // Fetch a single action by id — used by the Inspector, which needs the
  // selected action's current data independent of whatever list is rendered.
  get: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/actions/{id}", tags: ["actions"], protect: true } })
    .input(idInput)
    .output(actionWithChildCountOutputSchema)
    .query(async ({ ctx, input }) => {
      const action = await ctx.prisma.action.findFirst({
        where: { id: input.id, ...visibleActionsWhere(ctx.user.id) },
        include: { tags: { include: { tag: true } }, _count: { select: { children: true } } },
      });
      if (!action) throw new TRPCError({ code: "NOT_FOUND" });
      return action;
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/actions", tags: ["actions"], protect: true } })
    .input(createActionInputSchema)
    .output(actionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { tagIds, sortOrder, ...data } = input;

      if (data.projectId) await assertProjectIsWritable(ctx, data.projectId);
      if (data.parentActionId) await assertParentActionIsWritable(ctx, data.parentActionId);

      const resolvedSortOrder =
        sortOrder ?? (await nextSortOrder(ctx, data.projectId ?? null, data.parentActionId ?? null));

      const created = await ctx.prisma.action.create({
        data: {
          ...data,
          sortOrder: resolvedSortOrder,
          createdById: ctx.user.id,
          tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
        },
        include: { tags: { include: { tag: true } } },
      });

      if (created.projectId) {
        if (created.status === "completed") {
          await touchProjectAndMaybeAutoComplete(ctx, created.projectId);
        } else {
          await touchProject(ctx, created.projectId);
        }
      }

      return created;
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/actions/{id}", tags: ["actions"], protect: true } })
    .input(updateActionInputSchema)
    .output(actionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tagIds, ...data } = input;
      const existing = await ctx.prisma.action.findUnique({ where: { id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      if (data.projectId !== undefined && data.projectId !== null) await assertProjectIsWritable(ctx, data.projectId);
      if (data.parentActionId !== undefined && data.parentActionId !== null) {
        await assertParentActionIsWritable(ctx, data.parentActionId);
      }

      const updated = await ctx.prisma.action.update({
        where: { id },
        data: {
          ...data,
          ...(tagIds ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } } : {}),
        },
        include: { tags: { include: { tag: true } } },
      });

      const becameCompleted = existing.status !== "completed" && updated.status === "completed";
      if (existing.projectId && existing.projectId !== updated.projectId) {
        await touchProject(ctx, existing.projectId);
      }
      if (updated.projectId) {
        if (becameCompleted) {
          await touchProjectAndMaybeAutoComplete(ctx, updated.projectId);
        } else {
          await touchProject(ctx, updated.projectId);
        }
      }

      return updated;
    }),

  complete: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/actions/{id}/complete", tags: ["actions"], protect: true } })
    .input(idInput)
    .output(actionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.action.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      const completedAt = new Date();
      const completed = await ctx.prisma.action.update({
        where: { id: input.id },
        data: { status: "completed", completedAt },
        include: { tags: { include: { tag: true } } },
      });

      if (
        existing.repeats &&
        existing.recurrenceInterval &&
        existing.recurrenceFrequency &&
        existing.recurrenceSchedule
      ) {
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
            durationMinutes: existing.durationMinutes,
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

      if (existing.parentActionId) {
        await touchParentActionsAndMaybeAutoComplete(ctx, existing.parentActionId);
      }
      if (existing.projectId) {
        await touchProjectAndMaybeAutoComplete(ctx, existing.projectId);
      }

      return completed;
    }),

  drop: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/actions/{id}/drop", tags: ["actions"], protect: true } })
    .input(idInput)
    .output(actionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.action.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      const dropped = await ctx.prisma.action.update({
        where: { id: input.id },
        data: { status: "dropped" },
        include: { tags: { include: { tag: true } } },
      });
      if (existing.projectId) await touchProject(ctx, existing.projectId);
      return dropped;
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/actions/{id}", tags: ["actions"], protect: true } })
    .input(idInput)
    .output(successOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.action.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canWriteAction(existing, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.prisma.action.delete({ where: { id: input.id } });
      if (existing.projectId) await touchProject(ctx, existing.projectId);
      return { success: true };
    }),
});

import { z } from "zod";
import {
  actionStatusSchema,
  recurrenceBasedOnSchema,
  recurrenceFrequencySchema,
  recurrenceScheduleSchema,
} from "./enums.js";

const cuid = z.string().min(1);

const actionShape = {
  title: z.string().min(1).max(500),
  note: z.string().max(20000).nullable().optional(),
  projectId: cuid.nullable().optional(),
  parentActionId: cuid.nullable().optional(),
  status: actionStatusSchema.default("active"),
  flagged: z.boolean().default(false),
  deferredDate: z.coerce.date().nullable().optional(),
  plannedDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  // No default: omitted means "append to the end of its sibling group",
  // computed server-side (see actions.create) rather than always tying at 0.
  sortOrder: z.number().int().optional(),
  repeats: z.boolean().default(false),
  recurrenceInterval: z.number().int().positive().nullable().optional(),
  recurrenceFrequency: recurrenceFrequencySchema.nullable().optional(),
  recurrenceSchedule: recurrenceScheduleSchema.nullable().optional(),
  recurrenceCatchUpAutomatically: z.boolean().default(false),
  recurrenceBasedOn: recurrenceBasedOnSchema.nullable().optional(),
  assignedToId: cuid.nullable().optional(),
  tagIds: z.array(cuid).default([]),
};

/**
 * Mirrors the recurrence rules from the domain design: repeating actions need
 * an interval/frequency/schedule, at least one anchor date, and — for
 * from_completion schedules — the named basedOn date must actually be set.
 */
function validateRecurrence(
  data: {
    repeats?: boolean;
    recurrenceInterval?: number | null;
    recurrenceFrequency?: string | null;
    recurrenceSchedule?: string | null;
    recurrenceBasedOn?: string | null;
    deferredDate?: Date | null;
    plannedDate?: Date | null;
    dueDate?: Date | null;
  },
  ctx: z.RefinementCtx,
) {
  if (!data.repeats) return;

  if (data.recurrenceInterval == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceInterval"],
      message: "recurrenceInterval is required when repeats is true",
    });
  }
  if (!data.recurrenceFrequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceFrequency"],
      message: "recurrenceFrequency is required when repeats is true",
    });
  }
  if (!data.recurrenceSchedule) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceSchedule"],
      message: "recurrenceSchedule is required when repeats is true",
    });
  }

  const hasAnchorDate = data.deferredDate != null || data.plannedDate != null || data.dueDate != null;
  if (!hasAnchorDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "a repeating action needs at least one of deferredDate, plannedDate, or dueDate set as an anchor",
    });
  }

  if (data.recurrenceSchedule === "from_completion") {
    if (!data.recurrenceBasedOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceBasedOn"],
        message: "recurrenceBasedOn is required when recurrenceSchedule is from_completion",
      });
      return;
    }
    const basedOnDate =
      data.recurrenceBasedOn === "defer_date"
        ? data.deferredDate
        : data.recurrenceBasedOn === "planned_date"
          ? data.plannedDate
          : data.dueDate;
    if (basedOnDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceBasedOn"],
        message: "the date field named by recurrenceBasedOn must be set on the action",
      });
    }
  }
}

export const createActionInputSchema = z.object(actionShape).superRefine(validateRecurrence);
export type CreateActionInput = z.infer<typeof createActionInputSchema>;

export const updateActionInputSchema = z
  .object(actionShape)
  .partial()
  .extend({ id: cuid })
  .superRefine(validateRecurrence);
export type UpdateActionInput = z.infer<typeof updateActionInputSchema>;

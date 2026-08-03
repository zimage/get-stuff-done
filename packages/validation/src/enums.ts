import { z } from "zod";

export const actionStatusSchema = z.enum(["active", "completed", "dropped"]);
export type ActionStatusInput = z.infer<typeof actionStatusSchema>;

export const actionTypeSchema = z.enum(["parallel", "sequential"]);
export type ActionTypeInput = z.infer<typeof actionTypeSchema>;

export const projectStatusSchema = z.enum(["active", "on_hold", "completed", "dropped"]);
export type ProjectStatusInput = z.infer<typeof projectStatusSchema>;

export const projectTypeSchema = z.enum(["parallel", "sequential", "single_actions"]);
export type ProjectTypeInput = z.infer<typeof projectTypeSchema>;

export const tagStatusSchema = z.enum(["active", "on_hold", "dropped"]);
export type TagStatusInput = z.infer<typeof tagStatusSchema>;

export const tagLocationTypeSchema = z.enum(["anywhere", "address", "coordinates"]);
export type TagLocationTypeInput = z.infer<typeof tagLocationTypeSchema>;

export const reviewIntervalUnitSchema = z.enum(["day", "week", "month", "year"]);
export type ReviewIntervalUnitInput = z.infer<typeof reviewIntervalUnitSchema>;

export const recurrenceFrequencySchema = z.enum([
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
]);
export type RecurrenceFrequencyInput = z.infer<typeof recurrenceFrequencySchema>;

export const recurrenceScheduleSchema = z.enum(["regular", "from_completion"]);
export type RecurrenceScheduleInput = z.infer<typeof recurrenceScheduleSchema>;

export const recurrenceBasedOnSchema = z.enum(["defer_date", "planned_date", "due_date"]);
export type RecurrenceBasedOnInput = z.infer<typeof recurrenceBasedOnSchema>;

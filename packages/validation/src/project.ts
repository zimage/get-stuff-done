import { z } from "zod";
import { projectStatusSchema, projectTypeSchema, reviewIntervalUnitSchema } from "./enums.js";

const cuid = z.string().min(1);

const projectShape = {
  title: z.string().min(1).max(500),
  status: projectStatusSchema.default("active"),
  type: projectTypeSchema.default("parallel"),
  flagged: z.boolean().default(false),
  deferredDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  reviewDate: z.coerce.date().nullable().optional(),
  reviewIntervalCount: z.number().int().positive().nullable().optional(),
  reviewIntervalUnit: reviewIntervalUnitSchema.nullable().optional(),
  note: z.string().max(20000).nullable().optional(),
  folderId: cuid.nullable().optional(),
  tagIds: z.array(cuid).default([]),
};

export const createProjectInputSchema = z.object(projectShape);
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = z.object(projectShape).partial().extend({ id: cuid });
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

export const markProjectReviewedInputSchema = z.object({ id: cuid });
export type MarkProjectReviewedInput = z.infer<typeof markProjectReviewedInputSchema>;

export const shareProjectInputSchema = z.object({ projectId: cuid, userId: cuid });
export type ShareProjectInput = z.infer<typeof shareProjectInputSchema>;

export const unshareProjectInputSchema = z.object({ projectId: cuid, userId: cuid });
export type UnshareProjectInput = z.infer<typeof unshareProjectInputSchema>;

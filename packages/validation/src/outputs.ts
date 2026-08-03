import { z } from "zod";
import {
  actionStatusSchema,
  actionTypeSchema,
  projectStatusSchema,
  projectTypeSchema,
  recurrenceBasedOnSchema,
  recurrenceFrequencySchema,
  recurrenceScheduleSchema,
  reviewIntervalUnitSchema,
  tagLocationTypeSchema,
  tagStatusSchema,
} from "./enums.js";

// Mirrors the actual Prisma model shapes returned by the API — distinct from
// the create/update *input* schemas elsewhere in this package. Used for
// tRPC's `.output()` validation, which OpenAPI/REST generation requires.

export const tagOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: tagStatusSchema,
  locationType: tagLocationTypeSchema,
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geocodedAt: z.date().nullable(),
  parentTagId: z.string().nullable(),
  ownerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TagOutput = z.infer<typeof tagOutputSchema>;

export const actionTagOutputSchema = z.object({
  actionId: z.string(),
  tagId: z.string(),
  createdAt: z.date(),
  tag: tagOutputSchema,
});

export const projectTagOutputSchema = z.object({
  projectId: z.string(),
  tagId: z.string(),
  createdAt: z.date(),
  tag: tagOutputSchema,
});

export const actionOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  note: z.string().nullable(),
  projectId: z.string().nullable(),
  parentActionId: z.string().nullable(),
  status: actionStatusSchema,
  flagged: z.boolean(),
  deferredDate: z.date().nullable(),
  plannedDate: z.date().nullable(),
  dueDate: z.date().nullable(),
  durationMinutes: z.number().nullable(),
  sortOrder: z.number(),
  type: actionTypeSchema,
  completeWithLastAction: z.boolean(),
  repeats: z.boolean(),
  recurrenceInterval: z.number().nullable(),
  recurrenceFrequency: recurrenceFrequencySchema.nullable(),
  recurrenceSchedule: recurrenceScheduleSchema.nullable(),
  recurrenceCatchUpAutomatically: z.boolean(),
  recurrenceBasedOn: recurrenceBasedOnSchema.nullable(),
  previousOccurrenceId: z.string().nullable(),
  createdById: z.string(),
  assignedToId: z.string().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(actionTagOutputSchema),
});
export type ActionOutput = z.infer<typeof actionOutputSchema>;

// Used by actions.get (the Inspector's single-action fetch), which needs to
// know whether this action has children to decide whether to show the
// type/completeWithLastAction fields at all.
export const actionWithChildCountOutputSchema = actionOutputSchema.extend({
  _count: z.object({ children: z.number() }),
});

export const projectOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: projectStatusSchema,
  type: projectTypeSchema,
  flagged: z.boolean(),
  deferredDate: z.date().nullable(),
  plannedDate: z.date().nullable(),
  dueDate: z.date().nullable(),
  durationMinutes: z.number().nullable(),
  reviewDate: z.date().nullable(),
  reviewIntervalCount: z.number().nullable(),
  reviewIntervalUnit: reviewIntervalUnitSchema.nullable(),
  lastReviewedAt: z.date().nullable(),
  completeWithLastAction: z.boolean(),
  note: z.string().nullable(),
  folderId: z.string().nullable(),
  ownerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(projectTagOutputSchema),
});
export type ProjectOutput = z.infer<typeof projectOutputSchema>;

export const projectListItemOutputSchema = projectOutputSchema.extend({
  _count: z.object({ actions: z.number() }),
});

export const projectDetailOutputSchema = z.object({
  project: projectOutputSchema,
  actions: z.array(actionOutputSchema),
  actionableActionIds: z.array(z.string()),
});

export const folderOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  parentFolderId: z.string().nullable(),
  sortOrder: z.number(),
  ownerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FolderOutput = z.infer<typeof folderOutputSchema>;

export const publicUserOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  familyId: z.string().nullable(),
});
export type PublicUserOutput = z.infer<typeof publicUserOutputSchema>;

export const sessionOutputSchema = z.object({
  user: publicUserOutputSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const apiTokenOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenPreview: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
});
export type ApiTokenOutput = z.infer<typeof apiTokenOutputSchema>;

export const apiTokenCreatedOutputSchema = apiTokenOutputSchema.extend({
  token: z.string(),
});

export const successOutputSchema = z.object({ success: z.boolean() });

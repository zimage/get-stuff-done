import { z } from "zod";

const cuid = z.string().min(1);

const folderShape = {
  title: z.string().min(1).max(200),
  parentFolderId: cuid.nullable().optional(),
  sortOrder: z.number().int().optional(),
};

export const createFolderInputSchema = z.object(folderShape);
export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

export const updateFolderInputSchema = z.object(folderShape).partial().extend({ id: cuid });
export type UpdateFolderInput = z.infer<typeof updateFolderInputSchema>;

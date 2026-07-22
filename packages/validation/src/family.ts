import { z } from "zod";

const cuid = z.string().min(1);

export const createFamilyInputSchema = z.object({ name: z.string().min(1).max(200) });
export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>;

export const joinFamilyInputSchema = z.object({ inviteCode: z.string().min(1) });
export type JoinFamilyInput = z.infer<typeof joinFamilyInputSchema>;

export const assignActionInputSchema = z.object({
  actionId: cuid,
  assignedToId: cuid.nullable(),
});
export type AssignActionInput = z.infer<typeof assignActionInputSchema>;

import { z } from "zod";

export const createApiTokenInputSchema = z.object({ name: z.string().min(1).max(100) });
export type CreateApiTokenInput = z.infer<typeof createApiTokenInputSchema>;

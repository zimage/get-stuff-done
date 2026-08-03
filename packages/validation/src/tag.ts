import { z } from "zod";
import { tagLocationTypeSchema, tagStatusSchema } from "./enums.js";

const cuid = z.string().min(1);

const tagShape = {
  title: z.string().min(1).max(200),
  status: tagStatusSchema.default("active"),
  locationType: tagLocationTypeSchema.default("anywhere"),
  address: z.string().max(500).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  parentTagId: cuid.nullable().optional(),
};

function validateLocation(
  data: { locationType?: string; address?: string | null; lat?: number | null; lng?: number | null },
  ctx: z.RefinementCtx,
) {
  if (data.locationType === "address" && !data.address) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["address"],
      message: "address is required when locationType is address",
    });
  }
  if (data.locationType === "coordinates" && (data.lat == null || data.lng == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lat"],
      message: "lat and lng are required when locationType is coordinates",
    });
  }
}

export const createTagInputSchema = z.object(tagShape).superRefine(validateLocation);
export type CreateTagInput = z.infer<typeof createTagInputSchema>;

export const updateTagInputSchema = z
  .object(tagShape)
  .partial()
  .extend({ id: cuid })
  .superRefine(validateLocation);
export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;

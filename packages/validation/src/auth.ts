import { z } from "zod";

export const loginWithGoogleInputSchema = z.object({ idToken: z.string().min(1) });
export type LoginWithGoogleInput = z.infer<typeof loginWithGoogleInputSchema>;

// Optional because web supplies it via an httpOnly cookie instead of the
// request body; mobile (no cookie jar) passes it explicitly.
export const refreshInputSchema = z.object({ refreshToken: z.string().min(1).optional() });
export type RefreshInput = z.infer<typeof refreshInputSchema>;

import type { ReviewIntervalUnit } from "./types.js";

// ReviewIntervalUnit ("day"|"week"|"month"|"year") is a subset of the
// recurrence frequency literals, so we can reuse the same date arithmetic.
import { addInterval } from "./recurrence.js";

export function isProjectDueForReview(
  project: { reviewDate: Date | null },
  now: Date = new Date(),
): boolean {
  return project.reviewDate != null && project.reviewDate.getTime() <= now.getTime();
}

export function computeNextReviewDate(
  reviewedAt: Date,
  intervalCount: number | null,
  intervalUnit: ReviewIntervalUnit | null,
): Date | null {
  if (intervalCount == null || intervalUnit == null) return null;
  return addInterval(reviewedAt, intervalCount, intervalUnit);
}

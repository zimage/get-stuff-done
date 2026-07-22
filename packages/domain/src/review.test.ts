import { describe, expect, it } from "vitest";
import { computeNextReviewDate, isProjectDueForReview } from "./review.js";

const NOW = new Date("2026-07-22T12:00:00Z");

describe("isProjectDueForReview", () => {
  it("is true when reviewDate is in the past", () => {
    expect(isProjectDueForReview({ reviewDate: new Date("2026-07-01T00:00:00Z") }, NOW)).toBe(true);
  });
  it("is true when reviewDate is exactly now", () => {
    expect(isProjectDueForReview({ reviewDate: NOW }, NOW)).toBe(true);
  });
  it("is false when reviewDate is in the future", () => {
    expect(isProjectDueForReview({ reviewDate: new Date("2026-08-01T00:00:00Z") }, NOW)).toBe(false);
  });
  it("is false when reviewDate is null", () => {
    expect(isProjectDueForReview({ reviewDate: null }, NOW)).toBe(false);
  });
});

describe("computeNextReviewDate", () => {
  it("adds the interval to the reviewed-at date", () => {
    const reviewedAt = new Date("2026-07-22T00:00:00Z");
    expect(computeNextReviewDate(reviewedAt, 2, "week")?.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });
  it("returns null when interval is not configured", () => {
    expect(computeNextReviewDate(new Date(), null, null)).toBeNull();
  });
});

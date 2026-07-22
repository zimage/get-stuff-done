import { describe, expect, it } from "vitest";
import { addInterval, computeNextOccurrenceDates } from "./recurrence.js";
import type { ActionDates, RecurrenceConfig } from "./types.js";

describe("addInterval", () => {
  it("adds minutes/hours/days/weeks/months/years", () => {
    const base = new Date("2026-01-31T10:00:00Z");
    expect(addInterval(base, 30, "minute").toISOString()).toBe("2026-01-31T10:30:00.000Z");
    expect(addInterval(base, 2, "hour").toISOString()).toBe("2026-01-31T12:00:00.000Z");
    expect(addInterval(base, 1, "day").toISOString()).toBe("2026-02-01T10:00:00.000Z");
    expect(addInterval(base, 2, "week").toISOString()).toBe("2026-02-14T10:00:00.000Z");
    expect(addInterval(base, 1, "month").toISOString()).toBe("2026-03-03T10:00:00.000Z"); // JS Date month overflow (Jan 31 + 1mo)
    expect(addInterval(base, 1, "year").toISOString()).toBe("2027-01-31T10:00:00.000Z");
  });
});

describe("computeNextOccurrenceDates — regular schedule", () => {
  it("shifts every set date by the interval exactly once when catchUpAutomatically is off", () => {
    const dates: ActionDates = {
      deferredDate: new Date("2026-07-01T00:00:00Z"),
      plannedDate: null,
      dueDate: new Date("2026-07-08T00:00:00Z"),
    };
    const config: RecurrenceConfig = {
      interval: 1,
      frequency: "week",
      schedule: "regular",
      catchUpAutomatically: false,
      basedOn: null,
    };
    // Completed very late — well past the naive next occurrence.
    const completedAt = new Date("2026-08-01T00:00:00Z");
    const next = computeNextOccurrenceDates(dates, config, completedAt);
    expect(next.deferredDate?.toISOString()).toBe("2026-07-08T00:00:00.000Z");
    expect(next.dueDate?.toISOString()).toBe("2026-07-15T00:00:00.000Z");
    expect(next.plannedDate).toBeNull();
    // Still in the past relative to completedAt — that's expected/allowed.
    expect(next.dueDate!.getTime()).toBeLessThan(completedAt.getTime());
  });

  it("skips missed occurrences together when catchUpAutomatically is on", () => {
    const dates: ActionDates = {
      deferredDate: new Date("2026-07-01T00:00:00Z"),
      plannedDate: null,
      dueDate: new Date("2026-07-08T00:00:00Z"),
    };
    const config: RecurrenceConfig = {
      interval: 1,
      frequency: "week",
      schedule: "regular",
      catchUpAutomatically: true,
      basedOn: null,
    };
    const completedAt = new Date("2026-08-01T00:00:00Z");
    const next = computeNextOccurrenceDates(dates, config, completedAt);
    // due date must land on/after completedAt, still 7 days ahead of defer.
    expect(next.dueDate!.getTime()).toBeGreaterThanOrEqual(completedAt.getTime());
    expect(next.dueDate!.getTime() - next.deferredDate!.getTime()).toBe(7 * 86_400_000);
    expect(next.dueDate?.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("computeNextOccurrenceDates — from_completion schedule", () => {
  it("anchors basedOn date to completedAt + interval and preserves offsets to the other dates", () => {
    const dates: ActionDates = {
      deferredDate: new Date("2026-07-05T00:00:00Z"), // 3 days before due
      plannedDate: new Date("2026-07-07T00:00:00Z"), // 1 day before due
      dueDate: new Date("2026-07-08T00:00:00Z"),
    };
    const config: RecurrenceConfig = {
      interval: 2,
      frequency: "day",
      schedule: "from_completion",
      catchUpAutomatically: false,
      basedOn: "due_date",
    };
    const completedAt = new Date("2026-07-20T00:00:00Z");
    const next = computeNextOccurrenceDates(dates, config, completedAt);
    expect(next.dueDate?.toISOString()).toBe("2026-07-22T00:00:00.000Z");
    expect(next.deferredDate?.toISOString()).toBe("2026-07-19T00:00:00.000Z"); // still 3 days before
    expect(next.plannedDate?.toISOString()).toBe("2026-07-21T00:00:00.000Z"); // still 1 day before
  });

  it("throws if the basedOn date isn't set on the action", () => {
    const dates: ActionDates = { deferredDate: null, plannedDate: null, dueDate: null };
    const config: RecurrenceConfig = {
      interval: 1,
      frequency: "day",
      schedule: "from_completion",
      catchUpAutomatically: false,
      basedOn: "due_date",
    };
    expect(() => computeNextOccurrenceDates(dates, config, new Date())).toThrow();
  });
});

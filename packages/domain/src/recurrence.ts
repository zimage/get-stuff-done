import type { ActionDates, RecurrenceBasedOn, RecurrenceConfig, RecurrenceFrequency } from "./types.js";

// All arithmetic is done in UTC (not the host's local timezone) so the
// result doesn't depend on where the server/process happens to run.
export function addInterval(date: Date, interval: number, frequency: RecurrenceFrequency): Date {
  const result = new Date(date.getTime());
  switch (frequency) {
    case "minute":
      result.setUTCMinutes(result.getUTCMinutes() + interval);
      break;
    case "hour":
      result.setUTCHours(result.getUTCHours() + interval);
      break;
    case "day":
      result.setUTCDate(result.getUTCDate() + interval);
      break;
    case "week":
      result.setUTCDate(result.getUTCDate() + interval * 7);
      break;
    case "month":
      result.setUTCMonth(result.getUTCMonth() + interval);
      break;
    case "year":
      result.setUTCFullYear(result.getUTCFullYear() + interval);
      break;
  }
  return result;
}

function shiftAll(dates: ActionDates, interval: number, frequency: RecurrenceFrequency): ActionDates {
  return {
    deferredDate: dates.deferredDate ? addInterval(dates.deferredDate, interval, frequency) : null,
    plannedDate: dates.plannedDate ? addInterval(dates.plannedDate, interval, frequency) : null,
    dueDate: dates.dueDate ? addInterval(dates.dueDate, interval, frequency) : null,
  };
}

function basedOnField(basedOn: RecurrenceBasedOn): keyof ActionDates {
  switch (basedOn) {
    case "defer_date":
      return "deferredDate";
    case "planned_date":
      return "plannedDate";
    case "due_date":
      return "dueDate";
  }
}

/**
 * "regular" schedule: the interval is added to whichever original dates the
 * action has, unconditionally. `catchUpAutomatically` additionally re-applies
 * the shift, in lockstep across all three dates, until the reference date
 * (due > planned > defer, whichever is set) is no longer in the past relative
 * to `completedAt` — i.e. skips missed occurrences instead of surfacing an
 * already-overdue next one.
 */
function computeRegularNext(dates: ActionDates, config: RecurrenceConfig, completedAt: Date): ActionDates {
  let next = shiftAll(dates, config.interval, config.frequency);
  if (!config.catchUpAutomatically) return next;

  const referenceKey: keyof ActionDates = dates.dueDate
    ? "dueDate"
    : dates.plannedDate
      ? "plannedDate"
      : "deferredDate";

  let referenceDate = next[referenceKey];
  while (referenceDate && referenceDate.getTime() < completedAt.getTime()) {
    next = shiftAll(next, config.interval, config.frequency);
    referenceDate = next[referenceKey];
  }
  return next;
}

/**
 * "from_completion" schedule: the `basedOn` date is set to `completedAt +
 * interval`, and every other date is shifted by the same absolute offset it
 * originally had from the `basedOn` date — preserving the relative spacing
 * between defer/planned/due.
 */
function computeFromCompletionNext(dates: ActionDates, config: RecurrenceConfig, completedAt: Date): ActionDates {
  if (!config.basedOn) {
    throw new Error("recurrenceBasedOn is required for a from_completion schedule");
  }
  const field = basedOnField(config.basedOn);
  const rawOldBasedOnDate = dates[field];
  if (!rawOldBasedOnDate) {
    throw new Error(`the date field named by recurrenceBasedOn (${config.basedOn}) must be set on the action`);
  }
  const oldBasedOnDate: Date = rawOldBasedOnDate;

  const newBasedOnDate = addInterval(completedAt, config.interval, config.frequency);

  function computeField(key: keyof ActionDates): Date | null {
    if (key === field) return newBasedOnDate;
    const original = dates[key];
    if (!original) return null;
    const offsetMs = original.getTime() - oldBasedOnDate.getTime();
    return new Date(newBasedOnDate.getTime() + offsetMs);
  }

  return {
    deferredDate: computeField("deferredDate"),
    plannedDate: computeField("plannedDate"),
    dueDate: computeField("dueDate"),
  };
}

export function computeNextOccurrenceDates(
  dates: ActionDates,
  config: RecurrenceConfig,
  completedAt: Date,
): ActionDates {
  return config.schedule === "regular"
    ? computeRegularNext(dates, config, completedAt)
    : computeFromCompletionNext(dates, config, completedAt);
}

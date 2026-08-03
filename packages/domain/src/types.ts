export type ActionStatus = "active" | "completed" | "dropped";
export type ProjectType = "parallel" | "sequential" | "single_actions";
export type ActionType = "parallel" | "sequential";
export type RecurrenceFrequency = "minute" | "hour" | "day" | "week" | "month" | "year";
export type RecurrenceSchedule = "regular" | "from_completion";
export type RecurrenceBasedOn = "defer_date" | "planned_date" | "due_date";
export type ReviewIntervalUnit = "day" | "week" | "month" | "year";

export interface ActionNode {
  id: string;
  parentActionId: string | null;
  status: ActionStatus;
  deferredDate: Date | null;
  sortOrder: number;
  // Governs this action's own children's actionability — see computeActionable.
  type: ActionType;
}

export interface ActionDates {
  deferredDate: Date | null;
  plannedDate: Date | null;
  dueDate: Date | null;
}

export interface RecurrenceConfig {
  interval: number;
  frequency: RecurrenceFrequency;
  schedule: RecurrenceSchedule;
  catchUpAutomatically: boolean;
  basedOn: RecurrenceBasedOn | null;
}

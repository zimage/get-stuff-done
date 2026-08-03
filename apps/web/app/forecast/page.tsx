"use client";

import { ActionRow } from "../../components/ActionRow";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";
import type { ActionListItem } from "../../lib/types";

function earliestDate(action: ActionListItem): Date {
  const dates = [action.deferredDate, action.plannedDate, action.dueDate].filter(
    (d): d is Date => d != null,
  );
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateLabelFor(action: ActionListItem): string {
  const parts: string[] = [];
  if (action.deferredDate) parts.push(`Defer ${formatShort(action.deferredDate)}`);
  if (action.plannedDate) parts.push(`Planned ${formatShort(action.plannedDate)}`);
  if (action.dueDate) parts.push(`Due ${formatShort(action.dueDate)}`);
  return parts.join(" · ");
}

export default function ForecastPage() {
  const utils = trpc.useUtils();
  const { select } = useShellState();
  const actionsQuery = trpc.actions.calendar.useQuery({});
  const invalidateActions = () => utils.actions.calendar.invalidate();

  const groups: { heading: string; actions: ActionListItem[] }[] = [];
  for (const action of actionsQuery.data ?? []) {
    const heading = formatDay(earliestDate(action));
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.heading === heading) {
      lastGroup.actions.push(action);
    } else {
      groups.push({ heading, actions: [action] });
    }
  }

  return (
    <main className="inbox">
      <header>
        <h1>Forecast</h1>
      </header>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.error && <p>Failed to load actions: {actionsQuery.error.message}</p>}
      {groups.length === 0 && !actionsQuery.isLoading && <p>Nothing scheduled.</p>}

      {groups.map((group) => (
        <section key={group.heading} className="calendar-group">
          <h2>{group.heading}</h2>
          <ul>
            {group.actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onEdit={(id) => select({ type: "action", id })}
                onChanged={invalidateActions}
                dateLabel={dateLabelFor(action)}
              />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

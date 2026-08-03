"use client";

import { ActionRow } from "../../components/ActionRow";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ChangedPage() {
  const utils = trpc.useUtils();
  const { select } = useShellState();
  const actionsQuery = trpc.actions.changed.useQuery({});
  const invalidateActions = () => utils.actions.changed.invalidate();

  return (
    <main className="inbox">
      <header>
        <h1>Changed</h1>
      </header>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.error && <p>Failed to load actions: {actionsQuery.error.message}</p>}
      {actionsQuery.data?.length === 0 && <p>Nothing yet.</p>}

      <ul>
        {actionsQuery.data?.map((action) => (
          <ActionRow
            key={action.id}
            action={action}
            onEdit={(id) => select({ type: "action", id })}
            onChanged={invalidateActions}
            dateLabel={`Changed ${formatRelativeTime(action.updatedAt)}`}
          />
        ))}
      </ul>
    </main>
  );
}

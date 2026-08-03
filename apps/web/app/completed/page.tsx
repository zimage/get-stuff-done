"use client";

import { ActionRow } from "../../components/ActionRow";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";

export default function CompletedPage() {
  const utils = trpc.useUtils();
  const { select } = useShellState();
  const actionsQuery = trpc.actions.list.useQuery({ status: "completed" });
  const invalidateActions = () => utils.actions.list.invalidate({ status: "completed" });

  return (
    <main className="inbox">
      <header>
        <h1>Completed</h1>
      </header>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.error && <p>Failed to load actions: {actionsQuery.error.message}</p>}
      {actionsQuery.data?.length === 0 && <p>Nothing completed yet.</p>}

      <ul>
        {actionsQuery.data?.map((action) => (
          <ActionRow
            key={action.id}
            action={action}
            onEdit={(id) => select({ type: "action", id })}
            onChanged={invalidateActions}
          />
        ))}
      </ul>
    </main>
  );
}

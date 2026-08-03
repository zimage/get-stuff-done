"use client";

import { ActionRow } from "../../components/ActionRow";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";

export default function FlaggedPage() {
  const utils = trpc.useUtils();
  const { select } = useShellState();
  const actionsQuery = trpc.actions.list.useQuery({ flagged: true, status: "active" });
  const invalidateActions = () => utils.actions.list.invalidate({ flagged: true, status: "active" });

  return (
    <main className="inbox">
      <header>
        <h1>Flagged</h1>
      </header>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.error && <p>Failed to load actions: {actionsQuery.error.message}</p>}
      {actionsQuery.data?.length === 0 && <p>Nothing flagged.</p>}

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

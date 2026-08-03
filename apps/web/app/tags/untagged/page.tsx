"use client";

import { ActionRow } from "../../../components/ActionRow";
import { useShellState } from "../../../lib/ShellStateProvider";
import { trpc } from "../../../lib/trpc";

export default function UntaggedPage() {
  const utils = trpc.useUtils();
  const { select } = useShellState();
  const actionsQuery = trpc.actions.list.useQuery({ untagged: true, status: "active" });
  const invalidateActions = () => utils.actions.list.invalidate({ untagged: true, status: "active" });

  return (
    <div className="detail-pane">
      <div className="detail-pane-header">
        <h2>Untagged</h2>
      </div>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.data?.length === 0 && <p className="empty-hint">Nothing untagged.</p>}
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
    </div>
  );
}

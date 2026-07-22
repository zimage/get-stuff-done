"use client";

import { useState } from "react";
import { ActionEditForm } from "../../components/ActionEditForm";
import { ActionRow } from "../../components/ActionRow";
import { Modal } from "../../components/Modal";
import { trpc } from "../../lib/trpc";

export default function FlaggedPage() {
  const utils = trpc.useUtils();
  const actionsQuery = trpc.actions.list.useQuery({ flagged: true, status: "active" });
  const invalidateActions = () => utils.actions.list.invalidate({ flagged: true, status: "active" });

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const editingAction = actionsQuery.data?.find((action) => action.id === editingActionId);

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
            onEdit={setEditingActionId}
            onChanged={invalidateActions}
          />
        ))}
      </ul>

      {editingAction && (
        <Modal title="Edit action" onClose={() => setEditingActionId(null)}>
          <ActionEditForm
            action={editingAction}
            onSaved={() => {
              invalidateActions();
              setEditingActionId(null);
            }}
          />
        </Modal>
      )}
    </main>
  );
}

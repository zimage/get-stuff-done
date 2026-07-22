"use client";

import { useState } from "react";
import { ActionEditForm } from "../../../components/ActionEditForm";
import { ActionRow } from "../../../components/ActionRow";
import { Modal } from "../../../components/Modal";
import { trpc } from "../../../lib/trpc";

export default function UntaggedPage() {
  const utils = trpc.useUtils();
  const actionsQuery = trpc.actions.list.useQuery({ untagged: true, status: "active" });
  const invalidateActions = () => utils.actions.list.invalidate({ untagged: true, status: "active" });

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const editingAction = actionsQuery.data?.find((action) => action.id === editingActionId);

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
    </div>
  );
}

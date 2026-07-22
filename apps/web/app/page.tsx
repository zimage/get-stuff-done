"use client";

import { useState, type FormEvent } from "react";
import { ActionEditForm } from "../components/ActionEditForm";
import { ActionRow } from "../components/ActionRow";
import { Modal } from "../components/Modal";
import { trpc } from "../lib/trpc";

export default function InboxPage() {
  const utils = trpc.useUtils();

  const actionsQuery = trpc.actions.list.useQuery({ projectId: null, status: "active" });
  const invalidateActions = () => utils.actions.list.invalidate();

  const createMutation = trpc.actions.create.useMutation({ onSuccess: invalidateActions });

  const [title, setTitle] = useState("");
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createMutation.mutate({ title: trimmed });
    setTitle("");
  }

  const editingAction = actionsQuery.data?.find((action) => action.id === editingActionId);

  return (
    <main className="inbox">
      <header>
        <h1>Inbox</h1>
      </header>

      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add an action…"
        />
        <button type="submit" disabled={createMutation.isPending}>
          Add
        </button>
      </form>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.error && <p>Failed to load actions: {actionsQuery.error.message}</p>}
      {actionsQuery.data?.length === 0 && <p>Inbox zero. Nice.</p>}

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

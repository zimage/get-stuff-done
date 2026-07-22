"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActionEditForm } from "../../../components/ActionEditForm";
import { ActionRow } from "../../../components/ActionRow";
import { Modal } from "../../../components/Modal";
import { TagEditForm } from "../../../components/TagEditForm";
import { trpc } from "../../../lib/trpc";

export default function TagDetailPage() {
  const params = useParams<{ tagId: string }>();
  const tagId = params.tagId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldFocusTitle = searchParams.get("focusTitle") === "1";

  const utils = trpc.useUtils();
  const tagsQuery = trpc.tags.list.useQuery({});
  const tag = tagsQuery.data?.find((t) => t.id === tagId);

  const actionsQuery = trpc.actions.list.useQuery({ tagId, status: "active" });
  const invalidateActions = () => utils.actions.list.invalidate({ tagId, status: "active" });

  const updateMutation = trpc.tags.update.useMutation({ onSuccess: () => utils.tags.list.invalidate() });
  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      router.push("/tags");
    },
  });

  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tag) setTitle(tag.title);
  }, [tag?.title]);

  useEffect(() => {
    if (shouldFocusTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      router.replace(`/tags/${tagId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFocusTitle]);

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (tag && trimmed && trimmed !== tag.title) {
      updateMutation.mutate({ id: tagId, title: trimmed });
    }
  }

  const editingAction = actionsQuery.data?.find((action) => action.id === editingActionId);

  if (tagsQuery.isLoading) {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }
  if (!tag) {
    return (
      <div className="empty-state">
        <p>Tag not found.</p>
      </div>
    );
  }

  return (
    <div className="detail-pane">
      <div className="detail-pane-header">
        <input
          ref={titleInputRef}
          className="detail-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <div className="detail-pane-actions">
          <button onClick={() => setEditing(true)}>Edit</button>
          <button
            onClick={() => {
              if (confirm(`Delete tag "${tag.title}"? This removes it from any tagged actions.`)) {
                deleteMutation.mutate({ id: tag.id });
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {actionsQuery.isLoading && <p>Loading…</p>}
      {actionsQuery.data?.length === 0 && <p className="empty-hint">No actions with this tag.</p>}
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

      {editing && (
        <Modal title="Edit tag" onClose={() => setEditing(false)}>
          <TagEditForm
            tag={tag}
            onSaved={() => {
              utils.tags.list.invalidate();
              setEditing(false);
            }}
          />
        </Modal>
      )}

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

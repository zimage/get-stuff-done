"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActionRow } from "../../../components/ActionRow";
import { useShellState } from "../../../lib/ShellStateProvider";
import { trpc } from "../../../lib/trpc";

export default function TagDetailPage() {
  const params = useParams<{ tagId: string }>();
  const tagId = params.tagId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldFocusTitle = searchParams.get("focusTitle") === "1";
  const { select } = useShellState();

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
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tag) setTitle(tag.title);
  }, [tag?.title]);

  // Viewing a tag's detail page makes it the Inspector's selection.
  useEffect(() => {
    select({ type: "tag", id: tagId });
  }, [tagId, select]);

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
            onEdit={(id) => select({ type: "action", id })}
            onChanged={invalidateActions}
          />
        ))}
      </ul>
    </div>
  );
}

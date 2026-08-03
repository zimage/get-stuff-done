"use client";

import { useState, type FormEvent } from "react";
import { buildTagPath } from "../lib/tagPath";
import { trpc } from "../lib/trpc";

const REVIEW_UNITS = ["day", "week", "month", "year"] as const;

export interface ProjectEditValue {
  id: string;
  title: string;
  status: string;
  type: string;
  flagged: boolean;
  deferredDate: Date | null;
  plannedDate: Date | null;
  dueDate: Date | null;
  durationMinutes: number | null;
  reviewDate: Date | null;
  reviewIntervalCount: number | null;
  reviewIntervalUnit: string | null;
  lastReviewedAt: Date | null;
  completeWithLastAction: boolean;
  note: string | null;
  tags: { tag: { id: string; title: string } }[];
  createdAt: Date;
  updatedAt: Date;
}

function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): Date | null {
  return value ? new Date(value) : null;
}

export function ProjectEditForm({ project, onSaved }: { project: ProjectEditValue; onSaved: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [status, setStatus] = useState(project.status);
  const [type, setType] = useState(project.type);
  const [flagged, setFlagged] = useState(project.flagged);
  const [note, setNote] = useState(project.note ?? "");
  const [deferredDate, setDeferredDate] = useState(toLocalInputValue(project.deferredDate));
  const [plannedDate, setPlannedDate] = useState(toLocalInputValue(project.plannedDate));
  const [dueDate, setDueDate] = useState(toLocalInputValue(project.dueDate));
  const [durationMinutes, setDurationMinutes] = useState(
    project.durationMinutes != null ? String(project.durationMinutes) : "",
  );
  const [reviewDate, setReviewDate] = useState(toLocalInputValue(project.reviewDate));
  const [reviewIntervalCount, setReviewIntervalCount] = useState(project.reviewIntervalCount ?? 1);
  const [reviewIntervalUnit, setReviewIntervalUnit] = useState(project.reviewIntervalUnit ?? "month");
  const [completeWithLastAction, setCompleteWithLastAction] = useState(project.completeWithLastAction);
  const [tagIds, setTagIds] = useState<string[]>(project.tags.map((t) => t.tag.id));
  const [tagToAdd, setTagToAdd] = useState("");

  const tagsQuery = trpc.tags.list.useQuery({});
  const allTags = tagsQuery.data ?? [];
  const tagsById = new Map(allTags.map((t) => [t.id, t]));
  const tagTitleById = new Map(allTags.map((t) => [t.id, t.title]));
  // Fall back to the tag's own title if it isn't in allTags yet (e.g. still loading).
  for (const t of project.tags) {
    if (!tagTitleById.has(t.tag.id)) tagTitleById.set(t.tag.id, t.tag.title);
  }
  const availableTagsToAdd = allTags.filter((t) => !tagIds.includes(t.id));

  const updateMutation = trpc.projects.update.useMutation({ onSuccess: onSaved });

  function handleAddTag() {
    if (tagToAdd && !tagIds.includes(tagToAdd)) {
      setTagIds([...tagIds, tagToAdd]);
      setTagToAdd("");
    }
  }

  function handleRemoveTag(id: string) {
    setTagIds(tagIds.filter((tagId) => tagId !== id));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate({
      id: project.id,
      title: title.trim(),
      status: status as "active" | "on_hold" | "completed" | "dropped",
      type: type as "parallel" | "sequential" | "single_actions",
      flagged,
      note: note.trim() ? note : null,
      deferredDate: fromLocalInputValue(deferredDate),
      plannedDate: fromLocalInputValue(plannedDate),
      dueDate: fromLocalInputValue(dueDate),
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      reviewDate: fromLocalInputValue(reviewDate),
      reviewIntervalCount: reviewDate ? reviewIntervalCount : null,
      reviewIntervalUnit: reviewDate ? (reviewIntervalUnit as (typeof REVIEW_UNITS)[number]) : null,
      completeWithLastAction,
      tagIds,
    });
  }

  return (
    <form className="detail-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label>
        Note
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Markdown supported…" />
      </label>

      <div className="field-row">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="parallel">Parallel</option>
            <option value="sequential">Sequential</option>
            <option value="single_actions">Single actions</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />
          Flagged
        </label>
      </div>

      <div className="field-row">
        <label>
          Defer date
          <input type="datetime-local" value={deferredDate} onChange={(e) => setDeferredDate(e.target.value)} />
        </label>
        <label>
          Planned date
          <input type="datetime-local" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
        </label>
        <label>
          Due date
          <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <label>
        Duration (minutes)
        <input
          type="number"
          min={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="Estimated duration…"
        />
      </label>

      <div className="field-row">
        <label>
          Review date
          <input type="datetime-local" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </label>
        <label>
          Review every
          <input
            type="number"
            min={1}
            value={reviewIntervalCount}
            onChange={(e) => setReviewIntervalCount(Number(e.target.value))}
          />
        </label>
        <label>
          Unit
          <select value={reviewIntervalUnit} onChange={(e) => setReviewIntervalUnit(e.target.value)}>
            {REVIEW_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={completeWithLastAction}
          onChange={(e) => setCompleteWithLastAction(e.target.checked)}
        />
        Complete with last action
      </label>

      <div className="tags-field">
        <span className="tags-field-label">Tags</span>
        {tagIds.length > 0 && (
          <div className="tag-chip-list">
            {tagIds.map((id) => (
              <span key={id} className="tag-chip">
                {tagTitleById.get(id) ?? id}
                <button
                  type="button"
                  className="tag-chip-remove"
                  onClick={() => handleRemoveTag(id)}
                  aria-label={`Remove tag ${tagTitleById.get(id) ?? ""}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="tags-field-add">
          <select value={tagToAdd} onChange={(e) => setTagToAdd(e.target.value)}>
            <option value="">Add a tag…</option>
            {availableTagsToAdd.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {buildTagPath(tag.id, tagsById)}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAddTag} disabled={!tagToAdd}>
            Add
          </button>
        </div>
      </div>

      {project.lastReviewedAt && (
        <p className="form-hint">Last reviewed {project.lastReviewedAt.toLocaleString()}</p>
      )}
      <p className="form-hint">Created {project.createdAt.toLocaleString()}</p>
      <p className="form-hint">Last changed {project.updatedAt.toLocaleString()}</p>

      {updateMutation.error && <p className="form-error">{updateMutation.error.message}</p>}

      <div className="form-actions">
        <button type="submit" disabled={updateMutation.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}

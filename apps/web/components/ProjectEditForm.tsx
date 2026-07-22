"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "../lib/trpc";

const REVIEW_UNITS = ["day", "week", "month", "year"] as const;

export interface ProjectEditValue {
  id: string;
  title: string;
  status: string;
  type: string;
  flagged: boolean;
  deferredDate: Date | null;
  dueDate: Date | null;
  reviewDate: Date | null;
  reviewIntervalCount: number | null;
  reviewIntervalUnit: string | null;
  lastReviewedAt: Date | null;
  note: string | null;
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
  const [dueDate, setDueDate] = useState(toLocalInputValue(project.dueDate));
  const [reviewDate, setReviewDate] = useState(toLocalInputValue(project.reviewDate));
  const [reviewIntervalCount, setReviewIntervalCount] = useState(project.reviewIntervalCount ?? 1);
  const [reviewIntervalUnit, setReviewIntervalUnit] = useState(project.reviewIntervalUnit ?? "month");

  const updateMutation = trpc.projects.update.useMutation({ onSuccess: onSaved });

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
      dueDate: fromLocalInputValue(dueDate),
      reviewDate: fromLocalInputValue(reviewDate),
      reviewIntervalCount: reviewDate ? reviewIntervalCount : null,
      reviewIntervalUnit: reviewDate ? (reviewIntervalUnit as (typeof REVIEW_UNITS)[number]) : null,
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
          Due date
          <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

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

      {project.lastReviewedAt && (
        <p className="form-hint">Last reviewed {project.lastReviewedAt.toLocaleString()}</p>
      )}

      {updateMutation.error && <p className="form-error">{updateMutation.error.message}</p>}

      <div className="form-actions">
        <button type="submit" disabled={updateMutation.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}

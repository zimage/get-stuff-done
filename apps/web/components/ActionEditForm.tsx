"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "../lib/trpc";

const FREQUENCIES = ["minute", "hour", "day", "week", "month", "year"] as const;
const BASED_ON_OPTIONS = ["defer_date", "planned_date", "due_date"] as const;

export interface ActionEditValue {
  id: string;
  title: string;
  note: string | null;
  status: string;
  flagged: boolean;
  deferredDate: Date | null;
  plannedDate: Date | null;
  dueDate: Date | null;
  repeats: boolean;
  recurrenceInterval: number | null;
  recurrenceFrequency: string | null;
  recurrenceSchedule: string | null;
  recurrenceCatchUpAutomatically: boolean;
  recurrenceBasedOn: string | null;
}

function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): Date | null {
  return value ? new Date(value) : null;
}

export function ActionEditForm({ action, onSaved }: { action: ActionEditValue; onSaved: () => void }) {
  const [title, setTitle] = useState(action.title);
  const [note, setNote] = useState(action.note ?? "");
  const [status, setStatus] = useState(action.status);
  const [flagged, setFlagged] = useState(action.flagged);
  const [deferredDate, setDeferredDate] = useState(toLocalInputValue(action.deferredDate));
  const [plannedDate, setPlannedDate] = useState(toLocalInputValue(action.plannedDate));
  const [dueDate, setDueDate] = useState(toLocalInputValue(action.dueDate));
  const [repeats, setRepeats] = useState(action.repeats);
  const [recurrenceInterval, setRecurrenceInterval] = useState(action.recurrenceInterval ?? 1);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(action.recurrenceFrequency ?? "week");
  const [recurrenceSchedule, setRecurrenceSchedule] = useState(action.recurrenceSchedule ?? "regular");
  const [catchUp, setCatchUp] = useState(action.recurrenceCatchUpAutomatically);
  const [basedOn, setBasedOn] = useState(action.recurrenceBasedOn ?? "due_date");

  const updateMutation = trpc.actions.update.useMutation({ onSuccess: onSaved });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate({
      id: action.id,
      title: title.trim(),
      note: note.trim() ? note : null,
      status: status as "active" | "completed" | "dropped",
      flagged,
      deferredDate: fromLocalInputValue(deferredDate),
      plannedDate: fromLocalInputValue(plannedDate),
      dueDate: fromLocalInputValue(dueDate),
      repeats,
      recurrenceInterval: repeats ? recurrenceInterval : null,
      recurrenceFrequency: repeats ? (recurrenceFrequency as (typeof FREQUENCIES)[number]) : null,
      recurrenceSchedule: repeats ? (recurrenceSchedule as "regular" | "from_completion") : null,
      recurrenceCatchUpAutomatically: repeats && recurrenceSchedule === "regular" ? catchUp : false,
      recurrenceBasedOn:
        repeats && recurrenceSchedule === "from_completion"
          ? (basedOn as (typeof BASED_ON_OPTIONS)[number])
          : null,
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
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
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

      <label className="checkbox-label">
        <input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} />
        Repeats
      </label>

      {repeats && (
        <div className="recurrence-fields">
          <div className="field-row">
            <label>
              Every
              <input
                type="number"
                min={1}
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
              />
            </label>
            <label>
              Frequency
              <select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value)}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Schedule
              <select value={recurrenceSchedule} onChange={(e) => setRecurrenceSchedule(e.target.value)}>
                <option value="regular">Regular</option>
                <option value="from_completion">From completion</option>
              </select>
            </label>
          </div>

          {recurrenceSchedule === "regular" && (
            <label className="checkbox-label">
              <input type="checkbox" checked={catchUp} onChange={(e) => setCatchUp(e.target.checked)} />
              Catch up automatically (skip missed occurrences)
            </label>
          )}

          {recurrenceSchedule === "from_completion" && (
            <label>
              Based on
              <select value={basedOn} onChange={(e) => setBasedOn(e.target.value)}>
                {BASED_ON_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          )}

          <p className="form-hint">
            Repeating actions need at least one of defer/planned/due date set as an anchor.
          </p>
        </div>
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

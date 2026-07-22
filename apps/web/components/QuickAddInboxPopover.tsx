"use client";

import { useState } from "react";
import { trpc } from "../lib/trpc";

export function QuickAddInboxPopover({ onDone }: { onDone: () => void }) {
  const projectsQuery = trpc.projects.list.useQuery({ status: "active" });
  const utils = trpc.useUtils();
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      utils.actions.list.invalidate();
      utils.actions.calendar.invalidate();
      utils.actions.changed.invalidate();
    },
  });

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [flagged, setFlagged] = useState(false);

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    createMutation.mutate(
      {
        title: trimmed,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        note: showNote && note.trim() ? note : null,
        flagged,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="quick-add">
      <div className="quick-add-header">Inbox</div>

      <div className="quick-add-row">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title…"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSave();
            if (event.key === "Escape") onDone();
          }}
        />
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">No project</option>
          {projectsQuery.data?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        <button type="button" onClick={() => setShowNote((value) => !value)}>
          Note
        </button>
        <button
          type="button"
          className={`flag-toggle ${flagged ? "flag-toggle-active" : ""}`}
          onClick={() => setFlagged((value) => !value)}
          aria-label="Flag"
          title="Flag"
        >
          ⚑
        </button>
      </div>

      {showNote && (
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note…"
        />
      )}

      {createMutation.error && <p className="form-error">{createMutation.error.message}</p>}

      <div className="quick-add-actions">
        <button type="button" onClick={onDone}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={createMutation.isPending}>
          Save
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { buildProjectPath } from "../lib/projectPath";
import { buildTagPath } from "../lib/tagPath";
import { trpc } from "../lib/trpc";

const FREQUENCIES = ["minute", "hour", "day", "week", "month", "year"] as const;
const BASED_ON_OPTIONS = ["defer_date", "planned_date", "due_date"] as const;

export interface ActionEditValue {
  id: string;
  title: string;
  note: string | null;
  projectId: string | null;
  status: string;
  flagged: boolean;
  deferredDate: Date | null;
  plannedDate: Date | null;
  dueDate: Date | null;
  durationMinutes: number | null;
  // Govern this action's own children — only shown in the form once it has any.
  type: string;
  completeWithLastAction: boolean;
  repeats: boolean;
  recurrenceInterval: number | null;
  recurrenceFrequency: string | null;
  recurrenceSchedule: string | null;
  recurrenceCatchUpAutomatically: boolean;
  recurrenceBasedOn: string | null;
  tags: { tag: { id: string; title: string } }[];
  createdAt: Date;
  updatedAt: Date;
  _count?: { children: number };
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
  const [projectId, setProjectId] = useState<string | null>(action.projectId);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectFieldRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(action.status);
  const [flagged, setFlagged] = useState(action.flagged);
  const [deferredDate, setDeferredDate] = useState(toLocalInputValue(action.deferredDate));
  const [plannedDate, setPlannedDate] = useState(toLocalInputValue(action.plannedDate));
  const [dueDate, setDueDate] = useState(toLocalInputValue(action.dueDate));
  const [durationMinutes, setDurationMinutes] = useState(
    action.durationMinutes != null ? String(action.durationMinutes) : "",
  );
  const [actionType, setActionType] = useState(action.type);
  const [completeWithLastAction, setCompleteWithLastAction] = useState(action.completeWithLastAction);
  const childCount = action._count?.children ?? 0;
  const hasChildren = childCount > 0;
  const [repeats, setRepeats] = useState(action.repeats);
  const [recurrenceInterval, setRecurrenceInterval] = useState(action.recurrenceInterval ?? 1);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(action.recurrenceFrequency ?? "week");
  const [recurrenceSchedule, setRecurrenceSchedule] = useState(action.recurrenceSchedule ?? "regular");
  const [catchUp, setCatchUp] = useState(action.recurrenceCatchUpAutomatically);
  const [basedOn, setBasedOn] = useState(action.recurrenceBasedOn ?? "due_date");
  const [tagIds, setTagIds] = useState<string[]>(action.tags.map((t) => t.tag.id));
  const [tagToAdd, setTagToAdd] = useState("");

  const tagsQuery = trpc.tags.list.useQuery({});
  const allTags = tagsQuery.data ?? [];
  const tagsById = new Map(allTags.map((t) => [t.id, t]));
  const tagTitleById = new Map(allTags.map((t) => [t.id, t.title]));
  // Fall back to the tag's own title if it isn't in allTags yet (e.g. still loading).
  for (const t of action.tags) {
    if (!tagTitleById.has(t.tag.id)) tagTitleById.set(t.tag.id, t.tag.title);
  }
  const availableTagsToAdd = allTags.filter((t) => !tagIds.includes(t.id));

  const utils = trpc.useUtils();
  const projectsQuery = trpc.projects.list.useQuery({});
  const allProjects = projectsQuery.data ?? [];
  const foldersQuery = trpc.folders.list.useQuery({});
  const allFolders = foldersQuery.data ?? [];
  const foldersById = new Map(allFolders.map((f) => [f.id, f]));
  const projectTitleById = new Map(allProjects.map((p) => [p.id, p.title]));
  const projectPathById = new Map(allProjects.map((p) => [p.id, buildProjectPath(p, foldersById)]));
  const selectedProjectTitle = projectId ? (projectTitleById.get(projectId) ?? "") : "";
  const filteredProjects = allProjects.filter((p) =>
    (projectPathById.get(p.id) ?? p.title).toLowerCase().includes(projectQuery.trim().toLowerCase()),
  );
  const hasExactProjectMatch = allProjects.some(
    (p) => p.title.toLowerCase() === projectQuery.trim().toLowerCase(),
  );

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: (created) => {
      utils.projects.list.invalidate();
      setProjectId(created.id);
      setProjectQuery(created.title);
      setProjectDropdownOpen(false);
    },
  });

  useEffect(() => {
    if (!projectDropdownOpen) return;
    function handleClick(event: MouseEvent) {
      if (projectFieldRef.current && !projectFieldRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setProjectDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [projectDropdownOpen]);

  function selectProject(id: string, projectTitle: string) {
    setProjectId(id);
    setProjectQuery(projectTitle);
    setProjectDropdownOpen(false);
  }

  function clearProject() {
    setProjectId(null);
    setProjectQuery("");
    setProjectDropdownOpen(false);
  }

  function handleCreateProject() {
    const trimmed = projectQuery.trim();
    if (!trimmed) return;
    createProjectMutation.mutate({ title: trimmed });
  }

  function handleProjectInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const firstMatch = filteredProjects[0];
    if (firstMatch) {
      selectProject(firstMatch.id, firstMatch.title);
    } else if (projectQuery.trim()) {
      handleCreateProject();
    }
  }

  const updateMutation = trpc.actions.update.useMutation({ onSuccess: onSaved });

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
      id: action.id,
      title: title.trim(),
      note: note.trim() ? note : null,
      projectId,
      status: status as "active" | "completed" | "dropped",
      flagged,
      deferredDate: fromLocalInputValue(deferredDate),
      plannedDate: fromLocalInputValue(plannedDate),
      dueDate: fromLocalInputValue(dueDate),
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      type: actionType as "parallel" | "sequential",
      completeWithLastAction,
      repeats,
      recurrenceInterval: repeats ? recurrenceInterval : null,
      recurrenceFrequency: repeats ? (recurrenceFrequency as (typeof FREQUENCIES)[number]) : null,
      recurrenceSchedule: repeats ? (recurrenceSchedule as "regular" | "from_completion") : null,
      recurrenceCatchUpAutomatically: repeats && recurrenceSchedule === "regular" ? catchUp : false,
      recurrenceBasedOn:
        repeats && recurrenceSchedule === "from_completion"
          ? (basedOn as (typeof BASED_ON_OPTIONS)[number])
          : null,
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

      <div className="project-field" ref={projectFieldRef}>
        <span className="tags-field-label">Project</span>
        <div className="project-picker">
          <input
            value={projectDropdownOpen ? projectQuery : selectedProjectTitle}
            onChange={(e) => {
              setProjectQuery(e.target.value);
              setProjectDropdownOpen(true);
            }}
            onFocus={() => {
              setProjectQuery(selectedProjectTitle);
              setProjectDropdownOpen(true);
            }}
            onKeyDown={handleProjectInputKeyDown}
            placeholder="No project…"
          />
          {projectId && (
            <button
              type="button"
              className="project-picker-clear"
              onClick={clearProject}
              aria-label="Clear project"
            >
              ×
            </button>
          )}
          {projectDropdownOpen && (
            <div className="project-picker-dropdown">
              {filteredProjects.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="project-picker-option"
                  onClick={() => selectProject(p.id, p.title)}
                >
                  {projectPathById.get(p.id) ?? p.title}
                </button>
              ))}
              {projectQuery.trim() && !hasExactProjectMatch && (
                <button
                  type="button"
                  className="project-picker-option project-picker-option-create"
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending}
                >
                  + Create project &ldquo;{projectQuery.trim()}&rdquo;
                </button>
              )}
              {filteredProjects.length === 0 && !projectQuery.trim() && (
                <p className="project-picker-empty">No projects yet.</p>
              )}
            </div>
          )}
        </div>
        {createProjectMutation.error && <p className="form-error">{createProjectMutation.error.message}</p>}
      </div>

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

      {hasChildren && (
        <div className="field-row">
          <label>
            Child action type
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="parallel">Parallel</option>
              <option value="sequential">Sequential</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={completeWithLastAction}
              onChange={(e) => setCompleteWithLastAction(e.target.checked)}
            />
            Complete with last action
          </label>
        </div>
      )}

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

      <p className="form-hint">Created {action.createdAt.toLocaleString()}</p>
      <p className="form-hint">Last changed {action.updatedAt.toLocaleString()}</p>

      {updateMutation.error && <p className="form-error">{updateMutation.error.message}</p>}

      <div className="form-actions">
        <button type="submit" disabled={updateMutation.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}

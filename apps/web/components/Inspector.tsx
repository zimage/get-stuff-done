"use client";

import { useShellState } from "../lib/ShellStateProvider";
import { trpc } from "../lib/trpc";
import { ActionEditForm } from "./ActionEditForm";
import { ProjectEditForm } from "./ProjectEditForm";
import { TagEditForm } from "./TagEditForm";

function ActionInspector({ id }: { id: string }) {
  const utils = trpc.useUtils();
  const query = trpc.actions.get.useQuery({ id });

  if (query.isLoading) return <p>Loading…</p>;
  if (query.error || !query.data) return <p className="empty-hint">Action not found.</p>;

  return (
    <ActionEditForm
      action={query.data}
      onSaved={() => {
        utils.actions.get.invalidate({ id });
        utils.actions.list.invalidate();
        utils.actions.calendar.invalidate();
        utils.actions.changed.invalidate();
      }}
    />
  );
}

function ProjectInspector({ id }: { id: string }) {
  const utils = trpc.useUtils();
  const query = trpc.projects.get.useQuery({ id });

  if (query.isLoading) return <p>Loading…</p>;
  if (query.error || !query.data) return <p className="empty-hint">Project not found.</p>;

  return (
    <ProjectEditForm
      project={query.data.project}
      onSaved={() => {
        utils.projects.get.invalidate({ id });
        utils.projects.list.invalidate();
      }}
    />
  );
}

function TagInspector({ id }: { id: string }) {
  const utils = trpc.useUtils();
  const query = trpc.tags.get.useQuery({ id });

  if (query.isLoading) return <p>Loading…</p>;
  if (query.error || !query.data) return <p className="empty-hint">Tag not found.</p>;

  return (
    <TagEditForm
      tag={query.data}
      onSaved={() => {
        utils.tags.get.invalidate({ id });
        utils.tags.list.invalidate();
      }}
    />
  );
}

const LABELS = { action: "Action", project: "Project", tag: "Tag" } as const;

export function Inspector() {
  const { inspectorVisible, selection } = useShellState();
  if (!inspectorVisible) return null;

  return (
    <aside className="inspector">
      {!selection ? (
        <p className="empty-hint">No Selection</p>
      ) : (
        <>
          <p className="popover-title">{LABELS[selection.type]}</p>
          {selection.type === "action" && <ActionInspector key={selection.id} id={selection.id} />}
          {selection.type === "project" && <ProjectInspector key={selection.id} id={selection.id} />}
          {selection.type === "tag" && <TagInspector key={selection.id} id={selection.id} />}
        </>
      )}
    </aside>
  );
}

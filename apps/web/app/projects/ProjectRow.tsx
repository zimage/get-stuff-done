"use client";

import { useState } from "react";
import { Modal } from "../../components/Modal";
import { ProjectEditForm } from "../../components/ProjectEditForm";
import { trpc } from "../../lib/trpc";
import type { ProjectListItem } from "../../lib/types";
import { ActionTree } from "./ActionTree";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  dropped: "Dropped",
};

const TYPE_LABEL: Record<string, string> = {
  parallel: "Parallel",
  sequential: "Sequential",
  single_actions: "Single actions",
};

export function ProjectRow({
  project,
  defaultExpanded = false,
  showMarkReviewed = false,
}: {
  project: ProjectListItem;
  defaultExpanded?: boolean;
  showMarkReviewed?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const utils = trpc.useUtils();
  const detailQuery = trpc.projects.get.useQuery({ id: project.id }, { enabled: expanded });

  // .invalidate() with no input invalidates every cached variant of
  // projects.list (plain Projects page filters and Review's dueForReview).
  const invalidateList = () => utils.projects.list.invalidate();
  const markReviewedMutation = trpc.projects.markReviewed.useMutation({ onSuccess: invalidateList });

  return (
    <li className="project-row">
      <div className="project-summary">
        <button className="project-disclosure" onClick={() => setExpanded((value) => !value)}>
          <span className="disclosure">{expanded ? "▾" : "▸"}</span>
          <span className="project-title">{project.title}</span>
          {project.flagged && <span className="flag">⚑</span>}
          <span className="project-meta">
            {TYPE_LABEL[project.type]} · {STATUS_LABEL[project.status]} · {project._count.actions} open
          </span>
        </button>
        {showMarkReviewed && (
          <button onClick={() => markReviewedMutation.mutate({ id: project.id })} disabled={markReviewedMutation.isPending}>
            Mark reviewed
          </button>
        )}
        <button onClick={() => setEditing(true)}>Edit</button>
      </div>

      {expanded && (
        <div className="project-detail">
          {detailQuery.isLoading && <p>Loading…</p>}
          {detailQuery.error && <p>Failed to load: {detailQuery.error.message}</p>}
          {detailQuery.data && (
            <ActionTree
              actions={detailQuery.data.actions}
              actionableActionIds={new Set(detailQuery.data.actionableActionIds)}
              projectId={project.id}
            />
          )}
        </div>
      )}

      {editing && (
        <Modal title="Edit project" onClose={() => setEditing(false)}>
          <ProjectEditForm
            project={project}
            onSaved={() => {
              invalidateList();
              setEditing(false);
            }}
          />
        </Modal>
      )}
    </li>
  );
}

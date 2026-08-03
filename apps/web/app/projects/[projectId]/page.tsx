"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useShellState } from "../../../lib/ShellStateProvider";
import { trpc } from "../../../lib/trpc";
import { ActionTree } from "../ActionTree";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldFocusTitle = searchParams.get("focusTitle") === "1";
  const { select } = useShellState();

  const utils = trpc.useUtils();
  const detailQuery = trpc.projects.get.useQuery({ id: projectId });
  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      utils.projects.list.invalidate();
    },
  });
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      router.push("/projects");
    },
  });
  const markReviewedMutation = trpc.projects.markReviewed.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      utils.projects.list.invalidate();
    },
  });

  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (detailQuery.data) setTitle(detailQuery.data.project.title);
  }, [detailQuery.data?.project.title]);

  // Viewing a project's detail page makes it the Inspector's selection.
  useEffect(() => {
    select({ type: "project", id: projectId });
  }, [projectId, select]);

  useEffect(() => {
    if (shouldFocusTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      router.replace(`/projects/${projectId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFocusTitle]);

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (detailQuery.data && trimmed && trimmed !== detailQuery.data.project.title) {
      updateMutation.mutate({ id: projectId, title: trimmed });
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }
  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="empty-state">
        <p>Project not found.</p>
      </div>
    );
  }

  const { project, actions, actionableActionIds } = detailQuery.data;

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
            onClick={() => markReviewedMutation.mutate({ id: project.id })}
            disabled={markReviewedMutation.isPending}
          >
            Mark reviewed
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete project "${project.title}"? Its actions move to the Inbox.`)) {
                deleteMutation.mutate({ id: project.id });
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <ActionTree
        actions={actions}
        actionableActionIds={new Set(actionableActionIds)}
        projectId={project.id}
      />
    </div>
  );
}

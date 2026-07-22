"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trpc } from "../../../../lib/trpc";

export default function FolderDetailPage() {
  const params = useParams<{ folderId: string }>();
  const folderId = params.folderId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldFocusTitle = searchParams.get("focusTitle") === "1";

  const utils = trpc.useUtils();
  const foldersQuery = trpc.folders.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery({});

  const updateMutation = trpc.folders.update.useMutation({
    onSuccess: () => utils.folders.list.invalidate(),
  });
  const deleteMutation = trpc.folders.delete.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      router.push("/projects");
    },
  });

  const folder = foldersQuery.data?.find((f) => f.id === folderId);
  const projectsInFolder = projectsQuery.data?.filter((p) => p.folderId === folderId) ?? [];

  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folder) setTitle(folder.title);
  }, [folder?.title]);

  useEffect(() => {
    if (shouldFocusTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      router.replace(`/projects/folders/${folderId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFocusTitle]);

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (folder && trimmed && trimmed !== folder.title) {
      updateMutation.mutate({ id: folderId, title: trimmed });
    }
  }

  if (foldersQuery.isLoading) {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }
  if (!folder) {
    return (
      <div className="empty-state">
        <p>Folder not found.</p>
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
              if (confirm(`Delete folder "${folder.title}"? Projects inside move to the top level.`)) {
                deleteMutation.mutate({ id: folder.id });
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {projectsInFolder.length === 0 ? (
        <p className="empty-hint">No projects directly in this folder.</p>
      ) : (
        <ul className="project-list">
          {projectsInFolder.map((project) => (
            <li key={project.id} className="project-row">
              <Link className="tree-link" href={`/projects/${project.id}`}>
                {project.flagged ? "⚑ " : ""}
                {project.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

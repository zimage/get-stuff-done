"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import { Popover } from "../../components/Popover";
import * as Icons from "../../components/icons";
import { getDragPayload, setDragPayload } from "../../lib/dragDrop";
import { useShellState } from "../../lib/ShellStateProvider";
import { useStatusMessage } from "../../lib/StatusMessageProvider";
import { trpc } from "../../lib/trpc";
import type { FolderListItem, ProjectListItem } from "../../lib/types";

function currentFolderIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/folders\/([^/]+)/);
  return match?.[1] ?? null;
}

export function ProjectsContextSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shell = useShellState();
  const utils = trpc.useUtils();
  const { setMessage } = useStatusMessage();

  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const foldersQuery = trpc.folders.list.useQuery({});
  const projectsQuery = trpc.projects.list.useQuery({
    status: shell.projectFilters.status === "all" ? undefined : shell.projectFilters.status,
    flagged: shell.projectFilters.flaggedOnly ? true : undefined,
  });

  const createProjectMutation = trpc.projects.create.useMutation();
  const createFolderMutation = trpc.folders.create.useMutation();
  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => utils.projects.list.invalidate(),
    onError: (error) => setMessage(error.message),
  });
  const updateFolderMutation = trpc.folders.update.useMutation({
    onSuccess: () => utils.folders.list.invalidate(),
    onError: (error) => setMessage(error.message),
  });

  const folders = foldersQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const foldersByParent = useMemo(() => {
    const map = new Map<string | null, FolderListItem[]>();
    for (const folder of folders) {
      const list = map.get(folder.parentFolderId) ?? [];
      list.push(folder);
      map.set(folder.parentFolderId, list);
    }
    return map;
  }, [folders]);

  const projectsByFolder = useMemo(() => {
    const map = new Map<string | null, ProjectListItem[]>();
    for (const project of projects) {
      const list = map.get(project.folderId) ?? [];
      list.push(project);
      map.set(project.folderId, list);
    }
    return map;
  }, [projects]);

  function toggleFolder(id: string) {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleNewProject(close: () => void) {
    const folderId = currentFolderIdFromPath(pathname);
    const project = await createProjectMutation.mutateAsync({
      title: "Untitled Project",
      folderId,
    });
    utils.projects.list.invalidate();
    close();
    router.push(`/projects/${project.id}?focusTitle=1`);
  }

  async function handleNewFolder(close: () => void) {
    const parentFolderId = currentFolderIdFromPath(pathname);
    const folder = await createFolderMutation.mutateAsync({
      title: "Untitled Folder",
      parentFolderId,
    });
    utils.folders.list.invalidate();
    close();
    router.push(`/projects/folders/${folder.id}?focusTitle=1`);
  }

  function moveToFolder(payloadKind: "project" | "folder", id: string, folderId: string | null) {
    if (payloadKind === "project") {
      updateProjectMutation.mutate({ id, folderId });
    } else {
      updateFolderMutation.mutate({ id, parentFolderId: folderId });
    }
  }

  function handleDropOnFolder(folder: FolderListItem, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFolderId(null);
    const payload = getDragPayload(event);
    if (!payload || payload.kind === "tag") return;
    if (payload.kind === "folder" && payload.id === folder.id) return;
    moveToFolder(payload.kind, payload.id, folder.id);
  }

  function handleDropNearProject(project: ProjectListItem, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const payload = getDragPayload(event);
    if (!payload || payload.kind === "tag") return;
    if (payload.kind === "project" && payload.id === project.id) return;
    moveToFolder(payload.kind, payload.id, project.folderId);
  }

  function handleDropOnRoot(event: DragEvent) {
    event.preventDefault();
    setDragOverRoot(false);
    const payload = getDragPayload(event);
    if (!payload || payload.kind === "tag") return;
    moveToFolder(payload.kind, payload.id, null);
  }

  function renderFolder(folder: FolderListItem): React.ReactNode {
    const isCollapsed = collapsedFolderIds.has(folder.id);
    const childFolders = foldersByParent.get(folder.id) ?? [];
    const childProjects = projectsByFolder.get(folder.id) ?? [];
    const isActive = pathname === `/projects/folders/${folder.id}`;

    return (
      <div key={folder.id}>
        <div
          className={`folder-tree-item ${dragOverFolderId === folder.id ? "drop-target-active" : ""}`}
          draggable
          onDragStart={(event) => setDragPayload(event, { kind: "folder", id: folder.id })}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOverFolderId(folder.id);
          }}
          onDragLeave={() => setDragOverFolderId((current) => (current === folder.id ? null : current))}
          onDrop={(event) => handleDropOnFolder(folder, event)}
        >
          <button className="folder-tree-toggle" onClick={() => toggleFolder(folder.id)}>
            {isCollapsed ? "▸" : "▾"}
          </button>
          <Link
            href={`/projects/folders/${folder.id}`}
            className={`tree-link ${isActive ? "tree-link-active" : ""}`}
          >
            {folder.title}
          </Link>
        </div>
        {!isCollapsed && (
          <div className="tree-children">
            {childFolders.map(renderFolder)}
            {childProjects.map(renderProject)}
          </div>
        )}
      </div>
    );
  }

  function renderProject(project: ProjectListItem): React.ReactNode {
    const isActive = pathname === `/projects/${project.id}`;
    return (
      <Link
        key={project.id}
        href={`/projects/${project.id}`}
        className={`tree-link ${isActive ? "tree-link-active" : ""}`}
        draggable
        onDragStart={(event) => setDragPayload(event, { kind: "project", id: project.id })}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDropNearProject(project, event)}
      >
        {project.flagged ? "⚑ " : ""}
        {project.title}
      </Link>
    );
  }

  const rootFolders = foldersByParent.get(null) ?? [];
  const rootProjects = projectsByFolder.get(null) ?? [];

  if (!shell.sidebarVisible) return null;

  return (
    <div className="context-sidebar">
      <div
        className={`context-sidebar-list ${dragOverRoot ? "drop-target-active" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOverRoot(true);
        }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={handleDropOnRoot}
      >
        {foldersQuery.isLoading || projectsQuery.isLoading ? <p>Loading…</p> : null}
        {rootFolders.map(renderFolder)}
        {rootProjects.map(renderProject)}
      </div>

      <div className="context-sidebar-footer">
        <Popover triggerClassName="icon-button" triggerLabel={<Icons.PlusIcon />}>
          {(close) => (
            <div className="create-menu">
              <button type="button" onClick={() => handleNewProject(close)}>
                New Project
              </button>
              <button type="button" onClick={() => handleNewFolder(close)}>
                New Folder
              </button>
            </div>
          )}
        </Popover>
      </div>
    </div>
  );
}

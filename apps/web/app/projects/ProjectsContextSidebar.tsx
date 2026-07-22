"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Popover } from "../../components/Popover";
import * as Icons from "../../components/icons";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";
import type { FolderListItem, ProjectListItem } from "../../lib/types";

const STATUS_OPTIONS = ["active", "on_hold", "completed", "dropped"] as const;
type StatusFilter = "all" | (typeof STATUS_OPTIONS)[number];

function currentFolderIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/folders\/([^/]+)/);
  return match?.[1] ?? null;
}

export function ProjectsContextSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shell = useShellState();
  const utils = trpc.useUtils();

  const [status, setStatus] = useState<StatusFilter>("active");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());

  const foldersQuery = trpc.folders.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery({
    status: status === "all" ? undefined : status,
    flagged: flaggedOnly ? true : undefined,
  });

  const createProjectMutation = trpc.projects.create.useMutation();
  const createFolderMutation = trpc.folders.create.useMutation();

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

  function renderFolder(folder: FolderListItem): React.ReactNode {
    const isCollapsed = collapsedFolderIds.has(folder.id);
    const childFolders = foldersByParent.get(folder.id) ?? [];
    const childProjects = projectsByFolder.get(folder.id) ?? [];
    const isActive = pathname === `/projects/folders/${folder.id}`;

    return (
      <div key={folder.id}>
        <div className="folder-tree-item">
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
      {shell.viewOptionsVisible && (
        <div className="context-sidebar-view-options">
          <p className="popover-title">View options</p>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(event) => setFlaggedOnly(event.target.checked)}
            />
            Flagged only
          </label>
        </div>
      )}

      <div className="context-sidebar-list">
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

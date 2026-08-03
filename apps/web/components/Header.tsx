"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/AuthProvider";
import { getPerspectiveFromPath, PERSPECTIVES, type PerspectiveKey } from "../lib/perspectives";
import { useShellState, type ProjectFilters, type TagFilters } from "../lib/ShellStateProvider";
import { useStatusMessage } from "../lib/StatusMessageProvider";
import { trpc } from "../lib/trpc";
import { useKeyboardShortcuts } from "../lib/useKeyboardShortcuts";
import * as Icons from "./icons";
import { Popover } from "./Popover";
import { QuickAddInboxPopover } from "./QuickAddInboxPopover";

const CREATABLE_PERSPECTIVES = new Set<PerspectiveKey>(["projects", "tags", "inbox"]);

const PROJECT_STATUS_OPTIONS = ["active", "on_hold", "completed", "dropped"] as const;
const TAG_STATUS_OPTIONS = ["active", "on_hold", "dropped"] as const;

function ViewOptionsContent({ perspective }: { perspective: PerspectiveKey | null }) {
  const shell = useShellState();

  if (perspective === "projects") {
    return (
      <div className="view-options-content">
        <select
          value={shell.projectFilters.status}
          onChange={(event) =>
            shell.setProjectFilters({ status: event.target.value as ProjectFilters["status"] })
          }
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={shell.projectFilters.flaggedOnly}
            onChange={(event) => shell.setProjectFilters({ flaggedOnly: event.target.checked })}
          />
          Flagged only
        </label>
      </div>
    );
  }

  if (perspective === "tags") {
    return (
      <div className="view-options-content">
        <select
          value={shell.tagFilters.status}
          onChange={(event) => shell.setTagFilters({ status: event.target.value as TagFilters["status"] })}
        >
          <option value="all">All statuses</option>
          {TAG_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const label = perspective ? PERSPECTIVES.find((p) => p.key === perspective)?.label : null;
  return <p className="empty-hint">{label ? `No view options yet for ${label}.` : "No view options here."}</p>;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const perspective = getPerspectiveFromPath(pathname);
  const shell = useShellState();
  const { setMessage } = useStatusMessage();
  const { logout } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const utils = trpc.useUtils();
  const createProjectMutation = trpc.projects.create.useMutation();
  const createTagMutation = trpc.tags.create.useMutation();

  useKeyboardShortcuts({
    onToggleSidebar: shell.toggleSidebar,
    onToggleViewOptions: shell.toggleViewOptions,
    onToggleInspector: shell.toggleInspector,
    onQuickAdd: () => setQuickAddOpen(true),
  });

  function handleCleanUp() {
    const next = shell.toggleHideCompletedInTree();
    setMessage(next ? "Completed items hidden" : "Showing completed items");
  }

  async function handleGenericAdd() {
    if (perspective === "projects") {
      const project = await createProjectMutation.mutateAsync({ title: "Untitled Project" });
      utils.projects.list.invalidate();
      router.push(`/projects/${project.id}?focusTitle=1`);
    } else if (perspective === "tags") {
      const tag = await createTagMutation.mutateAsync({ title: "Untitled Tag" });
      utils.tags.list.invalidate();
      router.push(`/tags/${tag.id}?focusTitle=1`);
    } else if (perspective === "inbox") {
      setQuickAddOpen(true);
    }
  }

  return (
    <header className="app-header">
      <div className="header-group header-left">
        <Popover triggerClassName="icon-button" triggerLabel={<Icons.HamburgerIcon />}>
          {() => (
            <div className="sidebar-prefs-menu">
              <p className="popover-title">Show in sidebar</p>
              {PERSPECTIVES.map((p) => (
                <label key={p.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={shell.sidebarIconPrefs[p.key]}
                    onChange={(event) => shell.setSidebarIconVisible(p.key, event.target.checked)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          )}
        </Popover>

        <span className="header-divider" />

        <button
          type="button"
          className="icon-button"
          onClick={shell.toggleSidebar}
          title="Show/hide sidebar (Shift+S)"
        >
          <Icons.SidebarIcon />
        </button>
        <Popover
          open={shell.viewOptionsVisible}
          onOpenChange={shell.setViewOptionsVisible}
          triggerClassName="icon-button"
          triggerLabel={<Icons.EyeIcon />}
          triggerTitle="View options (V)"
        >
          {() => (
            <div className="view-options-popover">
              <p className="popover-title">View options</p>
              <ViewOptionsContent perspective={perspective} />
            </div>
          )}
        </Popover>
        <button type="button" className="icon-button" onClick={handleCleanUp} title="Clean up">
          <Icons.PaintbrushIcon />
        </button>
      </div>

      <div className="header-group header-center">
        <Popover
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          triggerClassName="icon-button"
          triggerLabel={<Icons.InboxPlusIcon />}
        >
          {(close) => <QuickAddInboxPopover onDone={close} />}
        </Popover>
        <button
          type="button"
          className="icon-button"
          onClick={handleGenericAdd}
          disabled={perspective === null || !CREATABLE_PERSPECTIVES.has(perspective)}
          title="New item"
        >
          <Icons.PlusIcon />
        </button>
      </div>

      <div className="header-group header-right">
        <button
          type="button"
          className="icon-button"
          onClick={shell.toggleInspector}
          title="Show/hide inspector (Shift+I)"
        >
          <Icons.InspectorIcon />
        </button>

        <span className="header-divider" />

        <Popover triggerClassName="icon-button" triggerLabel={<Icons.MenuDotsIcon />} align="end">
          {(close) => (
            <div className="create-menu">
              <button
                type="button"
                onClick={() => {
                  close();
                  router.push("/settings");
                }}
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  router.push("/account");
                }}
              >
                Manage Account
              </button>
              <hr className="menu-divider" />
              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}

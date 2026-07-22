"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/AuthProvider";
import { useShellState } from "../lib/ShellStateProvider";
import { useStatusMessage } from "../lib/StatusMessageProvider";
import { getPerspectiveFromPath, PERSPECTIVES } from "../lib/perspectives";
import { trpc } from "../lib/trpc";
import { useKeyboardShortcuts } from "../lib/useKeyboardShortcuts";
import * as Icons from "./icons";
import { Popover } from "./Popover";
import { QuickAddInboxPopover } from "./QuickAddInboxPopover";

const CREATABLE_PERSPECTIVES = new Set(["projects", "tags", "inbox"]);

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const perspective = getPerspectiveFromPath(pathname);
  const shell = useShellState();
  const { setMessage } = useStatusMessage();
  const { user, logout } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const utils = trpc.useUtils();
  const createProjectMutation = trpc.projects.create.useMutation();
  const createTagMutation = trpc.tags.create.useMutation();

  useKeyboardShortcuts({
    onToggleSidebar: shell.toggleSidebar,
    onToggleViewOptions: shell.toggleViewOptions,
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
              <p className="popover-title">Perspectives</p>
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
          title="Show or hide the sidebar (Shift+S)"
        >
          <Icons.SidebarIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={shell.toggleViewOptions}
          title="Change view options for the outline (V)"
        >
          <Icons.EyeIcon />
        </button>
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
          disabled={!CREATABLE_PERSPECTIVES.has(perspective)}
          title="New item"
        >
          <Icons.PlusIcon />
        </button>
      </div>

      <div className="header-group header-right">
        <span className="header-user">{user.name ?? user.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

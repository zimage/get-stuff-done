"use client";

import { useShellState } from "../lib/ShellStateProvider";

/**
 * Minimal context sidebar for perspectives that don't have real
 * container-list content yet (Forecast/Flagged/Completed/Changed) — a stub,
 * not a placeholder for missing functionality. Every non-Inbox perspective
 * gets a context sidebar; what belongs in these specifically hasn't been
 * spec'd yet.
 */
export function SimpleContextSidebar({ title }: { title: string }) {
  const shell = useShellState();
  if (!shell.sidebarVisible) return null;

  return (
    <div className="context-sidebar">
      {shell.viewOptionsVisible && (
        <div className="context-sidebar-view-options">
          <p className="popover-title">View options</p>
          <p className="empty-hint">No view options yet for {title}.</p>
        </div>
      )}
      <div className="context-sidebar-list">
        <p className="empty-hint">{title}</p>
      </div>
    </div>
  );
}

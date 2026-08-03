"use client";

import { useShellState } from "../lib/ShellStateProvider";

/**
 * Minimal context sidebar for perspectives that don't have real
 * container-list content yet (Forecast/Flagged/Completed/Changed) — a stub,
 * not a placeholder for missing functionality. Every non-Inbox perspective
 * gets a context sidebar; what belongs in these specifically hasn't been
 * spec'd yet. View options for these live in the header's popover.
 */
export function SimpleContextSidebar({ title }: { title: string }) {
  const shell = useShellState();
  if (!shell.sidebarVisible) return null;

  return (
    <div className="context-sidebar">
      <div className="context-sidebar-list">
        <p className="empty-hint">{title}</p>
      </div>
    </div>
  );
}

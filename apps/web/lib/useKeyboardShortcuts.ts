"use client";

import { useEffect } from "react";

export interface ShortcutHandlers {
  onToggleSidebar: () => void;
  onToggleViewOptions: () => void;
  onQuickAdd: () => void;
}

/** Shift+S toggles the sidebars, V toggles view options, C opens quick-add. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      if (isEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (event.shiftKey && key === "s") {
        event.preventDefault();
        handlers.onToggleSidebar();
        return;
      }
      if (!event.shiftKey && key === "v") {
        event.preventDefault();
        handlers.onToggleViewOptions();
        return;
      }
      if (!event.shiftKey && key === "c") {
        event.preventDefault();
        handlers.onQuickAdd();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers.onToggleSidebar, handlers.onToggleViewOptions, handlers.onQuickAdd]);
}

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PERSPECTIVES, type PerspectiveKey } from "./perspectives";

const SIDEBAR_PREFS_KEY = "gsd:sidebarIconPrefs";
const HIDE_COMPLETED_KEY = "gsd:hideCompletedInTree";

function defaultIconPrefs(): Record<PerspectiveKey, boolean> {
  return Object.fromEntries(PERSPECTIVES.map((p) => [p.key, true])) as Record<PerspectiveKey, boolean>;
}

interface ShellState {
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  viewOptionsVisible: boolean;
  toggleViewOptions: () => void;
  hideCompletedInTree: boolean;
  toggleHideCompletedInTree: () => boolean;
  sidebarIconPrefs: Record<PerspectiveKey, boolean>;
  setSidebarIconVisible: (key: PerspectiveKey, visible: boolean) => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellStateProvider({ children }: { children: ReactNode }) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewOptionsVisible, setViewOptionsVisible] = useState(false);
  const [hideCompletedInTree, setHideCompletedInTree] = useState(false);
  const [sidebarIconPrefs, setSidebarIconPrefs] = useState<Record<PerspectiveKey, boolean>>(defaultIconPrefs());

  // Hydrate persisted prefs after mount only, to avoid an SSR/client markup
  // mismatch (localStorage isn't available during server rendering).
  useEffect(() => {
    try {
      const rawPrefs = window.localStorage.getItem(SIDEBAR_PREFS_KEY);
      if (rawPrefs) setSidebarIconPrefs({ ...defaultIconPrefs(), ...JSON.parse(rawPrefs) });
      const rawHide = window.localStorage.getItem(HIDE_COMPLETED_KEY);
      if (rawHide) setHideCompletedInTree(rawHide === "true");
    } catch {
      // ignore malformed/unavailable localStorage
    }
  }, []);

  function setSidebarIconVisible(key: PerspectiveKey, visible: boolean) {
    setSidebarIconPrefs((prev) => {
      const next = { ...prev, [key]: visible };
      window.localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleHideCompletedInTree(): boolean {
    const next = !hideCompletedInTree;
    setHideCompletedInTree(next);
    window.localStorage.setItem(HIDE_COMPLETED_KEY, String(next));
    return next;
  }

  const value: ShellState = {
    sidebarVisible,
    toggleSidebar: () => setSidebarVisible((v) => !v),
    viewOptionsVisible,
    toggleViewOptions: () => setViewOptionsVisible((v) => !v),
    hideCompletedInTree,
    toggleHideCompletedInTree,
    sidebarIconPrefs,
    setSidebarIconVisible,
  };

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellState(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShellState must be used within ShellStateProvider");
  return ctx;
}

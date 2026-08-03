"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PERSPECTIVES, type PerspectiveKey } from "./perspectives";
import type { Selection } from "./selection";

const SIDEBAR_PREFS_KEY = "gsd:sidebarIconPrefs";
const HIDE_COMPLETED_KEY = "gsd:hideCompletedInTree";

function defaultIconPrefs(): Record<PerspectiveKey, boolean> {
  return Object.fromEntries(PERSPECTIVES.map((p) => [p.key, true])) as Record<PerspectiveKey, boolean>;
}

export interface ProjectFilters {
  status: "all" | "active" | "on_hold" | "completed" | "dropped";
  flaggedOnly: boolean;
}

export interface TagFilters {
  status: "all" | "active" | "on_hold" | "dropped";
}

interface ShellState {
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  viewOptionsVisible: boolean;
  toggleViewOptions: () => void;
  setViewOptionsVisible: (visible: boolean) => void;
  hideCompletedInTree: boolean;
  toggleHideCompletedInTree: () => boolean;
  sidebarIconPrefs: Record<PerspectiveKey, boolean>;
  setSidebarIconVisible: (key: PerspectiveKey, visible: boolean) => void;
  inspectorVisible: boolean;
  toggleInspector: () => void;
  selection: Selection;
  select: (selection: Selection) => void;
  projectFilters: ProjectFilters;
  setProjectFilters: (patch: Partial<ProjectFilters>) => void;
  tagFilters: TagFilters;
  setTagFilters: (patch: Partial<TagFilters>) => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellStateProvider({ children }: { children: ReactNode }) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewOptionsVisible, setViewOptionsVisible] = useState(false);
  const [hideCompletedInTree, setHideCompletedInTree] = useState(false);
  const [sidebarIconPrefs, setSidebarIconPrefs] = useState<Record<PerspectiveKey, boolean>>(defaultIconPrefs());
  const [inspectorVisible, setInspectorVisible] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [projectFilters, setProjectFiltersState] = useState<ProjectFilters>({
    status: "active",
    flaggedOnly: false,
  });
  const [tagFilters, setTagFiltersState] = useState<TagFilters>({ status: "active" });

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
    setViewOptionsVisible,
    hideCompletedInTree,
    toggleHideCompletedInTree,
    sidebarIconPrefs,
    setSidebarIconVisible,
    inspectorVisible,
    toggleInspector: () => setInspectorVisible((v) => !v),
    selection,
    select: setSelection,
    projectFilters,
    setProjectFilters: (patch) => setProjectFiltersState((prev) => ({ ...prev, ...patch })),
    tagFilters,
    setTagFilters: (patch) => setTagFiltersState((prev) => ({ ...prev, ...patch })),
  };

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellState(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShellState must be used within ShellStateProvider");
  return ctx;
}

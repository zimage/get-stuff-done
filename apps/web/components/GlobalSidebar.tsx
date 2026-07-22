"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShellState } from "../lib/ShellStateProvider";
import { getPerspectiveFromPath, PERSPECTIVES } from "../lib/perspectives";
import { PERSPECTIVE_ICONS } from "./icons";

export function GlobalSidebar() {
  const pathname = usePathname();
  const current = getPerspectiveFromPath(pathname);
  const shell = useShellState();

  if (!shell.sidebarVisible) return null;

  const visible = PERSPECTIVES.filter((p) => shell.sidebarIconPrefs[p.key]);

  return (
    <nav className="global-sidebar">
      {visible.map((p) => {
        const Icon = PERSPECTIVE_ICONS[p.key];
        return (
          <Link
            key={p.key}
            href={p.href}
            className={`global-sidebar-icon ${current === p.key ? "global-sidebar-icon-active" : ""}`}
            title={p.label}
          >
            <Icon />
          </Link>
        );
      })}
    </nav>
  );
}

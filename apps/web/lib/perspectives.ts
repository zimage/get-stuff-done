export type PerspectiveKey =
  | "inbox"
  | "projects"
  | "tags"
  | "forecast"
  | "flagged"
  | "completed"
  | "changed";

export interface PerspectiveDef {
  key: PerspectiveKey;
  label: string;
  href: string;
}

export const PERSPECTIVES: PerspectiveDef[] = [
  { key: "inbox", label: "Inbox", href: "/" },
  { key: "projects", label: "Projects", href: "/projects" },
  { key: "tags", label: "Tags", href: "/tags" },
  { key: "forecast", label: "Forecast", href: "/forecast" },
  { key: "flagged", label: "Flagged", href: "/flagged" },
  { key: "completed", label: "Completed", href: "/completed" },
  { key: "changed", label: "Changed", href: "/changed" },
];

export function getPerspectiveFromPath(pathname: string): PerspectiveKey | null {
  if (pathname === "/") return "inbox";
  const match = PERSPECTIVES.find((p) => p.key !== "inbox" && pathname.startsWith(p.href));
  return match?.key ?? null;
}

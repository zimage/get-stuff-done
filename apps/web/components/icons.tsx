import type { PerspectiveKey } from "../lib/perspectives";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HamburgerIcon() {
  return (
    <svg {...base}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function SidebarIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg {...base}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

export function PaintbrushIcon() {
  return (
    <svg {...base}>
      <path d="M4 20c0-3 2-4 4-4s3 1 3 3-1 2-2 2-2-1-2-1" />
      <path d="M9 15 18 6a2 2 0 0 1 3 3l-9 9" />
    </svg>
  );
}

export function InboxPlusIcon() {
  return (
    <svg {...base}>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5 12 6.5 5h11L19 12" />
      <path d="M12 15.5v-9" />
      <path d="M8.5 10.5h7" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...base}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function InboxIcon() {
  return (
    <svg {...base}>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5 12 6.5 5h11L19 12v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6Z" />
    </svg>
  );
}

export function ProjectsIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="6" width="16" height="13" rx="1.5" />
      <path d="M4 9h16" />
    </svg>
  );
}

export function TagsIcon() {
  return (
    <svg {...base}>
      <path d="M11 3h6a2 2 0 0 1 2 2v6l-9.5 9.5a1.5 1.5 0 0 1-2 0L3 16a1.5 1.5 0 0 1 0-2Z" />
      <circle cx="15" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ForecastIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

export function FlaggedIcon() {
  return (
    <svg {...base}>
      <path d="M6 3v18" />
      <path d="M6 4h11l-3 4 3 4H6" />
    </svg>
  );
}

export function CompletedIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9" />
    </svg>
  );
}

export function ChangedIcon() {
  return (
    <svg {...base}>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export const PERSPECTIVE_ICONS: Record<PerspectiveKey, () => React.JSX.Element> = {
  inbox: InboxIcon,
  projects: ProjectsIcon,
  tags: TagsIcon,
  forecast: ForecastIcon,
  flagged: FlaggedIcon,
  completed: CompletedIcon,
  changed: ChangedIcon,
};

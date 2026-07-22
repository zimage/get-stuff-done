import type { ReactNode } from "react";
import { ProjectsContextSidebar } from "./ProjectsContextSidebar";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-body">
      <ProjectsContextSidebar />
      <div className="app-main">{children}</div>
    </div>
  );
}

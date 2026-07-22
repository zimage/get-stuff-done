import type { ReactNode } from "react";
import { TagsContextSidebar } from "./TagsContextSidebar";

export default function TagsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-body">
      <TagsContextSidebar />
      <div className="app-main">{children}</div>
    </div>
  );
}

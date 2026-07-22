import type { ReactNode } from "react";
import { SimpleContextSidebar } from "../../components/SimpleContextSidebar";

export default function CompletedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-body">
      <SimpleContextSidebar title="Completed" />
      <div className="app-main">{children}</div>
    </div>
  );
}

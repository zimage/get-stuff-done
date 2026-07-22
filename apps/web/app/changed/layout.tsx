import type { ReactNode } from "react";
import { SimpleContextSidebar } from "../../components/SimpleContextSidebar";

export default function ChangedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-body">
      <SimpleContextSidebar title="Changed" />
      <div className="app-main">{children}</div>
    </div>
  );
}

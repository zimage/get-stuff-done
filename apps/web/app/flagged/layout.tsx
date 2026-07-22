import type { ReactNode } from "react";
import { SimpleContextSidebar } from "../../components/SimpleContextSidebar";

export default function FlaggedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-body">
      <SimpleContextSidebar title="Flagged" />
      <div className="app-main">{children}</div>
    </div>
  );
}

import type { ReactNode } from "react";
import { SimpleContextSidebar } from "../../components/SimpleContextSidebar";

export default function ForecastLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-body">
      <SimpleContextSidebar title="Forecast" />
      <div className="app-main">{children}</div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { ShellStateProvider } from "../lib/ShellStateProvider";
import { StatusMessageProvider } from "../lib/StatusMessageProvider";
import { GlobalSidebar } from "./GlobalSidebar";
import { Header } from "./Header";
import { Inspector } from "./Inspector";
import { StatusMessageBar } from "./StatusMessageBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellStateProvider>
      <StatusMessageProvider>
        <div className="app-shell">
          <Header />
          <StatusMessageBar />
          <div className="app-body">
            <GlobalSidebar />
            <div className="app-main">{children}</div>
            <Inspector />
          </div>
        </div>
      </StatusMessageProvider>
    </ShellStateProvider>
  );
}

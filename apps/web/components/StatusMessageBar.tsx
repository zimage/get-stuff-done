"use client";

import { useStatusMessage } from "../lib/StatusMessageProvider";

export function StatusMessageBar() {
  const { message } = useStatusMessage();
  return <div className="status-bar">{message ?? ""}</div>;
}

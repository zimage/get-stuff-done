import type { DragEvent } from "react";

export interface DragPayload {
  kind: "project" | "folder" | "tag";
  id: string;
}

const MIME_TYPE = "application/x-gsd-drag";

export function setDragPayload(event: DragEvent, payload: DragPayload) {
  event.dataTransfer.setData(MIME_TYPE, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = "move";
}

export function getDragPayload(event: DragEvent): DragPayload | null {
  try {
    const raw = event.dataTransfer.getData(MIME_TYPE);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

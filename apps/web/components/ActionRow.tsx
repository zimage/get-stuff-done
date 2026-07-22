"use client";

import { trpc } from "../lib/trpc";
import type { ActionEditValue } from "./ActionEditForm";

/** A single row for a flat (non-hierarchical) action list — Inbox, Tags, Flagged, Calendar. */
export function ActionRow({
  action,
  onEdit,
  onChanged,
  dateLabel,
}: {
  action: ActionEditValue;
  onEdit: (id: string) => void;
  onChanged: () => void;
  dateLabel?: string;
}) {
  const completeMutation = trpc.actions.complete.useMutation({ onSuccess: onChanged });
  const dropMutation = trpc.actions.drop.useMutation({ onSuccess: onChanged });

  return (
    <li>
      <button className="link-button" onClick={() => onEdit(action.id)}>
        {action.title}
      </button>
      {action.flagged && <span className="flag">⚑</span>}
      {dateLabel && <span className="action-date">{dateLabel}</span>}
      {action.status === "active" && (
        <div className="actions">
          <button onClick={() => completeMutation.mutate({ id: action.id })}>Complete</button>
          <button onClick={() => dropMutation.mutate({ id: action.id })}>Drop</button>
        </div>
      )}
    </li>
  );
}

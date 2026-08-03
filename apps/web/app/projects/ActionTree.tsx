"use client";

import { useMemo, type ReactNode } from "react";
import type { ActionEditValue } from "../../components/ActionEditForm";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";

type TreeAction = ActionEditValue & { parentActionId: string | null };

export function ActionTree({
  actions,
  actionableActionIds,
  projectId,
}: {
  actions: TreeAction[];
  actionableActionIds: Set<string>;
  projectId: string;
}) {
  const utils = trpc.useUtils();
  const invalidate = () => utils.projects.get.invalidate({ id: projectId });
  const { hideCompletedInTree, select } = useShellState();

  const completeMutation = trpc.actions.complete.useMutation({ onSuccess: invalidate });
  const dropMutation = trpc.actions.drop.useMutation({ onSuccess: invalidate });

  // Clean-up hides completed/dropped actions — filtering the flat list before
  // building the tree means a non-active parent takes its (moot) children
  // with it, consistent with computeActionable's own ancestor-status rule.
  const visibleActions = hideCompletedInTree ? actions.filter((a) => a.status === "active") : actions;

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, TreeAction[]>();
    for (const action of visibleActions) {
      const list = map.get(action.parentActionId) ?? [];
      list.push(action);
      map.set(action.parentActionId, list);
    }
    return map;
  }, [visibleActions]);

  function renderGroup(parentId: string | null): ReactNode {
    const group = childrenByParent.get(parentId);
    if (!group || group.length === 0) return null;

    return (
      <ul className="action-tree">
        {group.map((action) => (
          <li key={action.id}>
            <div className="action-row">
              <button
                className={`link-button ${actionableActionIds.has(action.id) ? "action-actionable" : "action-blocked"}`}
                onClick={() => select({ type: "action", id: action.id })}
              >
                {action.title}
              </button>
              {action.flagged && <span className="flag">⚑</span>}
              {action.status !== "active" && <span className="action-status">({action.status})</span>}
              {action.status === "active" && (
                <span className="actions">
                  <button onClick={() => completeMutation.mutate({ id: action.id })}>Complete</button>
                  <button onClick={() => dropMutation.mutate({ id: action.id })}>Drop</button>
                </span>
              )}
            </div>
            {renderGroup(action.id)}
          </li>
        ))}
      </ul>
    );
  }

  const tree = renderGroup(null);

  return tree ?? <p className="empty-hint">No actions yet.</p>;
}

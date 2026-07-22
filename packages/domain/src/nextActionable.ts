import type { ActionNode, ProjectType } from "./types.js";

/**
 * Computes which actions are the GTD "next actionable" items for display.
 *
 * An action is eligible at all only if it's active, not deferred into the
 * future, and every ancestor (via parentActionId) is itself active — a
 * dropped/completed parent moots its children regardless of their own dates.
 * Within each sibling group, `sequential` projects surface only the lowest
 * sortOrder eligible sibling; `parallel`/`single_actions` surface all of them.
 */
export function computeActionable(
  actions: ActionNode[],
  projectType: ProjectType,
  now: Date = new Date(),
): Set<string> {
  const byId = new Map(actions.map((a) => [a.id, a]));

  const childrenByParent = new Map<string | null, ActionNode[]>();
  for (const action of actions) {
    const list = childrenByParent.get(action.parentActionId) ?? [];
    list.push(action);
    childrenByParent.set(action.parentActionId, list);
  }

  function ancestorsActive(action: ActionNode): boolean {
    const visited = new Set<string>([action.id]);
    let current = action.parentActionId ? byId.get(action.parentActionId) : undefined;
    while (current) {
      if (current.status !== "active") return false;
      if (visited.has(current.id)) return false; // corrupt data guard, not a real cycle
      visited.add(current.id);
      current = current.parentActionId ? byId.get(current.parentActionId) : undefined;
    }
    return true;
  }

  function isEligible(action: ActionNode): boolean {
    if (action.status !== "active") return false;
    if (action.deferredDate && action.deferredDate.getTime() > now.getTime()) return false;
    return ancestorsActive(action);
  }

  const result = new Set<string>();
  for (const siblings of childrenByParent.values()) {
    const eligible = siblings.filter(isEligible);
    if (eligible.length === 0) continue;

    if (projectType === "sequential") {
      const next = eligible.reduce((min, a) => (a.sortOrder < min.sortOrder ? a : min));
      result.add(next.id);
    } else {
      for (const a of eligible) result.add(a.id);
    }
  }

  return result;
}

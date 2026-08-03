import { describe, expect, it } from "vitest";
import { computeActionable } from "./nextActionable.js";
import type { ActionNode } from "./types.js";

const NOW = new Date("2026-07-22T12:00:00Z");

function action(overrides: Partial<ActionNode> & { id: string }): ActionNode {
  return {
    parentActionId: null,
    status: "active",
    deferredDate: null,
    sortOrder: 0,
    type: "parallel",
    ...overrides,
  };
}

describe("computeActionable", () => {
  it("parallel: all eligible top-level actions are actionable", () => {
    const actions = [action({ id: "a" }), action({ id: "b" }), action({ id: "c", status: "dropped" })];
    const result = computeActionable(actions, "parallel", NOW);
    expect(result).toEqual(new Set(["a", "b"]));
  });

  it("single_actions behaves identically to parallel", () => {
    const actions = [action({ id: "a" }), action({ id: "b" })];
    expect(computeActionable(actions, "single_actions", NOW)).toEqual(new Set(["a", "b"]));
  });

  it("excludes actions deferred into the future", () => {
    const future = new Date(NOW.getTime() + 86_400_000);
    const actions = [action({ id: "a" }), action({ id: "b", deferredDate: future })];
    expect(computeActionable(actions, "parallel", NOW)).toEqual(new Set(["a"]));
  });

  it("includes actions whose defer date has already passed", () => {
    const past = new Date(NOW.getTime() - 86_400_000);
    const actions = [action({ id: "a", deferredDate: past })];
    expect(computeActionable(actions, "parallel", NOW)).toEqual(new Set(["a"]));
  });

  it("sequential: only the lowest sortOrder eligible sibling is actionable", () => {
    const actions = [
      action({ id: "a", sortOrder: 2 }),
      action({ id: "b", sortOrder: 0 }),
      action({ id: "c", sortOrder: 1 }),
    ];
    expect(computeActionable(actions, "sequential", NOW)).toEqual(new Set(["b"]));
  });

  it("sequential: skips completed/dropped siblings when picking the next one", () => {
    const actions = [
      action({ id: "a", sortOrder: 0, status: "completed" }),
      action({ id: "b", sortOrder: 1 }),
      action({ id: "c", sortOrder: 2 }),
    ];
    expect(computeActionable(actions, "sequential", NOW)).toEqual(new Set(["b"]));
  });

  it("a dropped parent moots its children regardless of the children's own status", () => {
    const actions = [
      action({ id: "parent", status: "dropped" }),
      action({ id: "child", parentActionId: "parent" }),
    ];
    expect(computeActionable(actions, "parallel", NOW)).toEqual(new Set());
  });

  it("recurses per sibling group, using each parent action's own type for its children", () => {
    const actions = [
      action({ id: "top", sortOrder: 0, type: "sequential" }),
      action({ id: "child-a", parentActionId: "top", sortOrder: 0 }),
      action({ id: "child-b", parentActionId: "top", sortOrder: 1 }),
    ];
    // "top" itself has no siblings so it's actionable; its own type governs
    // its children, picking only child-a.
    expect(computeActionable(actions, "parallel", NOW)).toEqual(new Set(["top", "child-a"]));
  });

  it("a parent action's own sequential type applies even in a parallel project", () => {
    const actions = [
      action({ id: "top", type: "sequential" }),
      action({ id: "child-a", parentActionId: "top", sortOrder: 0 }),
      action({ id: "child-b", parentActionId: "top", sortOrder: 1 }),
    ];
    expect(computeActionable(actions, "parallel", NOW)).toEqual(new Set(["top", "child-a"]));
  });

  it("a parent action's own parallel type applies even in a sequential project", () => {
    const actions = [
      action({ id: "top", type: "parallel" }),
      action({ id: "child-a", parentActionId: "top", sortOrder: 0 }),
      action({ id: "child-b", parentActionId: "top", sortOrder: 1 }),
    ];
    // The project is sequential, so only "top" (the sole top-level action)
    // would matter there — but its children are governed by its own
    // (parallel) type, surfacing both.
    expect(computeActionable(actions, "sequential", NOW)).toEqual(new Set(["top", "child-a", "child-b"]));
  });
});

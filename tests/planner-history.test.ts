import { expect, test } from "bun:test";
import {
  rememberPlannerChange,
  undoPlannerChange,
  type PlannerCheckpoint,
} from "../src/lib/planner-history";
const checkpoint: PlannerCheckpoint = {
  classIndex: 6,
  ascendancy: "Warrior1",
  mode: 2,
  selected: "c",
  plan: { shared: ["a"], weapon1: ["b"], weapon2: ["c"] },
};
test("undo restores complete planning context and independent immutable allocations", () => {
  const original = structuredClone(checkpoint);
  const history = rememberPlannerChange([], original);
  original.plan.weapon2.push("later");
  const restored = undoPlannerChange(history);
  expect(restored.checkpoint).toEqual(checkpoint);
  expect(restored.history).toHaveLength(0);
  expect(history).toHaveLength(1);
  expect(undoPlannerChange([]).checkpoint).toBeUndefined();
});
test("undo retains the most recent fifty changes in order", () => {
  let history: PlannerCheckpoint[] = [];
  for (let i = 0; i < 55; i++)
    history = rememberPlannerChange(history, { ...checkpoint, classIndex: i });
  expect(history).toHaveLength(50);
  const latest = undoPlannerChange(history);
  expect(latest.checkpoint?.classIndex).toBe(54);
  expect(latest.history[0].classIndex).toBe(5);
});

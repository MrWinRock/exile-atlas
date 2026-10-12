import { expect, test } from "bun:test";
import {
  createGenesisPlan,
  genesisPath,
  allocateGenesisPath,
  refundGenesisNode,
  genesisCounts,
  validateGenesisPlan,
} from "../src/lib/genesis-plan";
import type { GenesisData } from "../src/lib/genesis-data";
const fixture: GenesisData = {
  identity: "fixture",
  source: "https://example.com",
  captured: "2026-07-04",
  patch: "fixture",
  historical: true,
  wombgifts: [],
  nodes: [
    { id: "root", name: "Root", branch: "Currency", x: 0, y: 0, effects: [], root: true },
    { id: "a", name: "Repeated", branch: "Currency", x: 1, y: 0, effects: ["a"], root: false },
    { id: "b", name: "Repeated", branch: "Currency", x: 2, y: 0, effects: ["b"], root: false },
    { id: "ring", name: "Root", branch: "Rings", x: 10, y: 0, effects: [], root: true },
    { id: "c", name: "Ring node", branch: "Rings", x: 11, y: 0, effects: [], root: false },
    { id: "orphan", name: "Orphan", branch: "Currency", x: 9, y: 0, effects: [], root: false },
  ],
  edges: [
    ["root", "a"],
    ["a", "b"],
    ["ring", "c"],
  ],
};
test("allocation is connected, immutable, counts roots correctly, and preserves branch isolation", () => {
  const p = createGenesisPlan(fixture);
  const result = allocateGenesisPath(fixture, p, "b");
  expect(result.error).toBeUndefined();
  expect(result.plan.allocated).toEqual(["a", "b"]);
  expect(p.allocated).toEqual([]);
  expect(genesisCounts(fixture, result.plan).Currency).toBe(2);
  expect(genesisPath(fixture, p, "orphan").error).toBeDefined();
  const ring = allocateGenesisPath(fixture, result.plan, "c").plan;
  expect(genesisCounts(fixture, ring).Rings).toBe(1);
  expect(refundGenesisNode(fixture, ring, "a").allocated).toEqual(["c"]);
});
test("refund does not silently discard unresolved imported IDs", () => {
  const p = { ...createGenesisPlan(fixture), allocated: ["a", "obsolete"] };
  expect(refundGenesisNode(fixture, p, "a").allocated).toEqual(["a", "obsolete"]);
});
test("budgets, stale IDs and mismatched datasets block mutation", () => {
  const p = { ...createGenesisPlan(fixture), budgets: { Currency: 1 } };
  expect(allocateGenesisPath(fixture, p, "b").error).toBeDefined();
  expect(p.allocated).toEqual([]);
  expect(allocateGenesisPath(fixture, p, "a").plan.allocated).toEqual(["a"]);
  expect(validateGenesisPlan(fixture, { ...p, dataset: "other" }).length).toBeGreaterThan(0);
  expect(validateGenesisPlan(fixture, { ...p, allocated: ["unknown"] }).length).toBeGreaterThan(0);
});
test("one branch exceeding its planning budget does not block another branch", () => {
  const p = {
    ...allocateGenesisPath(fixture, createGenesisPlan(fixture), "b").plan,
    budgets: { Currency: 0 },
  };
  const result = allocateGenesisPath(fixture, p, "c");
  expect(result.error).toBeUndefined();
  expect(result.plan.allocated).toEqual(["a", "b", "c"]);
});
test("explicit connection repair preserves planned descendants and unrelated branches", async () => {
  const { repairGenesisPlan } = await import("../src/lib/genesis-plan");
  const p = { ...createGenesisPlan(fixture), allocated: ["b", "c", "root"] };
  const result = repairGenesisPlan(fixture, p);
  expect(result.error).toBeUndefined();
  expect(new Set(result.plan.allocated)).toEqual(new Set(["a", "b", "c"]));
  expect(p.allocated).toEqual(["b", "c", "root"]);
  expect(repairGenesisPlan(fixture, { ...p, allocated: ["obsolete"] }).error).toBeDefined();
});

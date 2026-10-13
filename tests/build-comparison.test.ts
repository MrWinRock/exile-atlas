import { expect, test } from "bun:test";
import { compareBuilds, exportBuildComparison } from "../src/lib/build-comparison";
import { normalizeTree } from "../src/lib/tree";
test("reordered duplicate entries retain equal facts and explicit ambiguity diagnostics", () => {
  const a = {
    name: "A",
    skills: [
      { id: "fire", additional_text: "one" },
      { id: "fire", additional_text: "two" },
    ],
    inventory_slots: [
      { inventory_id: "Weapon1", additional_text: "first" },
      { inventory_id: "Weapon1", additional_text: "second" },
    ],
  };
  const b = {
    ...a,
    skills: [...a.skills].reverse(),
    inventory_slots: [...a.inventory_slots].reverse(),
  };
  const d = compareBuilds(a, b);
  expect(d.hasChanges).toBe(false);
  expect(d.unresolved.some((s) => s.includes("duplicate skill identity"))).toBe(true);
  expect(d.unresolved.some((s) => s.includes("duplicate inventory identity"))).toBe(true);
});
const tree = normalizeTree({
  nodes: {
    a: { id: "a", name: "A", x: 0, y: 0 },
    b: { id: "b", name: "B", x: 1, y: 0 },
    c: { id: "c", name: "C", x: 2, y: 0 },
    d: { id: "d", name: "D", x: 3, y: 0 },
    e: { id: "e", name: "E", x: 4, y: 0 },
    f: { id: "f", name: "F", x: 5, y: 0 },
    g: { id: "g", name: "G", x: 6, y: 0 },
  },
});
test("same builds compare equal and weapon membership changes remain removal plus addition", () => {
  const left = { name: "Build", passives: [{ id: "a", weapon_set: 1 }] },
    right = { name: "Build", passives: [{ id: "a", weapon_set: 2 }] };
  expect(compareBuilds(left, left, tree).hasChanges).toBe(false);
  const diff = compareBuilds(left, right, tree);
  expect(diff.passives.removed[0].weapon_set).toBe(1);
  expect(diff.passives.added[0].weapon_set).toBe(2);
  expect(compareBuilds(right, left, tree).passives.added).toEqual(diff.passives.removed);
  expect(left.passives[0].weapon_set).toBe(1);
});
test("point budgets reuse weapon sets, unknown IDs survive and reports have their own format", () => {
  const b = {
    name: "Build",
    passives: [
      "a",
      "b",
      { id: "c", weapon_set: 1 },
      { id: "d", weapon_set: 1 },
      { id: "e", weapon_set: 2 },
      { id: "f", weapon_set: 2 },
      { id: "g", weapon_set: 2 },
    ],
  };
  const d = compareBuilds(b, { ...b, passives: [...b.passives, "unknown"] }, tree);
  expect(d.counts.left.regular).toBe(5);
  expect(d.unresolved).toContain("right: unknown");
  const r = exportBuildComparison(
    [
      { name: "Left", id: "l" },
      { name: "Right", id: "r" },
    ],
    d,
    { tree: "fixture" },
  );
  expect(r.format).toBe("exile-atlas-build-comparison");
  expect(r.version).toBe(1);
});
test("support, inventory, interval and note differences are retained without input mutation", () => {
  const a = {
    name: "A",
    skills: [{ id: "fire", support_skills: ["support-a"] }],
    inventory_slots: [{ inventory_id: "Weapon1", additional_text: "Old" }],
  };
  const b = {
    name: "A",
    skills: [{ id: "fire", support_skills: ["support-b"] }],
    inventory_slots: [{ inventory_id: "Weapon1", additional_text: "New" }],
  };
  const before = JSON.stringify(a);
  const d = compareBuilds(a, b, tree);
  expect(d.skills.changed).toHaveLength(1);
  expect(d.inventory.changed).toHaveLength(1);
  expect(JSON.stringify(a)).toBe(before);
});

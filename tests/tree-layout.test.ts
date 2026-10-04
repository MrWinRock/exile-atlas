import { expect, test } from "bun:test";
import { normalizeTree, allocationPath, passiveRadius } from "../src/lib/tree";
import { plannerTree, fitTreeView } from "../src/lib/tree-layout";

const source = () =>
  normalizeTree({
    nodes: {
      "1": { id: "base", x: 1500, y: 0, out: ["2"] },
      "2": { id: "asc-a", x: -20100, y: 4000, ascendancyId: "Warrior1", out: ["3"] },
      "3": { id: "asc-b", x: -19900, y: 4200, ascendancyId: "Warrior1", out: [] },
      "4": { id: "other", x: -23000, y: 6000, ascendancyId: "Warrior2", out: [] },
      "5": { id: "decoration", x: -20000, y: 4100, ascendancyId: "Warrior1", isMastery: true },
    },
    edges: [{ from: 2, to: 3, orbitX: -20000, orbitY: 4000 }],
  });

test("centers the selected ascendancy without moving base passives or mutating the export", () => {
  const original = source(),
    before = structuredClone(original);
  const view = plannerTree(original, "Warrior1");
  expect(view.nodes.map((n) => [n.id, n.x, n.y])).toEqual([
    ["base", 1500, 0],
    ["asc-a", -100, -100],
    ["asc-b", 100, 100],
    ["decoration", 0, 0],
  ]);
  expect(view.edgeArcs?.["2:3"]).toEqual({ x: 0, y: -100 });
  expect(allocationPath(view, ["1"], "3")).toEqual(["2", "3"]);
  expect(original).toEqual(before);
  expect(plannerTree(original, "").nodes.map((n) => n.id)).toEqual(["base"]);
});

test("fits the selected ascendancy at the viewport center instead of including distant base nodes", () => {
  const view = plannerTree(source(), "Warrior1");
  for (const [width, height] of [
    [1200, 600],
    [320, 440],
  ]) {
    const camera = fitTreeView(view, width, height, "Warrior1");
    expect(camera.x).toBe(width / 2);
    expect(camera.y).toBe(height / 2);
    for (const node of view.nodes.filter(
      (n) => n.ascendancy === "Warrior1" && n.kind !== "mastery",
    )) {
      const x = camera.x + node.x * camera.scale,
        y = camera.y + node.y * camera.scale;
      const radius = passiveRadius(node) * camera.scale;
      expect(x - radius).toBeGreaterThanOrEqual(30);
      expect(x + radius).toBeLessThanOrEqual(width - 30);
      expect(y - radius).toBeGreaterThanOrEqual(30);
      expect(y + radius).toBeLessThanOrEqual(height - 30);
    }
  }
});

test("large ascendancies fit the central opening with their node frames scaled together", () => {
  const tree = normalizeTree({
    nodes: {
      "1": { id: "base", x: 1500, y: 0 },
      "2": { id: "large-a", x: -22000, y: 5000, ascendancyId: "A", out: ["3"] },
      "3": { id: "large-b", x: -18000, y: 5000, ascendancyId: "A" },
    },
  });
  const view = plannerTree(tree, "A");
  const a = view.nodes[1],
    b = view.nodes[2];
  for (const node of [a, b])
    expect(
      Math.hypot(node.x, node.y) + passiveRadius(node) + 8 * (node.displayScale ?? 1),
    ).toBeLessThanOrEqual(1100.00001);
  expect(passiveRadius(a)).toBeLessThan(35);
  expect(a.x).toBeCloseTo(-b.x);
  expect(view.nodes[0].x).toBe(1500);
  const camera = fitTreeView(view, 320, 440, "A");
  for (const node of [a, b]) {
    const x = camera.x + node.x * camera.scale,
      radius = passiveRadius(node) * camera.scale;
    expect(x - radius).toBeGreaterThanOrEqual(60);
    expect(x + radius).toBeLessThanOrEqual(260);
  }
});

test("missing ascendancy data falls back to a finite base-tree camera", () => {
  const view = plannerTree(source(), "unknown");
  expect(view.nodes.map((n) => n.id)).toEqual(["base"]);
  const camera = fitTreeView(view, 600, 400, "unknown");
  expect(camera.x + view.nodes[0].x * camera.scale).toBe(300);
  expect(camera.y).toBe(200);
  expect(Object.values(fitTreeView({ ...view, nodes: [] }, 320, 440)).every(Number.isFinite)).toBe(
    true,
  );
});

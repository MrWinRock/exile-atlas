import { expect, test } from "bun:test";
import {
  normalizeTree,
  allocationPath,
  edgeKey,
  connectionArc,
  passiveRadius,
  isAllocatablePassive,
  validAllocations,
} from "../src/lib/tree";
test("uses official coordinates and passive IDs and ignores the synthetic root", () => {
  const tree = normalizeTree({
    nodes: {
      root: { out: ["1"] },
      placeholder: { id: null, name: "", x: 0, y: 0, out: [] },
      "1": {
        id: "strength89",
        name: "Strength",
        x: 100,
        y: 200,
        out: ["2"],
        stats: ["+5 Strength"],
      },
      "2": { id: "melee17", name: "Melee Damage", x: 200, y: 200, out: [], stats: [] },
    },
    classes: [],
  });
  expect(tree.nodes).toHaveLength(2);
  expect(tree.nodes[0].id).toBe("strength89");
  expect(tree.nodes[0].x).toBe(100);
  expect(tree.edges).toEqual([["1", "2"]]);
});
test("connects a target to an allocated node using actual edges", () => {
  const tree = normalizeTree({
    nodes: {
      "1": { id: "a", x: 0, y: 0, out: ["2"] },
      "2": { id: "b", x: 1, y: 0, out: ["3"] },
      "3": { id: "c", x: 2, y: 0, out: [] },
    },
    classes: [],
  });
  expect(allocationPath(tree, ["1"], "3")).toEqual(["2", "3"]);
  expect(allocationPath(tree, ["1"], "missing")).toEqual([]);
});
test("preserves exported orbit centers without moving either endpoint", () => {
  const tree = normalizeTree({
    nodes: {
      "42761": { id: "AscendancyDruid1Start", x: -22597.4, y: -2727.53, out: ["11335"] },
      "11335": { id: "AscendancyDruid1Small1", x: -22256.7, y: -2244.46, out: [] },
    },
    edges: [
      { from: "root", to: 42761 },
      { from: 42761, to: 11335, orbit: 8, orbitX: -23478.3, orbitY: -1744.49 },
    ],
  });
  expect(tree.edgeArcs?.[edgeKey("11335", "42761")]).toEqual({ x: -23478.3, y: -1744.49 });
  expect(tree.nodes.map(({ x, y }) => [x, y])).toEqual([
    [-22256.7, -2244.46],
    [-22597.4, -2727.53],
  ]);
  expect(allocationPath(tree, ["42761"], "11335")).toEqual(["11335"]);
});
test("orbit connections follow the short arc across the angle boundary", () => {
  const center = { x: 400, y: -100 };
  const point = (angle: number) => ({
    x: center.x + 200 * Math.cos(angle),
    y: center.y + 200 * Math.sin(angle),
  });
  const a = point((350 * Math.PI) / 180),
    b = point((10 * Math.PI) / 180);
  const arc = connectionArc(a, b, center)!;
  expect(arc.radius).toBeCloseTo(200);
  expect(arc.end - arc.start).toBeCloseTo((20 * Math.PI) / 180);
  expect(arc.anticlockwise).toBe(false);
  const reverse = connectionArc(b, a, center)!;
  expect(reverse.end - reverse.start).toBeCloseTo((-20 * Math.PI) / 180);
  expect(reverse.anticlockwise).toBe(true);
  expect(connectionArc(a, b)).toBeUndefined();
  expect(connectionArc(center, b, center)).toBeUndefined();
});
test("decorative masteries and item-only nodes cannot intercept passive allocation", () => {
  const tree = normalizeTree({
    nodes: {
      "1": { id: "real", x: 0, y: 0, out: ["2", "3"] },
      "2": { id: "mastery", x: 0, y: 0, isMastery: true, out: ["4"] },
      "3": { id: "anoint", x: 100, y: 0, isBlighted: true, out: [] },
      "4": { id: "target", x: 200, y: 0, out: [] },
    },
  });
  expect(tree.nodes.filter(isAllocatablePassive).map((n) => n.id)).toEqual(["real", "target"]);
  expect(validAllocations(tree, ["1", "2", "3", "missing"])).toEqual(["1"]);
  expect(passiveRadius(tree.nodes[1])).toBe(0);
  expect(allocationPath(tree, ["1"], "2")).toEqual([]);
  expect(allocationPath(tree, ["1"], "3")).toEqual([]);
  expect(allocationPath(tree, ["1"], "4")).toEqual([]);
});
test("frames and hit areas fit closely spaced official passives", () => {
  // Two notable nodes in the Shimmering cluster are only 170 export units apart.
  const tree = normalizeTree({
    nodes: {
      "1": { id: "evasion_and_energy_shield14", x: 0, y: 0, isNotable: true },
      "2": { id: "evasion_and_energy_shield15", x: 170, y: 0, isNotable: true },
      "3": { id: "normal", x: 170, y: 142, out: [] },
    },
  });
  const [a, b, c] = tree.nodes;
  expect(passiveRadius(a) + passiveRadius(b) + 16).toBeLessThan(Math.hypot(a.x - b.x, a.y - b.y));
  expect(passiveRadius(b) + passiveRadius(c) + 16).toBeLessThan(Math.hypot(b.x - c.x, b.y - c.y));
});

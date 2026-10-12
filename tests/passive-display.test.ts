import { expect, test } from "bun:test";
import { edgeMembership, passiveMembership, visiblePassiveIds } from "../src/lib/passive-display";
import { passiveEdgeColor } from "../src/lib/passive-colors";

const display = { shared: ["a", "r"], weapon1: ["b", "d"], weapon2: ["c", "d"], mode: 1 as const, showBoth: true };
test("both-set view retains duplicated membership without connecting unrelated branches", () => {
  expect(passiveMembership(display, "d")).toEqual([1, 2]);
  expect(edgeMembership(display, "b", "c")).toEqual([]);
  expect(edgeMembership(display, "a", "d")).toEqual([1, 2]);
  expect(edgeMembership(display, "a", "r")).toEqual([0]);
  expect(visiblePassiveIds(display)).toEqual(["a", "r", "b", "d", "c"]);
  expect(visiblePassiveIds({...display, showBoth:false})).toEqual(["a", "r", "b", "d"]);
  expect(display.weapon2).toEqual(["c", "d"]);
});
test("a weapon branch is drawn red for I and green for II", () => {
  expect(passiveEdgeColor("a", "b", new Set(["b"]), 1)).toBe(0xe67878);
  expect(passiveEdgeColor("a", "c", new Set(["c"]), 2)).toBe(0x74c99a);
});

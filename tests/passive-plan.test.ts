import { describe, expect, test } from "bun:test";
import { normalizeTree } from "../src/lib/tree";
import {
  allocatePassive,
  refundPassive,
  normalizePassivePlan,
  passiveBudget,
  buildPassives,
} from "../src/lib/passive-plan";

const tree = normalizeTree({
  nodes: {
    root: { id: "start", x: 0, y: 0, classStartIndex: 0, out: ["a", "other"] },
    other: { id: "otherstart", x: -100, y: 0, classStartIndex: 1, out: ["shortcut"] },
    shortcut: { id: "shortcut", x: -200, y: 0 },
    a: { id: "shared-a", x: 100, y: 0, out: ["b", "x"] },
    b: { id: "shared-b", x: 200, y: 0, out: ["c"] },
    c: { id: "first-c", x: 300, y: 0, out: ["d"] },
    d: { id: "first-d", x: 400, y: 0 },
    x: { id: "second-x", x: 100, y: 100, out: ["y"] },
    y: { id: "second-y", x: 100, y: 200 },
    asc: {
      id: "ascstart",
      x: 0,
      y: -100,
      isAscendancyStart: true,
      ascendancyId: "Test1",
      out: ["asc1"],
    },
    asc1: { id: "asc-one", x: 0, y: -200, ascendancyId: "Test1", out: ["asc2"] },
    asc2: { id: "asc-two", x: 0, y: -300, ascendancyId: "Test1" },
    wrong: { id: "other-asc", x: -300, y: -300, ascendancyId: "Test2" },
  },
});
const empty = { shared: [], weapon1: [], weapon2: [] };
const plan = { shared: ["a", "b"], weapon1: ["c", "d"], weapon2: ["x", "y"] };

describe("weapon-set passive planning", () => {
  test("keystones and jewel sockets must be shared before weapon paths cross them", () => {
    const restricted = normalizeTree({
      nodes: {
        root: { id: "start", x: 0, y: 0, classStartIndex: 0, out: ["key"] },
        key: { id: "keystone", x: 100, y: 0, isKeystone: true, out: ["socket"] },
        socket: { id: "jewel", x: 200, y: 0, isJewelSocket: true, out: ["target"] },
        target: { id: "normal", x: 300, y: 0 },
      },
    });
    expect(allocatePassive(restricted, 0, "", empty, 1, "key").error).toContain("shared");
    expect(allocatePassive(restricted, 0, "", empty, 2, "socket").added).toBe(0);
    expect(allocatePassive(restricted, 0, "", empty, 1, "target").added).toBe(0);
    const shared = allocatePassive(restricted, 0, "", empty, 0, "socket").plan;
    expect(allocatePassive(restricted, 0, "", shared, 1, "target").plan).toEqual({
      shared: ["key", "socket"],
      weapon1: ["target"],
      weapon2: [],
    });
    expect(
      normalizePassivePlan(restricted, 0, "", {
        shared: [],
        weapon1: ["key", "socket", "target"],
        weapon2: [],
      }),
    ).toEqual(empty);
  });
  test("refunds ascendancy descendants without touching either weapon set", () => {
    const result = refundPassive(
      tree,
      0,
      "Test1",
      { ...plan, shared: [...plan.shared, "asc1", "asc2"] },
      2,
      "asc1",
    );
    expect(result.plan).toEqual(plan);
    expect(result.removed).toBe(2);
  });
  test("allocates a connected path only in the chosen set", () => {
    const result = allocatePassive(tree, 0, "", { ...empty, shared: ["a"] }, 1, "d");
    expect(result.plan).toEqual({ shared: ["a"], weapon1: ["b", "c", "d"], weapon2: [] });
    expect(result.added).toBe(3);
    expect(result.error).toBeUndefined();
  });
  test("never bridges a weapon set through the other set's exclusive nodes", () => {
    const result = allocatePassive(tree, 0, "", { ...empty, weapon1: ["a", "b", "c"] }, 2, "d");
    expect(result.plan.weapon2).toEqual(["a", "b", "c", "d"]);
  });
  test("promoting a path to shared removes duplicate set charges", () => {
    const result = allocatePassive(tree, 0, "", plan, 0, "d");
    expect(result.plan).toEqual({ shared: ["a", "b", "c", "d"], weapon1: [], weapon2: ["x", "y"] });
  });
  test("refunding a shared bridge prunes dependent nodes from both sets", () => {
    const result = refundPassive(tree, 0, "", plan, 0, "a");
    expect(result.plan).toEqual(empty);
    expect(result.removed).toBe(6);
  });
  test("refunding a set bridge leaves the shared plan and other set intact", () => {
    const result = refundPassive(tree, 0, "", plan, 1, "c");
    expect(result.plan).toEqual({ shared: ["a", "b"], weapon1: [], weapon2: ["x", "y"] });
    expect(result.removed).toBe(2);
  });
  test("ascendancy roots allocate in shared even while editing a weapon set", () => {
    const result = allocatePassive(tree, 0, "Test1", empty, 2, "asc2");
    expect(result.plan).toEqual({ shared: ["asc1", "asc2"], weapon1: [], weapon2: [] });
    expect(passiveBudget(tree, result.plan)).toEqual({
      shared: 0,
      weapon1: 0,
      weapon2: 0,
      regular: 0,
      ascendancy: 2,
    });
  });
  test("class starts and unavailable ascendancies cannot be allocated or used as shortcuts", () => {
    expect(allocatePassive(tree, 0, "", empty, 0, "shortcut").error).toBeDefined();
    expect(allocatePassive(tree, 0, "", empty, 1, "other").added).toBe(0);
    expect(
      normalizePassivePlan(tree, 0, "", {
        ...empty,
        shared: ["asc1", "wrong", "a", "a", "missing"],
      }).shared,
    ).toEqual(["a"]);
  });
  test("both sets reuse regular points instead of adding their budgets", () => {
    expect(passiveBudget(tree, plan)).toEqual({
      shared: 2,
      weapon1: 2,
      weapon2: 2,
      regular: 4,
      ascendancy: 0,
    });
  });
  test("set passives survive official build export with weapon_set I=1 and II=2", () => {
    expect(buildPassives(tree, plan)).toEqual([
      "shared-a",
      "shared-b",
      { id: "first-c", weapon_set: 1 },
      { id: "first-d", weapon_set: 1 },
      { id: "second-x", weapon_set: 2 },
      { id: "second-y", weapon_set: 2 },
    ]);
  });
  test("the 25th weapon-set point is rejected atomically", () => {
    const chain = normalizeTree({
      nodes: Object.fromEntries(
        Array.from({ length: 26 }, (_, i) => [
          String(i),
          {
            id: `p${i}`,
            x: i,
            y: 0,
            ...(i === 0 ? { classStartIndex: 0 } : {}),
            out: i < 25 ? [String(i + 1)] : [],
          },
        ]),
      ),
    });
    const atLimit = { ...empty, weapon1: Array.from({ length: 24 }, (_, i) => String(i + 1)) };
    const result = allocatePassive(chain, 0, "", atLimit, 1, "25");
    expect(result.plan).toEqual(atLimit);
    expect(result.added).toBe(0);
    expect(result.error).toContain("24");
    expect(allocatePassive(chain, 0, "", empty, 2, "25").plan).toEqual(empty);
  });
  test("refunding a node with an alternative route keeps connected descendants", () => {
    const loop = { ...tree, edges: [...tree.edges, ["x", "d"] as [string, string]] };
    const result = refundPassive(
      loop,
      0,
      "",
      { ...empty, shared: ["a", "b", "c", "d", "x"] },
      0,
      "b",
    );
    expect(result.plan.shared).toEqual(["a", "c", "d", "x"]);
    expect(result.removed).toBe(1);
  });
});

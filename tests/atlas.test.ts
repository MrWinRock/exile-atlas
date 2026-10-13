import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseAtlasData, normalizeAtlasSource, type AtlasData } from "../src/lib/atlas-data";
import {
  allocateAtlasPath,
  atlasCounts,
  atlasPath,
  refundAtlasNode,
  validateAtlasPlan,
} from "../src/lib/atlas-plan";
import { createAtlasDraft, createAtlasLibrary } from "../src/lib/atlas-store";

const data = {
  identity: "atlas-test",
  source: "https://example.com/atlas",
  captured: "2026-09-15",
  patch: "test",
  nodes: [
    {
      id: "r",
      name: "Core start",
      branch: "Core",
      root: true,
      x: 0,
      y: 0,
      effects: [],
      kind: "normal",
      decorative: false,
    },
    {
      id: "a",
      name: "Bridge",
      branch: "Core",
      root: false,
      x: 100,
      y: 0,
      effects: ["More maps"],
      kind: "normal",
      decorative: false,
    },
    {
      id: "b",
      name: "Reward",
      branch: "Core",
      root: false,
      x: 200,
      y: 0,
      effects: ["More rewards"],
      kind: "notable",
      decorative: false,
    },
    {
      id: "d",
      name: "Art only",
      branch: "Core",
      root: false,
      x: 100,
      y: 100,
      effects: [],
      kind: "normal",
      decorative: true,
    },
    {
      id: "rr",
      name: "Ritual start",
      branch: "Ritual",
      root: true,
      x: 500,
      y: 0,
      effects: [],
      kind: "normal",
      decorative: false,
    },
    {
      id: "c",
      name: "Ritual reward",
      branch: "Ritual",
      root: false,
      x: 600,
      y: 0,
      effects: [],
      kind: "normal",
      decorative: false,
    },
  ],
  edges: [
    ["r", "a"],
    ["a", "b"],
    ["rr", "c"],
  ],
} as AtlasData;
const empty = { dataset: "atlas-test", allocated: [] as string[], budgets: {} };

test("Atlas allocation is atomic, connected and branch budget aware", () => {
  expect(atlasPath(data, empty, "b").ids).toEqual(["a", "b"]);
  const blocked = allocateAtlasPath(data, { ...empty, budgets: { Core: 1 } }, "b");
  expect(blocked.error).toMatch(/budget/i);
  expect(blocked.plan.allocated).toEqual([]);
  const plan = allocateAtlasPath(data, { ...empty, budgets: { Core: 2 } }, "b").plan;
  expect(plan.allocated).toEqual(["a", "b"]);
  expect(atlasCounts(data, plan).Core).toBe(2);
  expect(empty.allocated).toEqual([]);
  expect(atlasPath(data, { ...plan, budgets: { Core: 0, Ritual: 1 } }, "c").ids).toEqual(["c"]);
});

test("Atlas decorations cannot allocate or connect a shortcut", () => {
  expect(allocateAtlasPath(data, empty, "d").error).toMatch(/decorative/i);
  const bad = { ...empty, allocated: ["d"] };
  expect(validateAtlasPlan(data, bad).join(" ")).toMatch(/decorative/i);
  const path = atlasPath({ ...data, edges: [...data.edges, ["r", "d"], ["d", "b"]] }, empty, "b");
  expect(path.ids).toEqual(["a", "b"]);
});

test("Atlas refunds prune only disconnected descendants and refuse unresolved drafts", () => {
  const plan = { ...empty, allocated: ["a", "b", "c"] };
  expect(refundAtlasNode(data, plan, "a").allocated).toEqual(["c"]);
  expect(plan.allocated).toEqual(["a", "b", "c"]);
  for (const unresolved of [
    { ...plan, dataset: "old" },
    { ...plan, allocated: ["a", "missing"] },
  ]) {
    expect(allocateAtlasPath(data, unresolved, "b").plan).toEqual(unresolved);
    expect(refundAtlasNode(data, unresolved, "a")).toEqual(unresolved);
  }
});

test("Atlas normalization uses source orbit geometry and validates connected branches", () => {
  const raw = {
    groups: [
      {
        x: 20,
        y: 30,
        passives: [
          { hash: 1, radius: 0, position_clockwise: 0, connections: [2] },
          { hash: 2, radius: 1, position_clockwise: 1, connections: [] },
        ],
      },
    ],
    orbit_radii: [0, 100],
    skills_per_orbit: [1, 4],
    roots: [1],
    passives: {
      "1": { id: "Start", hash: 1, name: "", icon: "root", stat_text: [], is_atlas_root: true },
      "2": {
        id: "Reward",
        hash: 2,
        name: "Reward",
        icon: "reward",
        stat_text: ["[Item|Items] found in your Maps"],
        is_notable: true,
      },
    },
  };
  const normalized = normalizeAtlasSource(
    raw,
    { revision: "a".repeat(40), captured: "2026-09-15", patch: "test" },
    new Map(),
  );
  expect(normalized.nodes.find((n) => n.id === "2")).toMatchObject({
    x: 120,
    y: 30,
    effects: ["Items found in your Maps"],
    kind: "notable",
  });
  expect(normalized.edges).toEqual([["1", "2"]]);
  const invalid = structuredClone(normalized);
  invalid.edges = [];
  expect(() => parseAtlasData(invalid)).toThrow(/disconnected/i);
  raw.groups.push({
    x: 50,
    y: 90,
    passives: [{ hash: 2, radius: 0, position_clockwise: 0, connections: [] }],
  });
  const repeated = normalizeAtlasSource(
    raw,
    { revision: "a".repeat(40), captured: "2026-09-15", patch: "test" },
    new Map(),
  );
  expect(repeated.nodes).toHaveLength(2);
  expect(repeated.nodes.find((n) => n.id === "2")).toMatchObject({ x: 50, y: 90 });
  expect(
    allocateAtlasPath(repeated, { ...empty, dataset: repeated.identity }, "2").plan.allocated,
  ).toEqual(["2"]);
});

test("bundled Atlas has all seven roots and valid finite geometry", () => {
  const bundled = parseAtlasData(JSON.parse(readFileSync("public/data/poe2-atlas.json", "utf8")));
  expect(bundled.nodes.filter((n) => n.root)).toHaveLength(7);
  expect(bundled.nodes).toHaveLength(575);
  expect(new Set(bundled.nodes.filter((n) => n.root).map((n) => n.branch))).toEqual(
    new Set(["Core", "Breach", "Ritual", "Delirium", "Expedition", "Abyss", "Incursion"]),
  );
});

test("Atlas draft reloads without overwriting unreadable storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const draft = createAtlasDraft(storage);
  draft.getState().load();
  draft.getState().setPlan({ ...empty, allocated: ["a"] });
  const reloaded = createAtlasDraft(storage);
  reloaded.getState().load();
  expect(reloaded.getState().current?.allocated).toEqual(["a"]);
  const key = [...values.keys()][0];
  values.set(key, "broken");
  const damaged = createAtlasDraft(storage);
  damaged.getState().load();
  damaged.getState().setPlan(empty);
  expect(values.get(key)).toBe("broken");
  expect(damaged.getState().warning).toMatch(/preserved/i);
});

test("Atlas libraries import copies and retain unknown IDs and dataset references", () => {
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const library = createAtlasLibrary(storage);
  library.getState().load();
  library
    .getState()
    .save({
      id: "one",
      name: "Old Atlas",
      plan: { ...empty, dataset: "old", allocated: ["unknown"] },
    });
  const exported = library.getState().exportJson();
  library.getState().importJson(exported);
  expect(library.getState().records).toHaveLength(2);
  expect(library.getState().records[1].id).not.toBe("one");
  expect(library.getState().records[1].plan).toEqual({
    ...empty,
    dataset: "old",
    allocated: ["unknown"],
  });
  expect(() => library.getState().importJson('{"format":"wrong"}')).toThrow();
  expect(library.getState().records).toHaveLength(2);
});

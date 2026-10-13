import type { Build } from "./build";
import { isAllocatablePassive, type Tree } from "./tree";
import { passiveBudget, type PassivePlan } from "./passive-plan";
import { buildComparisonReportSchema } from "./build-comparison-schema";
export type ComparisonEntry = Record<string, unknown>;
export type SectionDifference = {
  added: ComparisonEntry[];
  removed: ComparisonEntry[];
  changed: { before: ComparisonEntry; after: ComparisonEntry }[];
  unchanged: ComparisonEntry[];
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "undefined";
}
function diffEntries(
  left: ComparisonEntry[],
  right: ComparisonEntry[],
  key: (v: ComparisonEntry) => string,
): SectionDifference {
  const grouped = (entries: ComparisonEntry[]) => {
    const groups = new Map<string, ComparisonEntry[]>();
    for (const e of entries) {
      const id = key(e);
      groups.set(id, [...(groups.get(id) ?? []), e]);
    }
    return groups;
  };
  const a = grouped(left),
    b = grouped(right);
  const result: SectionDifference = { added: [], removed: [], changed: [], unchanged: [] };
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const remaining = [...(b.get(id) ?? [])],
      unmatched: ComparisonEntry[] = [];
    for (const before of a.get(id) ?? []) {
      const i = remaining.findIndex((after) => canonical(before) === canonical(after));
      if (i >= 0) {
        result.unchanged.push(before);
        remaining.splice(i, 1);
      } else unmatched.push(before);
    }
    while (unmatched.length && remaining.length)
      result.changed.push({ before: unmatched.shift()!, after: remaining.shift()! });
    result.removed.push(...unmatched);
    result.added.push(...remaining);
  }
  return result;
}
const passives = (build: Build): ComparisonEntry[] =>
  (build.passives ?? []).map((p) =>
    typeof p === "string" ? { id: p, weapon_set: 0 } : { ...p, weapon_set: p.weapon_set ?? 0 },
  );
const skills = (build: Build): ComparisonEntry[] =>
  (build.skills ?? []).map((p) => (typeof p === "string" ? { id: p } : { ...p }));
export function buildComparisonDisplay(
  build: Build,
  tree: Tree,
): { plan: PassivePlan; unknown: string[] } {
  const plan: PassivePlan = { shared: [], weapon1: [], weapon2: [] },
    unknown: string[] = [];
  const nodes = new Map(tree.nodes.map((n) => [n.id, n]));
  for (const entry of passives(build)) {
    const id = String(entry.id),
      node = nodes.get(id);
    if (!node || !isAllocatablePassive(node) || node.kind === "start") {
      unknown.push(id);
      continue;
    }
    const mode = Number(entry.weapon_set);
    if (node.ascendancy && mode) {
      unknown.push(`${id}: ascendancy membership must be shared`);
      continue;
    }
    const key = mode === 1 ? "weapon1" : mode === 2 ? "weapon2" : "shared";
    if (plan[key].includes(node.hash)) {
      unknown.push(`${id}: duplicate membership`);
      continue;
    }
    plan[key].push(node.hash);
  }
  return { plan, unknown };
}
export type BuildDifference = {
  metadata: { field: string; before: unknown; after: unknown }[];
  passives: SectionDifference;
  skills: SectionDifference;
  inventory: SectionDifference;
  counts: {
    left: { regular: number | null; ascendancy: number | null; knownOnly: boolean };
    right: { regular: number | null; ascendancy: number | null; knownOnly: boolean };
  };
  unresolved: string[];
  hasChanges: boolean;
};
export function compareBuilds(left: Build, right: Build, tree?: Tree): BuildDifference {
  const unresolved: string[] = [];
  const count = (build: Build, side: string) => {
    if (!tree) {
      for (const p of passives(build)) unresolved.push(`${side}: ${p.id}`);
      return { regular: null, ascendancy: null, knownOnly: true };
    }
    const display = buildComparisonDisplay(build, tree);
    unresolved.push(...display.unknown.map((id) => `${side}: ${id}`));
    const budget = passiveBudget(tree, display.plan);
    return {
      regular: budget.regular,
      ascendancy: budget.ascendancy,
      knownOnly: display.unknown.length > 0,
    };
  };
  const metadata = (["name", "author", "link", "description", "ascendancy"] as const)
    .filter((field) => canonical(left[field]) !== canonical(right[field]))
    .map((field) => ({ field, before: left[field], after: right[field] }));
  const p = diffEntries(passives(left), passives(right), (v) => `${v.weapon_set}:${v.id}`),
    s = diffEntries(skills(left), skills(right), (v) => String(v.id)),
    inventory = diffEntries(
      left.inventory_slots ?? [],
      right.inventory_slots ?? [],
      (v) => `${v.inventory_id}:${v.slot_x ?? "?"}:${v.slot_y ?? "?"}`,
    );
  for (const [side, build] of [
    ["left", left],
    ["right", right],
  ] as const) {
    const sections: [string, ComparisonEntry[], (v: ComparisonEntry) => string][] = [
      ["passive", passives(build), (v) => `${v.weapon_set}:${v.id}`],
      ["skill", skills(build), (v) => String(v.id)],
      [
        "inventory",
        build.inventory_slots ?? [],
        (v) => `${v.inventory_id}:${v.slot_x ?? "?"}:${v.slot_y ?? "?"}`,
      ],
    ];
    for (const [section, entries, key] of sections) {
      const seen = new Set<string>();
      for (const e of entries) {
        const id = key(e);
        if (seen.has(id)) unresolved.push(`${side}: duplicate ${section} identity ${id}`);
        seen.add(id);
      }
    }
  }
  const counts = { left: count(left, "left"), right: count(right, "right") };
  return {
    metadata,
    passives: p,
    skills: s,
    inventory,
    counts,
    unresolved,
    hasChanges:
      !!metadata.length ||
      [p, s, inventory].some((d) => d.added.length || d.removed.length || d.changed.length),
  };
}
export function exportBuildComparison(
  inputs: { name: string; id?: string }[],
  difference: BuildDifference,
  sources: Record<string, string>,
) {
  return buildComparisonReportSchema.parse({
    format: "exile-atlas-build-comparison",
    version: 1,
    inputs,
    sources,
    difference,
  });
}

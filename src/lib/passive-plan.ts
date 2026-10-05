import type { Build } from "./build";
import { allocationPath, isAllocatablePassive, type Tree, type TreeNode } from "./tree";

export type AllocationMode = 0 | 1 | 2;
export type PassivePlan = { shared: string[]; weapon1: string[]; weapon2: string[] };

const fields = ["shared", "weapon1", "weapon2"] as const;
const setLimit = 24;

function sharedOnly(node: TreeNode) {
  return !!node.ascendancy || node.kind === "keystone" || node.kind === "jewel";
}

export function passiveRoots(tree: Tree, classIndex: number, ascendancy: string): string[] {
  return tree.nodes
    .filter(
      (n) =>
        n.kind === "start" &&
        (n.classStarts.includes(classIndex) || (!!ascendancy && n.ascendancy === ascendancy)),
    )
    .map((n) => n.hash);
}

function planningTree(tree: Tree, classIndex: number, ascendancy: string): Tree {
  const roots = new Set(passiveRoots(tree, classIndex, ascendancy));
  const nodes = tree.nodes.filter(
    (n) =>
      isAllocatablePassive(n) &&
      (!n.ascendancy || n.ascendancy === ascendancy) &&
      (n.kind !== "start" || roots.has(n.hash)),
  );
  const ids = new Set(nodes.map((n) => n.hash));
  return { ...tree, nodes, edges: tree.edges.filter(([a, b]) => ids.has(a) && ids.has(b)) };
}

function reachable(tree: Tree, roots: string[], allocations: string[]): Set<string> {
  const allowed = new Set([...roots, ...allocations]);
  const neighbors = new Map<string, string[]>();
  for (const [a, b] of tree.edges) {
    if (!allowed.has(a) || !allowed.has(b)) continue;
    if (!neighbors.has(a)) neighbors.set(a, []);
    if (!neighbors.has(b)) neighbors.set(b, []);
    neighbors.get(a)!.push(b);
    neighbors.get(b)!.push(a);
  }
  const queue = [...roots],
    seen = new Set(roots);
  for (let i = 0; i < queue.length; i++)
    for (const next of neighbors.get(queue[i]) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  return seen;
}

export function normalizePassivePlan(
  tree: Tree,
  classIndex: number,
  ascendancy: string,
  plan: PassivePlan,
): PassivePlan {
  const graph = planningTree(tree, classIndex, ascendancy);
  const roots = passiveRoots(graph, classIndex, ascendancy);
  const nodes = new Map(graph.nodes.filter((n) => n.kind !== "start").map((n) => [n.hash, n]));
  const shared = [...new Set(plan.shared)].filter((id) => nodes.has(id));
  const connected = reachable(graph, roots, shared);
  const result: PassivePlan = {
    shared: shared.filter((id) => connected.has(id)),
    weapon1: [],
    weapon2: [],
  };
  for (const key of ["weapon1", "weapon2"] as const) {
    const candidates = [...new Set(plan[key])].filter(
      (id) => nodes.has(id) && !sharedOnly(nodes.get(id)!) && !result.shared.includes(id),
    );
    const connectedSet = reachable(graph, roots, [...result.shared, ...candidates]);
    result[key] = candidates.filter((id) => connectedSet.has(id));
  }
  return result;
}

export function allocatePassive(
  tree: Tree,
  classIndex: number,
  ascendancy: string,
  input: PassivePlan,
  mode: AllocationMode,
  target: string,
): { plan: PassivePlan; added: number; error?: string } {
  const plan = normalizePassivePlan(tree, classIndex, ascendancy, input);
  let graph = planningTree(tree, classIndex, ascendancy);
  const node = graph.nodes.find((n) => n.hash === target);
  if (!node || node.kind === "start")
    return {
      plan,
      added: 0,
      error: "Choose an allocatable passive in the selected class and ascendancy.",
    };
  // Ascendancy allocations always use their separate shared tree.
  const effectiveMode = node.ascendancy ? 0 : mode;
  if (effectiveMode && sharedOnly(node))
    return {
      plan,
      added: 0,
      error: "Keystones and jewel sockets are shared. Select Shared to allocate this node.",
    };
  const key = fields[effectiveMode];
  const active = [
    ...plan.shared,
    ...(effectiveMode ? plan[key] : []),
    ...passiveRoots(graph, classIndex, ascendancy),
  ];
  if (active.includes(target))
    return { plan, added: 0, error: "This passive is already allocated in the active tree." };
  if (effectiveMode) {
    const ids = new Set(
      graph.nodes
        .filter((n) => !sharedOnly(n) || plan.shared.includes(n.hash) || n.kind === "start")
        .map((n) => n.hash),
    );
    graph = {
      ...graph,
      nodes: graph.nodes.filter((n) => ids.has(n.hash)),
      edges: graph.edges.filter(([a, b]) => ids.has(a) && ids.has(b)),
    };
  }
  const path = allocationPath(graph, active, target);
  if (!path.length)
    return {
      plan,
      added: 0,
      error:
        "No connected path is available. Allocate any connecting keystones or jewel sockets in Shared first.",
    };
  if (effectiveMode && plan[key].length + path.length > setLimit)
    return {
      plan,
      added: 0,
      error: `Weapon set ${effectiveMode === 1 ? "I" : "II"} has a 24-point limit. This path needs ${path.length} points; ${setLimit - plan[key].length} remain.`,
    };
  const next = { ...plan, [key]: [...plan[key], ...path] };
  if (!effectiveMode) {
    const promoted = new Set(next.shared);
    next.weapon1 = next.weapon1.filter((id) => !promoted.has(id));
    next.weapon2 = next.weapon2.filter((id) => !promoted.has(id));
  }
  return { plan: next, added: path.length };
}

export function refundPassive(
  tree: Tree,
  classIndex: number,
  ascendancy: string,
  input: PassivePlan,
  mode: AllocationMode,
  target: string,
): { plan: PassivePlan; removed: number } {
  const plan = normalizePassivePlan(tree, classIndex, ascendancy, input);
  const key = plan.shared.includes(target) ? "shared" : fields[mode];
  if (!plan[key].includes(target)) return { plan, removed: 0 };
  const next = normalizePassivePlan(tree, classIndex, ascendancy, {
    ...plan,
    [key]: plan[key].filter((id) => id !== target),
  });
  const count = (p: PassivePlan) => p.shared.length + p.weapon1.length + p.weapon2.length;
  return { plan: next, removed: count(plan) - count(next) };
}

export function passiveBudget(tree: Tree, plan: PassivePlan) {
  const ascendancies = new Set(tree.nodes.filter((n) => !!n.ascendancy).map((n) => n.hash));
  const ascendancy = plan.shared.filter((id) => ascendancies.has(id)).length;
  const shared = plan.shared.length - ascendancy,
    weapon1 = plan.weapon1.length,
    weapon2 = plan.weapon2.length;
  return { shared, weapon1, weapon2, regular: shared + Math.max(weapon1, weapon2), ascendancy };
}

export function buildPassives(tree: Tree, plan: PassivePlan): NonNullable<Build["passives"]> {
  const nodes = new Map(
    tree.nodes
      .filter((n) => n.kind !== "start" && isAllocatablePassive(n))
      .map((n) => [n.hash, n.id]),
  );
  return fields.flatMap((field, mode) =>
    plan[field]
      .filter((id) => nodes.has(id))
      .map((hash) => (mode ? { id: nodes.get(hash)!, weapon_set: mode } : nodes.get(hash)!)),
  );
}

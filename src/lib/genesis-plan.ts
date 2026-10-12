import { GENESIS_BRANCHES, type GenesisBranch, type GenesisData } from "./genesis-data";
export type GenesisPlan = {
  dataset: string;
  allocated: string[];
  budgets: Partial<Record<GenesisBranch, number>>;
};
export function createGenesisPlan(data: GenesisData): GenesisPlan {
  return { dataset: data.identity, allocated: [], budgets: {} };
}
function graph(data: GenesisData) {
  const nodes = new Map(data.nodes.map((n) => [n.id, n])),
    neighbors = new Map(data.nodes.map((n) => [n.id, [] as string[]]));
  for (const [a, b] of data.edges) {
    if (nodes.get(a)?.branch === nodes.get(b)?.branch) {
      neighbors.get(a)?.push(b);
      neighbors.get(b)?.push(a);
    }
  }
  for (const ns of neighbors.values()) ns.sort();
  return { nodes, neighbors };
}
function reachable(data: GenesisData, allocated: string[]): Set<string> {
  const { neighbors } = graph(data),
    allowed = new Set(allocated),
    roots = data.nodes.filter((n) => n.root).map((n) => n.id),
    reached = new Set(roots),
    queue = [...roots];
  for (let i = 0; i < queue.length; i++)
    for (const n of neighbors.get(queue[i]) ?? [])
      if (allowed.has(n) && !reached.has(n)) {
        reached.add(n);
        queue.push(n);
      }
  return reached;
}
export function genesisCounts(data: GenesisData, plan: GenesisPlan): Record<GenesisBranch, number> {
  const counts = Object.fromEntries(GENESIS_BRANCHES.map((b) => [b, 0])) as Record<
    GenesisBranch,
    number
  >;
  const ids = new Set(plan.allocated);
  for (const n of data.nodes) if (!n.root && ids.has(n.id)) counts[n.branch]++;
  return counts;
}
export function validateGenesisPlan(data: GenesisData, plan: GenesisPlan): string[] {
  const errors: string[] = [],
    { nodes } = graph(data),
    reached = reachable(data, plan.allocated),
    counts = genesisCounts(data, plan);
  if (plan.dataset !== data.identity)
    errors.push(
      "This plan belongs to a different dataset. Review its node IDs before applying it.",
    );
  if (new Set(plan.allocated).size !== plan.allocated.length)
    errors.push("Duplicate allocated node IDs.");
  for (const id of plan.allocated)
    if (!nodes.has(id)) errors.push(`Unknown node: ${id}`);
    else if (nodes.get(id)!.root) errors.push("Roots are implicit and cannot consume points.");
    else if (!reached.has(id)) errors.push(`Disconnected node: ${id}`);
  for (const [branch, value] of Object.entries(plan.budgets)) {
    if (
      !GENESIS_BRANCHES.includes(branch as GenesisBranch) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 5000
    )
      errors.push("Planning budgets must be whole numbers from 0 to 5000.");
    else if (counts[branch as GenesisBranch] > value)
      errors.push(`${branch}: allocated points exceed the planning budget.`);
  }
  return errors;
}
export function genesisPath(
  data: GenesisData,
  plan: GenesisPlan,
  target: string,
): { ids: string[]; error?: string } {
  const { nodes, neighbors } = graph(data),
    node = nodes.get(target);
  if (!node) return { ids: [], error: "Unknown Genesis node." };
  const errors = validateGenesisPlan(data, plan).filter(
    (e) => !e.includes("planning budget") || e.startsWith(`${node.branch}:`),
  );
  if (errors.length) return { ids: [], error: errors.join(" ") };
  if (node.root || plan.allocated.includes(target)) return { ids: [] };
  const seeds = data.nodes
    .filter((n) => n.branch === node.branch && (n.root || plan.allocated.includes(n.id)))
    .map((n) => n.id)
    .sort();
  const previous = new Map<string, string | null>(seeds.map((s) => [s, null])),
    queue = [...seeds];
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] === target) break;
    for (const next of neighbors.get(queue[i]) ?? [])
      if (nodes.get(next)?.branch === node.branch && !previous.has(next)) {
        previous.set(next, queue[i]);
        queue.push(next);
      }
  }
  if (!previous.has(target)) return { ids: [], error: "No connected path from this branch root." };
  const ids: string[] = [];
  let current: string | null = target;
  while (current !== null && previous.get(current) !== null) {
    ids.unshift(current);
    current = previous.get(current) ?? null;
  }
  const budget = plan.budgets[node.branch];
  if (budget !== undefined && genesisCounts(data, plan)[node.branch] + ids.length > budget)
    return { ids, error: "This path exceeds the branch planning budget." };
  return { ids };
}
export function allocateGenesisPath(
  data: GenesisData,
  plan: GenesisPlan,
  target: string,
): { plan: GenesisPlan; error?: string } {
  const path = genesisPath(data, plan, target);
  return path.error
    ? { plan, error: path.error }
    : { plan: { ...plan, allocated: [...plan.allocated, ...path.ids] } };
}
export function refundGenesisNode(
  data: GenesisData,
  plan: GenesisPlan,
  target: string,
): GenesisPlan {
  if (validateGenesisPlan(data, plan).some((e) => !e.includes("planning budget"))) return plan;
  const kept = plan.allocated.filter((id) => id !== target),
    reached = reachable(data, kept);
  return { ...plan, allocated: kept.filter((id) => reached.has(id)) };
}
/** Explicit repair keeps every known planned target and adds its missing path. */
export function repairGenesisPlan(
  data: GenesisData,
  plan: GenesisPlan,
): { plan: GenesisPlan; error?: string } {
  if (plan.dataset !== data.identity)
    return { plan, error: "Review the dataset identity before repairing connections." };
  const nodes = new Map(data.nodes.map((n) => [n.id, n]));
  if (plan.allocated.some((id) => !nodes.has(id)))
    return { plan, error: "Remove or resolve unknown node IDs before repairing connections." };
  let repaired: GenesisPlan = { ...plan, allocated: [] };
  for (const target of plan.allocated) {
    if (nodes.get(target)!.root) continue;
    const next = allocateGenesisPath(data, repaired, target);
    if (next.error) return { plan, error: next.error };
    repaired = next.plan;
  }
  return { plan: repaired };
}

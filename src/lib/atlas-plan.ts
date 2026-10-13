import { z } from "zod";
import { ATLAS_BRANCHES, atlasBranchSchema, type AtlasBranch, type AtlasData } from "./atlas-data";
export const atlasPlanSchema = z
  .object({
    dataset: z.string().min(1).max(200),
    allocated: z.array(z.string().min(1).max(200)).max(5000),
    budgets: z.partialRecord(atlasBranchSchema, z.number().int().min(0).max(5000)),
  })
  .strict()
  .refine((p) => new Set(p.allocated).size === p.allocated.length, "Duplicate Atlas node IDs");
export type AtlasPlan = z.infer<typeof atlasPlanSchema>;
export const createAtlasPlan = (data: { identity: string }): AtlasPlan => ({
  dataset: data.identity,
  allocated: [],
  budgets: {},
});
function graph(data: AtlasData) {
  const nodes = new Map(data.nodes.map((n) => [n.id, n])),
    neighbors = new Map(data.nodes.filter((n) => !n.decorative).map((n) => [n.id, [] as string[]]));
  for (const [a, b] of data.edges)
    if (neighbors.has(a) && neighbors.has(b) && nodes.get(a)?.branch === nodes.get(b)?.branch) {
      neighbors.get(a)!.push(b);
      neighbors.get(b)!.push(a);
    }
  for (const next of neighbors.values()) next.sort();
  return { nodes, neighbors };
}
function reachable(data: AtlasData, allocated: string[]) {
  const { neighbors } = graph(data),
    allowed = new Set(allocated),
    roots = data.nodes.filter((n) => n.root && !n.decorative).map((n) => n.id),
    seen = new Set(roots),
    queue = [...roots];
  for (const id of queue)
    for (const next of neighbors.get(id) ?? [])
      if (allowed.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  return seen;
}
export function atlasCounts(data: AtlasData, plan: AtlasPlan): Record<AtlasBranch, number> {
  const result = Object.fromEntries(ATLAS_BRANCHES.map((b) => [b, 0])) as Record<
      AtlasBranch,
      number
    >,
    ids = new Set(plan.allocated);
  for (const n of data.nodes) if (!n.root && !n.decorative && ids.has(n.id)) result[n.branch]++;
  return result;
}
export function validateAtlasPlan(data: AtlasData, plan: AtlasPlan): string[] {
  const errors: string[] = [],
    nodes = new Map(data.nodes.map((n) => [n.id, n])),
    reached = reachable(data, plan.allocated),
    counts = atlasCounts(data, plan);
  if (plan.dataset !== data.identity)
    errors.push(
      "This plan uses a different Atlas dataset. Start a new plan to use this snapshot; export the old plan first.",
    );
  if (new Set(plan.allocated).size !== plan.allocated.length)
    errors.push("Duplicate allocated node IDs.");
  for (const id of plan.allocated) {
    const n = nodes.get(id);
    if (!n) errors.push(`Unknown node: ${id}`);
    else if (n.decorative) errors.push(`Decorative Atlas node cannot allocate: ${id}`);
    else if (n.root) errors.push("Atlas roots are implicit and do not consume points.");
    else if (!reached.has(id)) errors.push(`Disconnected node: ${id}`);
  }
  for (const [branch, budget] of Object.entries(plan.budgets)) {
    if (
      !ATLAS_BRANCHES.includes(branch as AtlasBranch) ||
      !Number.isInteger(budget) ||
      budget < 0 ||
      budget > 5000
    )
      errors.push("Planning budgets must be whole numbers from 0 to 5000.");
    else if (counts[branch as AtlasBranch] > budget)
      errors.push(`${branch}: allocated points exceed the planning budget.`);
  }
  return errors;
}
export function atlasPath(
  data: AtlasData,
  plan: AtlasPlan,
  target: string,
): { ids: string[]; error?: string } {
  const { nodes, neighbors } = graph(data),
    node = nodes.get(target);
  if (!node) return { ids: [], error: "Unknown Atlas node." };
  if (node.decorative)
    return { ids: [], error: "This decorative illustration cannot allocate points." };
  const errors = validateAtlasPlan(data, plan).filter(
    (e) => !e.includes("planning budget") || e.startsWith(`${node.branch}:`),
  );
  if (errors.length) return { ids: [], error: errors.join(" ") };
  if (node.root || plan.allocated.includes(target)) return { ids: [] };
  const seeds = data.nodes
      .filter(
        (n) =>
          n.branch === node.branch && !n.decorative && (n.root || plan.allocated.includes(n.id)),
      )
      .map((n) => n.id)
      .sort(),
    previous = new Map<string, string | null>(seeds.map((s) => [s, null])),
    queue = [...seeds];
  for (const id of queue) {
    if (id === target) break;
    for (const next of neighbors.get(id) ?? [])
      if (!previous.has(next)) {
        previous.set(next, id);
        queue.push(next);
      }
  }
  if (!previous.has(target)) return { ids: [], error: "No connected path from this Atlas root." };
  const ids: string[] = [];
  let id: string | null = target;
  while (id !== null && previous.get(id) !== null) {
    ids.unshift(id);
    id = previous.get(id) ?? null;
  }
  const budget = plan.budgets[node.branch];
  return budget !== undefined && atlasCounts(data, plan)[node.branch] + ids.length > budget
    ? { ids, error: "This path exceeds the branch planning budget." }
    : { ids };
}
export function allocateAtlasPath(
  data: AtlasData,
  plan: AtlasPlan,
  target: string,
): { plan: AtlasPlan; error?: string } {
  const path = atlasPath(data, plan, target);
  return path.error
    ? { plan, error: path.error }
    : { plan: path.ids.length ? { ...plan, allocated: [...plan.allocated, ...path.ids] } : plan };
}
export function refundAtlasNode(data: AtlasData, plan: AtlasPlan, target: string): AtlasPlan {
  if (
    !plan.allocated.includes(target) ||
    validateAtlasPlan(data, plan).some((e) => !e.includes("planning budget"))
  )
    return plan;
  const kept = plan.allocated.filter((id) => id !== target),
    seen = reachable(data, kept);
  return { ...plan, allocated: kept.filter((id) => seen.has(id)) };
}

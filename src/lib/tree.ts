import { z } from "zod";
import { pickPassiveSprite, type PassiveSprite } from "./artwork";
const nodeSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  out: z.array(z.string()).optional(),
  stats: z.array(z.string()).optional(),
  isNotable: z.boolean().optional(),
  isKeystone: z.boolean().optional(),
  isJewelSocket: z.boolean().optional(),
  isAscendancyStart: z.boolean().optional(),
  isMastery: z.boolean().optional(),
  isBlighted: z.boolean().optional(),
  icon: z.string().optional(),
  activeEffectImage: z.string().optional(),
  ascendancyId: z.string().optional(),
  classStartIndex: z.union([z.number(), z.array(z.number())]).optional(),
});
const exportSchema = z.object({
  nodes: z.record(z.string(), nodeSchema),
  edges: z
    .array(
      z.object({
        from: z.union([z.string(), z.number()]),
        to: z.union([z.string(), z.number()]),
        orbitX: z.number().optional(),
        orbitY: z.number().optional(),
      }),
    )
    .optional(),
  classes: z
    .array(
      z.object({
        name: z.string(),
        ascendancies: z
          .array(z.object({ id: z.string(), name: z.string().nullable().optional() }))
          .optional(),
      }),
    )
    .optional(),
});
export type TreeNode = {
  hash: string;
  id: string;
  name: string;
  x: number;
  y: number;
  out: string[];
  stats: string[];
  kind: "normal" | "notable" | "keystone" | "jewel" | "start" | "mastery";
  image?: PassiveSprite;
  inactiveImage?: PassiveSprite;
  ascendancy?: string;
  classStarts: number[];
  itemOnly?: boolean;
  // View-only uniform scale; normalized source coordinates stay unchanged.
  displayScale?: number;
};
export type Tree = {
  nodes: TreeNode[];
  edges: [string, string][];
  edgeArcs?: Record<string, { x: number; y: number }>;
  classes: { index: number; name: string; ascendancies: { id: string; name: string }[] }[];
};
export function normalizeTree(
  raw: unknown,
  active = new Map<string, PassiveSprite>(),
  inactive = new Map<string, PassiveSprite>(),
): Tree {
  const data = exportSchema.parse(raw);
  const nodes: TreeNode[] = Object.entries(data.nodes)
    .filter(([, n]) => n.id && n.x !== undefined && n.y !== undefined)
    .map(([hash, n]) => ({
      hash,
      id: n.id!,
      name: n.name ?? n.id!,
      x: n.x!,
      y: n.y!,
      out: n.out ?? [],
      stats: n.stats ?? [],
      image: pickPassiveSprite(
        active,
        n.icon ?? "",
        n.isKeystone
          ? "keystone"
          : n.isNotable
            ? "notable"
            : n.isMastery
              ? "mastery"
              : n.isJewelSocket
                ? "jewel"
                : "normal",
        n.activeEffectImage,
      ),
      inactiveImage: pickPassiveSprite(
        inactive,
        n.icon ?? "",
        n.isKeystone
          ? "keystone"
          : n.isNotable
            ? "notable"
            : n.isMastery
              ? "mastery"
              : n.isJewelSocket
                ? "jewel"
                : "normal",
        n.activeEffectImage,
      ),
      kind:
        n.classStartIndex !== undefined || n.isAscendancyStart
          ? "start"
          : n.isMastery
            ? "mastery"
            : n.isKeystone
              ? "keystone"
              : n.isNotable
                ? "notable"
                : n.isJewelSocket
                  ? "jewel"
                  : "normal",
      ascendancy: n.ascendancyId,
      itemOnly: n.isBlighted,
      classStarts:
        n.classStartIndex === undefined
          ? []
          : Array.isArray(n.classStartIndex)
            ? n.classStartIndex
            : [n.classStartIndex],
    }));
  const ids = new Set(nodes.map((n) => n.hash)),
    seen = new Set<string>(),
    edges: [string, string][] = [];
  for (const n of nodes)
    for (const target of n.out) {
      const key = [n.hash, target].sort().join(":");
      if (ids.has(target) && !seen.has(key)) {
        seen.add(key);
        edges.push([n.hash, target]);
      }
    }
  const edgeArcs: NonNullable<Tree["edgeArcs"]> = {};
  for (const edge of data.edges ?? []) {
    const from = String(edge.from),
      to = String(edge.to);
    if (ids.has(from) && ids.has(to) && edge.orbitX !== undefined && edge.orbitY !== undefined)
      edgeArcs[edgeKey(from, to)] = { x: edge.orbitX, y: edge.orbitY };
  }
  return {
    nodes,
    edges,
    edgeArcs,
    classes: (data.classes ?? [])
      .map((c, index) => ({
        index,
        name: c.name,
        ascendancies: (c.ascendancies ?? [])
          .filter((a) => a.name)
          .map((a) => ({ id: a.id, name: a.name! })),
      }))
      .filter((c) => c.ascendancies.length),
  };
}
export function allocationPath(tree: Tree, allocated: string[], target: string): string[] {
  const ids = new Set(tree.nodes.filter(isAllocatablePassive).map((n) => n.hash));
  if (!ids.has(target) || allocated.includes(target)) return [];
  const neighbors = new Map<string, string[]>();
  for (const [a, b] of tree.edges) {
    if (!ids.has(a) || !ids.has(b)) continue;
    neighbors.set(a, [...(neighbors.get(a) ?? []), b]);
    neighbors.set(b, [...(neighbors.get(b) ?? []), a]);
  }
  const queue = allocated.filter((id) => ids.has(id)),
    prev = new Map<string, string | null>(queue.map((id) => [id, null]));
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current === target) {
      const path: string[] = [];
      let at: string | null = target;
      while (at && prev.get(at) !== null) {
        path.unshift(at);
        at = prev.get(at) ?? null;
      }
      return path;
    }
    for (const next of neighbors.get(current) ?? []) {
      if (!prev.has(next)) {
        prev.set(next, current);
        queue.push(next);
      }
    }
  }
  return [];
}
export function isAllocatablePassive(node: TreeNode): boolean {
  return node.kind !== "mastery" && !node.itemOnly;
}
export function validAllocations(tree: Tree | undefined, hashes: string[]): string[] {
  const valid = new Set(
    tree?.nodes.filter((n) => isAllocatablePassive(n) && n.kind !== "start").map((n) => n.hash),
  );
  return hashes.filter((hash) => valid.has(hash));
}
export function passiveRadius(node: TreeNode): number {
  if (!isAllocatablePassive(node)) return 0;
  const radius =
    node.kind === "start" ? 110 : node.kind === "keystone" ? 95 : node.kind === "notable" ? 65 : 35;
  return radius * (node.displayScale ?? 1);
}
export function edgeKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}
export function connectionArc(
  from: { x: number; y: number },
  to: { x: number; y: number },
  center?: { x: number; y: number },
) {
  if (!center) return undefined;
  const radius = Math.hypot(from.x - center.x, from.y - center.y);
  if (!radius) return undefined;
  const start = Math.atan2(from.y - center.y, from.x - center.x);
  let sweep = Math.atan2(to.y - center.y, to.x - center.x) - start;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  return { ...center, radius, start, end: start + sweep, anticlockwise: sweep < 0 };
}

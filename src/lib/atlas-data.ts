import { z } from "zod";
import type { PassiveSprite } from "./artwork";
import { planningSpriteSchema } from "./planning-artwork";

export const ATLAS_BRANCHES = [
  "Core",
  "Breach",
  "Ritual",
  "Delirium",
  "Expedition",
  "Abyss",
  "Incursion",
] as const;
export const atlasBranchSchema = z.enum(ATLAS_BRANCHES);
export type AtlasBranch = z.infer<typeof atlasBranchSchema>;
const nodeSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().optional(),
  name: z.string().min(1),
  branch: atlasBranchSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  effects: z.array(z.string()),
  root: z.boolean(),
  decorative: z.boolean(),
  kind: z.enum(["normal", "notable", "keystone"]),
  sprite: planningSpriteSchema.optional(),
});
export type AtlasNode = z.infer<typeof nodeSchema>;
const dataSchema = z.object({
  identity: z.string().min(1),
  source: z.url(),
  captured: z.iso.date(),
  patch: z.string().min(1),
  artwork: z.object({ source: z.url(), captured: z.iso.date(), patch: z.string() }).optional(),
  nodes: z.array(nodeSchema).min(1).max(5000),
  edges: z.array(z.tuple([z.string(), z.string()])).max(10000),
});
export type AtlasData = z.infer<typeof dataSchema>;
export function parseAtlasData(raw: unknown): AtlasData {
  const data = dataSchema.parse(raw),
    byId = new Map(data.nodes.map((n) => [n.id, n]));
  if (byId.size !== data.nodes.length) throw new Error("Duplicate Atlas node IDs.");
  const neighbors = new Map(data.nodes.map((n) => [n.id, [] as string[]]));
  for (const [a, b] of data.edges) {
    if (a === b || !byId.has(a) || !byId.has(b)) throw new Error("Invalid Atlas edge endpoint.");
    if (byId.get(a)!.branch !== byId.get(b)!.branch)
      throw new Error("Atlas edge crosses independent branches.");
    if (!byId.get(a)!.decorative && !byId.get(b)!.decorative) {
      neighbors.get(a)!.push(b);
      neighbors.get(b)!.push(a);
    }
  }
  for (const branch of new Set(data.nodes.map((n) => n.branch))) {
    const roots = data.nodes.filter((n) => n.branch === branch && n.root && !n.decorative);
    if (roots.length !== 1) throw new Error(`${branch}: expected one Atlas root.`);
    const reached = new Set([roots[0].id]),
      queue = [...reached];
    for (const id of queue)
      for (const next of neighbors.get(id)!)
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
    if (data.nodes.some((n) => n.branch === branch && !n.decorative && !reached.has(n.id)))
      throw new Error(`${branch}: disconnected Atlas node.`);
  }
  return data;
}
export function normalizeAtlasSource(
  raw: unknown,
  metadata: { revision: string; captured: string; patch: string },
  sprites: Map<string, PassiveSprite>,
): AtlasData {
  if (!/^[a-f0-9]{40}$/.test(metadata.revision)) throw new Error("Invalid Atlas source revision.");
  const source = z
    .object({
      groups: z.array(
        z.object({
          x: z.number().finite(),
          y: z.number().finite(),
          passives: z.array(
            z.object({
              hash: z.number().int(),
              radius: z.number().int().nonnegative(),
              position_clockwise: z.number().int().nonnegative(),
              connections: z.array(z.number().int()),
            }),
          ),
        }),
      ),
      orbit_radii: z.array(z.number().finite().nonnegative()),
      skills_per_orbit: z.array(z.number().int().positive()),
      roots: z.array(z.number().int()),
      passives: z.record(
        z.string(),
        z.object({
          id: z.string(),
          hash: z.number().int(),
          name: z.string(),
          icon: z.string(),
          stat_text: z.array(z.string()),
          atlas_subtree: z.object({ id: atlasBranchSchema }).optional(),
          is_notable: z.boolean().optional(),
          is_keystone: z.boolean().optional(),
          is_icon_only: z.boolean().optional(),
        }),
      ),
    })
    .parse(raw);
  const roots = new Set(source.roots.map(String)),
    positions = new Map<string, { x: number; y: number }>(),
    edges = new Map<string, [string, string]>();
  for (const group of source.groups)
    for (const passive of group.passives) {
      const id = String(passive.hash),
        radius = source.orbit_radii[passive.radius],
        count = source.skills_per_orbit[passive.radius];
      if (radius === undefined || count === undefined || passive.position_clockwise >= count)
        throw new Error("Invalid Atlas orbit.");
      // The source repeats one logical hash at two placements. Keep its final
      // placement and all hash-addressed edges; allocation still counts it once.
      const angle = (2 * Math.PI * passive.position_clockwise) / count;
      positions.set(id, {
        x: Math.round((group.x + radius * Math.sin(angle)) * 10) / 10,
        y: Math.round((group.y - radius * Math.cos(angle)) * 10) / 10,
      });
      for (const connection of passive.connections) {
        const pair = [id, String(connection)].sort() as [string, string];
        edges.set(pair.join(":"), pair);
      }
    }
  const cleanText = (value: string) =>
    value.replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2").replace(/\[([^\]]+)\]/g, "$1");
  const nodes = Object.entries(source.passives).map(([id, p]) => {
    if (id !== String(p.hash) || !positions.has(id))
      throw new Error("Atlas node is missing matching geometry.");
    const branch = p.atlas_subtree?.id ?? "Core";
    return {
      id,
      sourceId: p.id,
      name: p.name || (roots.has(id) ? `${branch} start` : "Atlas illustration"),
      branch,
      ...positions.get(id)!,
      root: roots.has(id),
      decorative: !!p.is_icon_only,
      kind: p.is_keystone
        ? ("keystone" as const)
        : p.is_notable
          ? ("notable" as const)
          : ("normal" as const),
      effects: p.stat_text.map(cleanText),
      sprite: sprites.get(p.icon),
    };
  });
  return parseAtlasData({
    identity: `atlas-${metadata.revision}`,
    source: `https://github.com/repoe-fork/poe2/blob/${metadata.revision}/data/passive_skill_trees/Atlas.json`,
    captured: metadata.captured,
    patch: metadata.patch,
    nodes,
    edges: [...edges.values()],
  });
}

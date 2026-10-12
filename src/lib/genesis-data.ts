import { z } from "zod";
export const GENESIS_BRANCHES = ["Currency", "Rings", "Amulets", "Belts", "Breachstones"] as const;
export const genesisBranchSchema = z.enum(GENESIS_BRANCHES);
export type GenesisBranch = z.infer<typeof genesisBranchSchema>;
const nodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  branch: genesisBranchSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  effects: z.array(z.string()),
  root: z.boolean(),
});
export type GenesisNode = z.infer<typeof nodeSchema>;
const dataSchema = z.object({
  identity: z.string().min(1),
  source: z.url(),
  captured: z.iso.date(),
  patch: z.string().min(1),
  historical: z.boolean(),
  nodes: z.array(nodeSchema).min(1).max(5000),
  edges: z.array(z.tuple([z.string(), z.string()])).max(10000),
  wombgifts: z.array(
    z.object({ name: z.string(), branch: genesisBranchSchema, description: z.string() }),
  ),
});
export type GenesisData = z.infer<typeof dataSchema>;
export function parseGenesisData(raw: unknown): GenesisData {
  const data = dataSchema.parse(raw),
    byId = new Map(data.nodes.map((n) => [n.id, n]));
  if (byId.size !== data.nodes.length) throw new Error("Genesis node IDs are duplicated.");
  const neighbors = new Map(data.nodes.map((n) => [n.id, new Set<string>()]));
  for (const [a, b] of data.edges) {
    if (!byId.has(a) || !byId.has(b) || a === b)
      throw new Error("Genesis edge contains an invalid endpoint.");
    if (byId.get(a)!.branch !== byId.get(b)!.branch)
      throw new Error("Genesis edge crosses independent branches.");
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  }
  for (const branch of GENESIS_BRANCHES) {
    const roots = data.nodes.filter((n) => n.branch === branch && n.root);
    if (roots.length !== 1) throw new Error(`${branch}: expected one Genesis root.`);
    const reached = new Set([roots[0].id]),
      queue = [roots[0].id];
    for (let i = 0; i < queue.length; i++)
      for (const n of neighbors.get(queue[i])!)
        if (!reached.has(n)) {
          reached.add(n);
          queue.push(n);
        }
    if (data.nodes.some((n) => n.branch === branch && !reached.has(n.id)))
      throw new Error(`${branch}: graph contains disconnected nodes.`);
  }
  return data;
}
export function normalizeGenesisSource(
  graph: unknown,
  crafting: unknown,
  revision: string,
): GenesisData {
  const raw = z
    .object({
      nodes: z.record(
        z.string(),
        z.object({
          id: z.string(),
          name: z.string(),
          x: z.number(),
          y: z.number(),
          subTree: genesisBranchSchema,
          stats: z.array(z.string()),
          choices: z.array(z.object({ name: z.string(), stats: z.array(z.string()) })).optional(),
        }),
      ),
      edges: z.array(z.object({ from: z.number(), to: z.number() })),
      subTrees: z.array(z.object({ id: genesisBranchSchema, root: z.string() })),
      _provenance: z.object({ captured: z.string(), source: z.string() }),
    })
    .parse(graph);
  const craft = z
    .object({
      wombgifts: z.array(
        z.object({ item: z.string(), subTree: genesisBranchSchema, desc: z.string() }),
      ),
    })
    .parse(crafting);
  const rootKeys = new Set(raw.subTrees.map((s) => s.root));
  const nodes = Object.entries(raw.nodes).map(([key, n]) => ({
    id: n.id,
    name: n.name,
    branch: n.subTree,
    x: n.x,
    y: n.y,
    root: rootKeys.has(key),
    effects: [
      ...n.stats,
      ...(n.choices ?? []).flatMap((c) => c.stats.map((s) => `Option (${c.name}): ${s}`)),
    ],
  }));
  const lookup = (key: number) => {
    const node = raw.nodes[String(key)];
    if (!node) throw new Error("Source edge references an unknown node.");
    return node.id;
  };
  return parseGenesisData({
    identity: `genesis-${revision}`,
    source: `https://github.com/PraedythXIV/poe2-build-converter/tree/${revision}`,
    captured: raw._provenance.captured,
    patch: raw._provenance.source.split(" @ ").at(-1) ?? "unknown",
    historical: true,
    nodes,
    edges: raw.edges.map((e) => [lookup(e.from), lookup(e.to)]),
    wombgifts: craft.wombgifts.map((w) => ({
      name: w.item,
      branch: w.subTree,
      description: w.desc,
    })),
  });
}

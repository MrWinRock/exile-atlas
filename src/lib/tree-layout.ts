import { edgeKey, isAllocatablePassive, passiveRadius, type Tree, type TreeNode } from "./tree";

function bounds(nodes: TreeNode[]) {
  const radius = (n: TreeNode) => passiveRadius(n) + 8 * (n.displayScale ?? 1);
  return {
    minX: Math.min(...nodes.map((n) => n.x - radius(n))),
    maxX: Math.max(...nodes.map((n) => n.x + radius(n))),
    minY: Math.min(...nodes.map((n) => n.y - radius(n))),
    maxY: Math.max(...nodes.map((n) => n.y + radius(n))),
  };
}

export function plannerTree(tree: Tree, ascendancy: string): Tree {
  const visibleNodes = tree.nodes.filter(
    (n) => !n.itemOnly && (!n.ascendancy || n.ascendancy === ascendancy),
  );
  const selected = visibleNodes.filter(
    (n) => !!ascendancy && n.ascendancy === ascendancy && isAllocatablePassive(n),
  );
  let centerX = 0,
    centerY = 0,
    scale = 1;
  if (selected.length) {
    const box = bounds(selected);
    centerX = (box.minX + box.maxX) / 2;
    centerY = (box.minY + box.maxY) / 2;
    // Fit the whole group into the opening inside the class starts. Scale its
    // geometry and frames together so large ascendancies don't overlap the base.
    const opening = Math.max(
      1,
      Math.min(
        1100,
        ...visibleNodes
          .filter((n) => !n.ascendancy && isAllocatablePassive(n))
          .map((n) => Math.hypot(n.x, n.y) - passiveRadius(n) - 48),
      ),
    );
    const extent = Math.max(
      ...selected.map((n) => Math.hypot(n.x - centerX, n.y - centerY) + passiveRadius(n) + 8),
    );
    scale = Math.min(1, opening / extent);
  }
  const nodes = visibleNodes.map((n) =>
    selected.length && n.ascendancy === ascendancy
      ? { ...n, x: (n.x - centerX) * scale, y: (n.y - centerY) * scale, displayScale: scale }
      : n,
  );
  const visible = new Set(nodes.map((n) => n.hash));
  const edges = tree.edges.filter(([a, b]) => visible.has(a) && visible.has(b));
  const moved = new Set(selected.map((n) => n.hash));
  const edgeArcs: NonNullable<Tree["edgeArcs"]> = {};
  for (const [a, b] of edges) {
    const key = edgeKey(a, b),
      center = tree.edgeArcs?.[key];
    if (!center) continue;
    if (moved.has(a) && moved.has(b))
      edgeArcs[key] = { x: (center.x - centerX) * scale, y: (center.y - centerY) * scale };
    else if (!moved.has(a) && !moved.has(b)) edgeArcs[key] = center;
  }
  return { ...tree, nodes, edges, edgeArcs };
}

export function fitTreeView(tree: Tree, width: number, height: number, ascendancy?: string) {
  const passives = tree.nodes.filter(isAllocatablePassive);
  const selected = passives.filter((n) => !!ascendancy && n.ascendancy === ascendancy);
  const nodes = selected.length ? selected : passives;
  if (!nodes.length) return { x: width / 2, y: height / 2, scale: 1 };
  const { minX, maxX, minY, maxY } = bounds(nodes);
  const padding = selected.length ? 128 : 64;
  const scale = Math.min(
    0.5,
    Math.max(1, width - padding) / (maxX - minX || 1),
    Math.max(1, height - padding) / (maxY - minY || 1),
  );
  return {
    x: width / 2 - ((minX + maxX) / 2) * scale,
    y: height / 2 - ((minY + maxY) / 2) * scale,
    scale,
  };
}

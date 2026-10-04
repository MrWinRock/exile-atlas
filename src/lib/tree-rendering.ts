import { isAllocatablePassive, passiveRadius, type TreeNode } from "./tree";
export type ViewBounds = { x: number; y: number; width: number; height: number };
// Query nearby cells rather than walking every passive on pointer movement.
export function createNodeIndex(nodes: TreeNode[]) {
  const size = 512,
    cells = new Map<string, TreeNode[]>(),
    passives = nodes.filter(isAllocatablePassive);
  const order = new Map(passives.map((node, i) => [node, i]));
  let padding = 0;
  for (const node of passives) {
    const key = `${Math.floor(node.x / size)},${Math.floor(node.y / size)}`;
    const cell = cells.get(key) ?? [];
    cell.push(node);
    cells.set(key, cell);
    padding = Math.max(padding, passiveRadius(node) + 8 * (node.displayScale ?? 1));
  }
  function visible(bounds: ViewBounds) {
    const minX = Math.floor((bounds.x - padding) / size),
      maxX = Math.floor((bounds.x + bounds.width + padding) / size);
    const minY = Math.floor((bounds.y - padding) / size),
      maxY = Math.floor((bounds.y + bounds.height + padding) / size);
    const candidates: TreeNode[] = [];
    if ((maxX - minX + 1) * (maxY - minY + 1) > cells.size) candidates.push(...passives);
    else
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) candidates.push(...(cells.get(`${x},${y}`) ?? []));
    return candidates
      .filter((node) => {
        const radius = passiveRadius(node) + 8 * (node.displayScale ?? 1);
        return (
          node.x + radius >= bounds.x &&
          node.x - radius <= bounds.x + bounds.width &&
          node.y + radius >= bounds.y &&
          node.y - radius <= bounds.y + bounds.height
        );
      })
      .sort((a, b) => order.get(a)! - order.get(b)!);
  }
  return {
    visible,
    hit(x: number, y: number) {
      const candidates = visible({ x, y, width: 0, height: 0 });
      for (let i = candidates.length - 1; i >= 0; i--) {
        const node = candidates[i];
        if (
          Math.hypot(node.x - x, node.y - y) <=
          passiveRadius(node) + 8 * (node.displayScale ?? 1)
        )
          return node;
      }
    },
  };
}
export function changedAllocations(previous: Set<string>, next: Set<string>) {
  return [...previous]
    .filter((id) => !next.has(id))
    .concat([...next].filter((id) => !previous.has(id)));
}
export function createFrameScheduler(
  render: () => void,
  request: (callback: FrameRequestCallback) => number,
  cancel: (id: number) => void,
) {
  let frame: number | undefined,
    disposed = false;
  return {
    request() {
      if (disposed || frame !== undefined) return;
      frame = request(() => {
        frame = undefined;
        if (!disposed) render();
      });
    },
    dispose() {
      disposed = true;
      if (frame !== undefined) cancel(frame);
      frame = undefined;
    },
  };
}

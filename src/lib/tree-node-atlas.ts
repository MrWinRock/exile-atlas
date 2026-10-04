import { Rectangle, Texture } from "pixi.js";
import { passiveRadius, type TreeNode } from "./tree";

// Bake circular clipping and frames once per distinct icon into shared pages.
// Each passive is then a single batched sprite, without a live stencil mask.
export function createNodeAtlas(sheets: Map<string, Texture>) {
  const pageSize = 2048,
    textures = new Map<string, Texture>(),
    pages: Texture[] = [];
  let context: CanvasRenderingContext2D,
    page: Texture,
    x = pageSize,
    y = 0,
    rowHeight = 0;
  function texture(node: TreeNode, active: boolean) {
    const artwork = active ? node.image : (node.inactiveImage ?? node.image);
    const key = `${node.kind}:${active}:${artwork ? `${artwork.sheet}:${artwork.x}:${artwork.y}:${artwork.w}:${artwork.h}` : "empty"}`;
    const cached = textures.get(key);
    if (cached) return cached;
    const radius = passiveRadius({ ...node, displayScale: 1 }),
      margin = 10,
      side = Math.ceil((radius + margin) * 2);
    if (x + side > pageSize) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    if (!page || y + side > pageSize) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = pageSize;
      context = canvas.getContext("2d")!;
      page = Texture.from(canvas);
      pages.push(page);
      x = y = rowHeight = 0;
    }
    const center = radius + margin;
    context.save();
    context.translate(x + center, y + center);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fillStyle = active
      ? "#dfb373"
      : node.kind === "keystone"
        ? "#86677c"
        : node.kind === "notable"
          ? "#8e7856"
          : "#202a2c";
    context.fill();
    context.lineWidth = active ? 16 : 12;
    context.strokeStyle = active
      ? "#f3d3a6"
      : node.kind === "keystone"
        ? "#c197b4"
        : node.kind === "notable"
          ? "#af976a"
          : "#6e7a7b";
    context.stroke();
    const sheet = artwork && sheets.get(artwork.sheet);
    if (artwork && sheet) {
      context.beginPath();
      context.arc(0, 0, radius - 10, 0, Math.PI * 2);
      context.clip();
      const scale = (2 * radius - 20) / Math.max(artwork.w, artwork.h);
      context.drawImage(
        sheet.source.resource as CanvasImageSource,
        artwork.x,
        artwork.y,
        artwork.w,
        artwork.h,
        (-artwork.w * scale) / 2,
        (-artwork.h * scale) / 2,
        artwork.w * scale,
        artwork.h * scale,
      );
    }
    context.restore();
    const result = new Texture({ source: page.source, frame: new Rectangle(x, y, side, side) });
    textures.set(key, result);
    x += side;
    rowHeight = Math.max(rowHeight, side);
    return result;
  }
  return {
    texture,
    upload() {
      for (const page of pages) page.source.update();
    },
    destroy() {
      for (const texture of textures.values()) texture.destroy();
      for (const page of pages) page.destroy(true);
    },
  };
}

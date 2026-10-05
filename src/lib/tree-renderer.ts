import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { connectionArc, edgeKey, isAllocatablePassive, passiveRadius, type Tree } from "./tree";
import { fitTreeView } from "./tree-layout";
import { changedAllocations, createFrameScheduler, createNodeIndex } from "./tree-rendering";
import { createNodeAtlas } from "./tree-node-atlas";
import { passiveEdgeColor, WEAPON_PASSIVE_COLORS } from "./passive-colors";

export type TreeRenderer = Awaited<ReturnType<typeof createTreeRenderer>>;

export async function createTreeRenderer(
  host: HTMLDivElement,
  tree: Tree,
  ascendancy: string | undefined,
  select: (hash: string) => void,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const cropped: Texture[] = [],
    sheets = new Map<string, Texture>();
  // Load before creating a context: replaced scenes must not retain a pending
  // WebGL application or bake thousands of unused icons while assets load.
  await Promise.allSettled(
    [
      ...new Set(
        tree.nodes
          .flatMap((node) => [node.image?.sheet, node.inactiveImage?.sheet])
          .filter((url): url is string => !!url),
      ),
    ].map(async (url) => {
      sheets.set(url, await Assets.load<Texture>(url));
    }),
  );
  signal?.throwIfAborted();
  const app = new Application();
  const atlas = createNodeAtlas(sheets);
  try {
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      preference: "webgl",
      autoStart: false,
      eventMode: "none",
    });
    signal?.throwIfAborted();
    const world = new Container();
    world.eventMode = "none";
    app.stage.addChild(world);
    const decorations = new Container(),
      edges = new Graphics(),
      activeEdges = new Graphics(),
      passives = new Container(),
      weaponFrames = new Graphics(),
      selection = new Graphics();
    world.addChild(decorations, edges, activeEdges, passives, weaponFrames, selection);
    const byId = new Map(tree.nodes.map((node) => [node.hash, node]));
    const index = createNodeIndex(tree.nodes);
    const sprites = new Map<string, { sprite: Sprite; active: Texture; inactive: Texture }>();
    const decorationSprites: { sprite: Sprite; x: number; y: number; radius: number }[] = [];
    const sharedDecorations = new Map<string, Texture>();
    for (const node of tree.nodes.filter((node) => node.kind === "mastery" && !node.itemOnly)) {
      const artwork = node.inactiveImage ?? node.image,
        sheet = artwork && sheets.get(artwork.sheet);
      if (!artwork || !sheet) continue;
      const key = `${artwork.sheet}:${artwork.x}:${artwork.y}:${artwork.w}:${artwork.h}`;
      let texture = sharedDecorations.get(key);
      if (!texture) {
        texture = new Texture({
          source: sheet.source,
          frame: new Rectangle(artwork.x, artwork.y, artwork.w, artwork.h),
        });
        sharedDecorations.set(key, texture);
        cropped.push(texture);
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(node.x, node.y);
      sprite.scale.set((200 * (node.displayScale ?? 1)) / Math.max(artwork.w, artwork.h));
      sprite.alpha = 0.16;
      decorations.addChild(sprite);
      decorationSprites.push({
        sprite,
        x: node.x,
        y: node.y,
        radius: 100 * (node.displayScale ?? 1),
      });
    }
    function drawEdge(graphic: Graphics, a: string, b: string, active: boolean, color = 0xdab077) {
      const from = byId.get(a),
        to = byId.get(b);
      if (!from || !to || !isAllocatablePassive(from) || !isAllocatablePassive(to)) return;
      graphic.moveTo(from.x, from.y);
      const arc = connectionArc(from, to, tree.edgeArcs?.[edgeKey(a, b)]);
      if (arc) graphic.arc(arc.x, arc.y, arc.radius, arc.start, arc.end, arc.anticlockwise);
      graphic.lineTo(to.x, to.y).stroke({
        width: (active ? 30 : 14) * Math.min(from.displayScale ?? 1, to.displayScale ?? 1),
        color: active ? color : 0x394042,
        alpha: active ? 0.9 : 0.5,
      });
    }
    for (const [a, b] of tree.edges) drawEdge(edges, a, b, false);
    for (const node of tree.nodes.filter(isAllocatablePassive)) {
      const inactive = atlas.texture(node, false),
        active = atlas.texture(node, true),
        sprite = new Sprite(inactive);
      sprite.anchor.set(0.5);
      sprite.position.set(node.x, node.y);
      sprite.scale.set(node.displayScale ?? 1);
      sprite.visible = false;
      passives.addChild(sprite);
      sprites.set(node.hash, { sprite, active, inactive });
    }
    atlas.upload();
    let visible = new Set<string>(),
      chosen = new Set<string>(),
      weaponChosen = new Set<string>(),
      activeWeaponSet: 1 | 2 | undefined,
      selected: string | undefined;
    let frames = 0,
      alive = true;
    const scheduler = createFrameScheduler(
      () => {
        const start = performance.now(),
          scale = world.scale.x;
        const bounds = {
          x: -world.x / scale,
          y: -world.y / scale,
          width: host.clientWidth / scale,
          height: host.clientHeight / scale,
        };
        const next = new Set(index.visible(bounds).map((node) => node.hash));
        for (const id of visible) if (!next.has(id)) sprites.get(id)!.sprite.visible = false;
        for (const id of next) if (!visible.has(id)) sprites.get(id)!.sprite.visible = true;
        visible = next;
        for (const decoration of decorationSprites)
          decoration.sprite.visible =
            decoration.x + decoration.radius >= bounds.x &&
            decoration.x - decoration.radius <= bounds.x + bounds.width &&
            decoration.y + decoration.radius >= bounds.y &&
            decoration.y - decoration.radius <= bounds.y + bounds.height;
        app.render();
        host.dataset.renderFrames = String(++frames);
        host.dataset.visibleNodes = String(visible.size);
        host.dataset.renderMs = (performance.now() - start).toFixed(2);
      },
      (callback) => requestAnimationFrame(callback),
      (id) => cancelAnimationFrame(id),
    );
    function fit() {
      const camera = fitTreeView(tree, host.clientWidth, host.clientHeight, ascendancy);
      world.position.set(camera.x, camera.y);
      world.scale.set(camera.scale);
      scheduler.request();
    }
    function zoom(factor: number, x = host.clientWidth / 2, y = host.clientHeight / 2) {
      const old = world.scale.x,
        next = Math.max(0.003, Math.min(0.5, old * factor));
      world.position.set(x - ((x - world.x) * next) / old, y - ((y - world.y) * next) / old);
      world.scale.set(next);
      scheduler.request();
    }
    function hit(e: PointerEvent) {
      const rect = host.getBoundingClientRect();
      return index.hit(
        (e.clientX - rect.left - world.x) / world.scale.x,
        (e.clientY - rect.top - world.y) / world.scale.x,
      );
    }
    let pointer: number | undefined,
      startX = 0,
      startY = 0,
      originX = 0,
      originY = 0,
      moved = false;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || pointer !== undefined) return;
      pointer = e.pointerId;
      originX = startX = e.clientX;
      originY = startY = e.clientY;
      moved = false;
      host.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pointer === e.pointerId) {
        moved ||= Math.hypot(e.clientX - originX, e.clientY - originY) > 5;
        if (moved) {
          world.x += e.clientX - startX;
          world.y += e.clientY - startY;
          scheduler.request();
        }
        startX = e.clientX;
        startY = e.clientY;
        host.style.cursor = moved ? "grabbing" : "pointer";
      } else if (pointer === undefined) host.style.cursor = hit(e) ? "pointer" : "grab";
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      if (!moved && e.type === "pointerup") {
        const node = hit(e);
        if (node) select(node.hash);
      }
      pointer = undefined;
      if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
      host.style.cursor = "grab";
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.15 : 0.87, e.clientX - rect.left, e.clientY - rect.top);
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);
    host.addEventListener("lostpointercapture", up);
    host.addEventListener("wheel", wheel, { passive: false });
    let width = host.clientWidth,
      height = host.clientHeight;
    const observer = new ResizeObserver(() => {
      app.resize();
      const nextWidth = host.clientWidth,
        nextHeight = host.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      if (ascendancy) fit();
      else {
        world.x += (nextWidth - width) / 2;
        world.y += (nextHeight - height) / 2;
        scheduler.request();
      }
      width = nextWidth;
      height = nextHeight;
    });
    observer.observe(host);
    host.appendChild(app.canvas);
    host.dataset.rendererBuilds = String(Number(host.dataset.rendererBuilds ?? 0) + 1);
    host.dataset.totalNodes = String(sprites.size);
    fit();
    return {
      fit,
      zoom,
      update(
        allocated: string[],
        highlight?: string,
        weaponAllocated?: string[],
        weaponSet?: 1 | 2,
      ) {
        if (!alive) return;
        const next = new Set(allocated),
          changed = changedAllocations(chosen, next),
          nextWeapon = new Set(
            weaponSet ? (weaponAllocated ?? []).filter((id) => next.has(id)) : [],
          ),
          weaponChanged =
            activeWeaponSet !== weaponSet ||
            changedAllocations(weaponChosen, nextWeapon).length > 0;
        for (const id of changed) {
          const entry = sprites.get(id);
          if (entry) entry.sprite.texture = next.has(id) ? entry.active : entry.inactive;
        }
        if (changed.length || weaponChanged) {
          activeEdges.clear();
          for (const [a, b] of tree.edges)
            if (next.has(a) && next.has(b))
              drawEdge(activeEdges, a, b, true, passiveEdgeColor(a, b, nextWeapon, weaponSet));
          chosen = next;
        }
        if (weaponChanged) {
          weaponFrames.clear();
          if (weaponSet)
            for (const id of nextWeapon) {
              const node = byId.get(id);
              if (!node || !isAllocatablePassive(node)) continue;
              weaponFrames.circle(node.x, node.y, passiveRadius(node)).stroke({
                width: 20 * (node.displayScale ?? 1),
                color: WEAPON_PASSIVE_COLORS[weaponSet],
                alpha: 1,
              });
            }
          weaponChosen = nextWeapon;
          activeWeaponSet = weaponSet;
        }
        const highlightChanged = selected !== highlight;
        if (highlightChanged) {
          selected = highlight;
          selection.clear();
          const node = highlight && byId.get(highlight);
          if (node && isAllocatablePassive(node))
            selection
              .circle(node.x, node.y, passiveRadius(node) + 70 * (node.displayScale ?? 1))
              .stroke({ width: 22 * (node.displayScale ?? 1), color: 0xeed2a6, alpha: 0.8 });
        }
        if (changed.length || weaponChanged || highlightChanged) scheduler.request();
      },
      destroy() {
        alive = false;
        scheduler.dispose();
        observer.disconnect();
        host.removeEventListener("pointerdown", down);
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerup", up);
        host.removeEventListener("pointercancel", up);
        host.removeEventListener("lostpointercapture", up);
        host.removeEventListener("wheel", wheel);
        if (pointer !== undefined && host.hasPointerCapture(pointer))
          host.releasePointerCapture(pointer);
        host.style.cursor = "";
        app.destroy(true, { children: true });
        atlas.destroy();
        for (const texture of cropped) texture.destroy();
      },
    };
  } catch (error) {
    if (app.renderer) app.destroy(true, { children: true });
    else app.stage.destroy({ children: true });
    atlas.destroy();
    for (const texture of cropped) texture.destroy();
    throw error;
  }
}

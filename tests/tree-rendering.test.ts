import { expect, spyOn, test } from "bun:test";
import { Assets, Texture } from "pixi.js";
import {
  createNodeIndex,
  changedAllocations,
  createFrameScheduler,
} from "../src/lib/tree-rendering";
import { normalizeTree } from "../src/lib/tree";
import { createTreeRenderer } from "../src/lib/tree-renderer";

test("an abandoned scene does not initialize WebGL or load artwork", async () => {
  const controller = new AbortController(),
    reason = new Error("Scene was replaced");
  controller.abort(reason);
  await expect(
    createTreeRenderer(
      {} as HTMLDivElement,
      normalizeTree({ nodes: {} }),
      undefined,
      () => {},
      controller.signal,
    ),
  ).rejects.toBe(reason);
});

test("a scene replaced while artwork loads stops before creating WebGL", async () => {
  const controller = new AbortController(),
    reason = new Error("Scene was replaced during loading");
  const tree = normalizeTree({ nodes: { "1": { id: "node", x: 0, y: 0 } } });
  tree.nodes[0].image = {
    sheet: "test.webp",
    sheetWidth: 10,
    sheetHeight: 10,
    x: 0,
    y: 0,
    w: 10,
    h: 10,
  };
  const loader = spyOn(Assets, "load").mockImplementation(async () => {
    await Promise.resolve();
    controller.abort(reason);
    return Texture.EMPTY;
  });
  try {
    await expect(
      createTreeRenderer({} as HTMLDivElement, tree, undefined, () => {}, controller.signal),
    ).rejects.toBe(reason);
    expect(loader).toHaveBeenCalledTimes(1);
  } finally {
    loader.mockRestore();
  }
});

test("viewport queries keep partially visible frames and exclude distant nodes", () => {
  const tree = normalizeTree({
    nodes: {
      "1": { id: "edge", x: 125, y: 50 },
      "2": { id: "outside", x: 1000, y: 50 },
      "3": { id: "decoration", x: 50, y: 50, isMastery: true },
    },
  });
  const index = createNodeIndex(tree.nodes);
  expect(index.visible({ x: 0, y: 0, width: 100, height: 100 })).toEqual([tree.nodes[0]]);
  expect(index.hit(160, 50)?.hash).toBe("1");
  expect(index.hit(200, 50)).toBeUndefined();
  expect(index.hit(50, 50)).toBeUndefined();
});

test("overlapping pointer targets choose the last painted node and scaled frames use scaled radii", () => {
  const tree = normalizeTree({
    nodes: {
      "1": { id: "first", x: -100, y: -100 },
      "2": { id: "last", x: -100, y: -100 },
    },
  });
  tree.nodes[1].displayScale = 0.5;
  const index = createNodeIndex(tree.nodes);
  expect(index.hit(-100, -100)?.hash).toBe("2");
  expect(index.hit(-70, -100)?.hash).toBe("1");
});

test("allocation updates touch only added and removed passives", () => {
  expect(changedAllocations(new Set(["1", "2"]), new Set(["2", "3"]))).toEqual(["1", "3"]);
  expect(changedAllocations(new Set(["1"]), new Set(["1"]))).toEqual([]);
});

test("render requests coalesce into one frame, stop when idle, and cancel on disposal", () => {
  let pending: FrameRequestCallback | undefined,
    requests = 0,
    renders = 0,
    cancels = 0;
  const scheduler = createFrameScheduler(
    () => {
      renders++;
    },
    (callback) => {
      requests++;
      pending = callback;
      return requests;
    },
    () => {
      cancels++;
    },
  );
  scheduler.request();
  scheduler.request();
  scheduler.request();
  expect(requests).toBe(1);
  pending!(0);
  expect(renders).toBe(1);
  expect(requests).toBe(1);
  scheduler.request();
  scheduler.dispose();
  pending!(1);
  scheduler.request();
  expect(cancels).toBe(1);
  expect(renders).toBe(1);
  expect(requests).toBe(2);
});

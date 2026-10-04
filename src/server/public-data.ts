import { z } from "zod";
import { normalizeMarket, validateHour } from "../lib/currency";
import { normalizeTree } from "../lib/tree";
import { fetchJson } from "./poe-client";
import { getConfig } from "./config";
import { createSpriteIndex, type PassiveSprite } from "../lib/artwork";
import { cacheGet, cacheSet } from "./cache";
export async function getCurrency(hour: number) {
  validateHour(hour);
  const raw = await fetchJson<unknown>(
    `https://web.poecdn.com/api/currency-exchange/poe2/${hour}`,
    undefined,
    3600,
  );
  const data = z.object({ next_change_id: z.number(), markets: z.array(z.unknown()) }).parse(raw);
  return {
    hour,
    nextChangeId: data.next_change_id,
    markets: data.markets.map(normalizeMarket),
    source: "GGG Currency Exchange",
    fetchedAt: new Date().toISOString(),
  };
}
export async function getTree() {
  const cached = await cacheGet<ReturnType<typeof normalizeTree> & { source: string }>(
    "artwork:tree:v4",
  );
  if (cached) return cached;
  const version = await fetchJson<{ sha: string }>(
    "https://api.github.com/repos/grindinggear/poe2-skilltree-export/git/trees/main",
    undefined,
    86400,
  );
  const root = `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/${version.sha}/`;
  const url = getConfig().treeUrl.replace("/main/data.json", `/${version.sha}/data.json`);
  const raw = await fetchJson<unknown>(url, undefined, 86400);
  const active = new Map<string, PassiveSprite>(),
    inactive = new Map<string, PassiveSprite>();
  for (const [name, index] of [
    ["skills", active],
    ["skills-disabled", inactive],
    ["mastery-effect-active", active],
    ["mastery-effect-disabled", inactive],
  ] as const) {
    const atlas = await fetchJson<unknown>(root + "assets/" + name + ".json", undefined, 86400);
    for (const [key, sprite] of createSpriteIndex(atlas, root + "assets/")) index.set(key, sprite);
  }
  const frames = await fetchJson<unknown>(root + "assets/frame.json", undefined, 86400);
  const frameIndex = createSpriteIndex(frames, root + "assets/");
  const jewelFrame = frameIndex.get("frame:JewelFrameAllocated");
  const inactiveJewelFrame = frameIndex.get("frame:JewelFrameUnallocated");
  if (jewelFrame) active.set("frame:JewelFrameAllocated", jewelFrame);
  if (inactiveJewelFrame) inactive.set("frame:JewelFrameUnallocated", inactiveJewelFrame);
  const result = {
    ...normalizeTree(raw, active, inactive),
    source: "GGG official PoE2 passive-tree export",
  };
  await cacheSet("artwork:tree:v4", result, 86400);
  return result;
}

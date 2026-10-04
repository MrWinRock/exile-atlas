import { fetchJson } from "./poe-client";
import { cacheGet, cacheSet } from "./cache";
import { normalizeItemArtwork, scopePoE2Artwork, type ItemArtwork } from "../lib/artwork";
export type ItemCatalogue = {
  items: ItemArtwork[];
  revision: string;
  fetchedAt: string;
  source: string;
  withImages: number;
};
export async function getItemCatalogue(): Promise<ItemCatalogue> {
  const cached = await cacheGet<ItemCatalogue>("artwork:items:v3");
  if (cached) return cached;
  const files = await fetchJson<{ sha: string; truncated: boolean; tree: { path: string }[] }>(
    "https://api.github.com/repos/repoe-fork/poe2/git/trees/master?recursive=1",
    undefined,
    86400,
  );
  if (files.truncated) throw new Error("Item image manifest is incomplete");
  const root = `https://raw.githubusercontent.com/repoe-fork/poe2/${files.sha}/data/`;
  const bases = await fetchJson<unknown>(root + "base_items.json", undefined, 86400);
  const uniques = await fetchJson<unknown>(root + "uniques.json", undefined, 86400);
  const normalized = normalizeItemArtwork(
    bases,
    uniques,
    files.tree.map((f) => f.path),
    files.sha,
  );
  const tradeItems = await fetchJson<unknown>(
    "https://www.pathofexile.com/api/trade2/data/items",
    undefined,
    86400,
  );
  const staticItems = await fetchJson<unknown>(
    "https://www.pathofexile.com/api/trade2/data/static",
    undefined,
    86400,
  );
  const items = scopePoE2Artwork(normalized, tradeItems, staticItems);
  const result = {
    items,
    revision: files.sha,
    fetchedAt: new Date().toISOString(),
    source: "RePoE PoE2 artwork, scoped to the public PoE2 trade reference lists",
    withImages: items.filter((i) => i.icon).length,
  };
  await cacheSet("artwork:items:v3", result, 86400);
  return result;
}

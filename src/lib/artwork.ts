import { z } from "zod";
export type PassiveSprite = {
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  x: number;
  y: number;
  w: number;
  h: number;
};
const atlasSchema = z.object({
  frames: z.record(
    z.string(),
    z.object({
      frame: z.object({
        x: z.number().nonnegative(),
        y: z.number().nonnegative(),
        w: z.number().positive(),
        h: z.number().positive(),
      }),
    }),
  ),
  meta: z.object({
    image: z.string().regex(/^[a-z0-9-]+\.webp$/),
    size: z.object({ w: z.number().positive(), h: z.number().positive() }),
  }),
});
export function createSpriteIndex(raw: unknown, baseUrl: string): Map<string, PassiveSprite> {
  const atlas = atlasSchema.parse(raw);
  return new Map(
    Object.entries(atlas.frames).map(([key, { frame }]) => [
      key,
      {
        sheet: new URL(atlas.meta.image, baseUrl).href,
        sheetWidth: atlas.meta.size.w,
        sheetHeight: atlas.meta.size.h,
        ...frame,
      },
    ]),
  );
}
export function pickPassiveSprite(
  index: Map<string, PassiveSprite>,
  icon: string,
  kind: string,
  effect?: string,
): PassiveSprite | undefined {
  const prefix = kind === "keystone" ? "keystone" : kind === "notable" ? "notable" : "normal";
  for (const key of [
    `${prefix}Active:${icon}`,
    `${prefix}Inactive:${icon}`,
    `normalActive:${icon}`,
    `normalInactive:${icon}`,
    `notableActive:${icon}`,
    `notableInactive:${icon}`,
  ]) {
    const sprite = index.get(key);
    if (sprite) return sprite;
  }
  if (effect)
    return (
      index.get(`masteryEffectActive:${effect}`) ??
      index.get(`masteryEffectInactive:${effect}`) ??
      index.get(`masteryEffectDisabled:${effect}`)
    );
  if (kind === "jewel")
    return index.get("frame:JewelFrameAllocated") ?? index.get("frame:JewelFrameUnallocated");
  return undefined;
}
export type ItemArtwork = {
  id: string;
  name: string;
  itemClass: string;
  kind: "base" | "unique";
  icon?: string;
  width: number;
  height: number;
};
const entrySchema = z.object({
  name: z.string(),
  item_class: z.string(),
  id: z.string().optional(),
  release_state: z.string().optional(),
  is_alternate_art: z.boolean().optional(),
  inventory_width: z.number().optional(),
  inventory_height: z.number().optional(),
  visual_identity: z.object({ dds_file: z.string().nullable().optional() }).nullable().optional(),
});
export function normalizeItemArtwork(
  bases: unknown,
  uniques: unknown,
  filePaths: string[],
  revision: string,
): ItemArtwork[] {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Invalid item-data revision");
  const files = new Set(filePaths);
  const result: ItemArtwork[] = [];
  for (const [kind, raw] of [
    ["base", bases],
    ["unique", uniques],
  ] as const) {
    const entries = z.record(z.string(), z.unknown()).parse(raw);
    for (const [key, value] of Object.entries(entries)) {
      const parsed = entrySchema.safeParse(value);
      if (!parsed.success) continue;
      const item = parsed.data;
      if (
        !item.name ||
        item.name.startsWith("[DNT]") ||
        (kind === "base" && item.release_state !== "released") ||
        item.is_alternate_art
      )
        continue;
      const dds = item.visual_identity?.dds_file;
      const stem =
        dds?.startsWith("Art/") && !dds.includes("..")
          ? "data/" + dds.replace(/\.dds$/i, "")
          : undefined;
      const path = stem ? [stem + ".webp", stem + ".png"].find((p) => files.has(p)) : undefined;
      result.push({
        id: kind === "base" ? key : "unique:" + key,
        name: item.name,
        itemClass: item.item_class,
        kind,
        icon: path
          ? `https://raw.githubusercontent.com/repoe-fork/poe2/${revision}/${path}`
          : undefined,
        width: item.inventory_width ?? 1,
        height: item.inventory_height ?? 1,
      });
    }
  }
  return result;
}
const tradeItemsSchema = z.object({
  result: z.array(
    z.object({
      entries: z.array(
        z.object({
          type: z.string(),
          name: z.string().optional(),
          flags: z.object({ unique: z.boolean().optional() }).optional(),
        }),
      ),
    }),
  ),
});
const staticItemsSchema = z.object({
  result: z.array(
    z.object({ entries: z.array(z.object({ text: z.string(), image: z.string().optional() })) }),
  ),
});
export function scopePoE2Artwork(
  items: ItemArtwork[],
  tradeItems: unknown,
  staticItems: unknown,
): ItemArtwork[] {
  const bases = new Set<string>(),
    uniques = new Set<string>(),
    images = new Map<string, string>();
  for (const group of tradeItemsSchema.parse(tradeItems).result)
    for (const entry of group.entries) {
      if (entry.flags?.unique && entry.name) uniques.add(entry.name);
      else bases.add(entry.type);
    }
  for (const group of staticItemsSchema.parse(staticItems).result)
    for (const entry of group.entries) {
      bases.add(entry.text);
      if (entry.image?.startsWith("/gen/image/"))
        images.set(entry.text, new URL(entry.image, "https://www.pathofexile.com").href);
    }
  return (
    items
      // This legacy PoE1 record shares a name with PoE2's UltimatumKey records.
      .filter(
        (item) =>
          item.id !== "Metadata/Items/Ultimatum/ItemisedTrial" &&
          (item.kind === "unique" ? uniques : bases).has(item.name),
      )
      .map((item) => ({ ...item, icon: item.icon ?? images.get(item.name) }))
  );
}

import { expect, test } from "bun:test";
import { normalizeTree } from "../src/lib/tree";
import {
  createSpriteIndex,
  pickPassiveSprite,
  normalizeItemArtwork,
  scopePoE2Artwork,
} from "../src/lib/artwork";

const atlas = {
  frames: { "normalActive:Art/strength.png": { frame: { x: 34, y: 68, w: 34, h: 34 } } },
  meta: { image: "skills.webp", size: { w: 1024, h: 2048 } },
};
test("maps official sprite rectangles and preserves atlas dimensions", () => {
  const index = createSpriteIndex(
    atlas,
    "https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/commit/assets/",
  );
  const sprite = pickPassiveSprite(index, "Art/strength.png", "normal");
  expect(sprite).toMatchObject({ x: 34, y: 68, w: 34, h: 34, sheetWidth: 1024, sheetHeight: 2048 });
  expect(sprite?.sheet).toEndWith("assets/skills.webp");
  expect(pickPassiveSprite(index, "missing.png", "normal")).toBeUndefined();
});
test("uses mastery effect artwork when a mastery has no skill icon", () => {
  const index = createSpriteIndex(
    {
      ...atlas,
      frames: { "masteryEffectActive:Art/mastery.png": { frame: { x: 0, y: 0, w: 244, h: 241 } } },
    },
    "https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/commit/assets/",
  );
  expect(pickPassiveSprite(index, "", "mastery", "Art/mastery.png")?.w).toBe(244);
});
test("item artwork uses metadata IDs and verified image files, including uniques", () => {
  const bases = {
    "Metadata/Items/Currency/CurrencyRerollRare": {
      name: "Chaos Orb",
      item_class: "StackableCurrency",
      release_state: "released",
      visual_identity: { dds_file: "Art/2DItems/Currency/CurrencyRerollRare.dds" },
    },
    "Metadata/Items/Hidden": {
      name: "Unreleased",
      item_class: "Sword",
      release_state: "unreleased",
    },
    "Metadata/Items/Internal": {
      name: "[DNT] Not Shown To Players",
      item_class: "StackableCurrency",
      release_state: "released",
    },
    "Metadata/Items/Missing": {
      name: "Missing art",
      item_class: "Sword",
      release_state: "released",
      visual_identity: { dds_file: "Art/2DItems/DoesNotExist.dds" },
    },
  };
  const uniques = {
    "1": {
      id: "Astramentis",
      name: "Astramentis",
      item_class: "Amulet",
      visual_identity: { dds_file: "Art/2DItems/Amulets/Astramentis.dds" },
    },
    "2": {
      id: "Astramentis",
      name: "Astramentis",
      item_class: "Amulet",
      visual_identity: { dds_file: "Art/2DItems/Amulets/Astramentis.dds" },
    },
  };
  const files = [
    "data/Art/2DItems/Currency/CurrencyRerollRare.webp",
    "data/Art/2DItems/Amulets/Astramentis.png",
  ];
  const items = normalizeItemArtwork(bases, uniques, files, "a".repeat(40));
  expect(items).toHaveLength(4);
  expect(new Set(items.map((i) => i.id)).size).toBe(4);
  expect(items[0]).toMatchObject({
    id: "Metadata/Items/Currency/CurrencyRerollRare",
    name: "Chaos Orb",
  });
  expect(items[0].icon).toEndWith("CurrencyRerollRare.webp");
  expect(items.find((i) => i.name === "Astramentis")?.icon).toEndWith("Astramentis.png");
  expect(items.find((i) => i.name === "Missing art")?.icon).toBeUndefined();
});
test("rejects atlas paths that leave the asset directory", () => {
  expect(() =>
    createSpriteIndex(
      { ...atlas, meta: { ...atlas.meta, image: "../../secret.webp" } },
      "https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/commit/assets/",
    ),
  ).toThrow();
});
test("excludes legacy records using separate PoE2 base and unique name lists and fills missing static artwork", () => {
  const item = (name: string, kind: "base" | "unique" = "base") => ({
    id: name,
    name,
    kind,
    itemClass: "Currency",
    width: 1,
    height: 1,
  });
  const items = scopePoE2Artwork(
    [item("Chaos Orb"), item("Heist Prize"), item("Astramentis", "unique"), item("Astramentis")],
    {
      result: [
        {
          entries: [
            { type: "Chaos Orb" },
            { type: "Stellar Amulet", name: "Astramentis", flags: { unique: true } },
          ],
        },
      ],
    },
    { result: [{ entries: [{ text: "Chaos Orb", image: "/gen/image/chaos.png" }] }] },
  );
  expect(items.map((i) => i.id)).toEqual(["Chaos Orb", "Astramentis"]);
  expect(items[0].icon).toBe("https://www.pathofexile.com/gen/image/chaos.png");
});
test("uses official jewel frames for sockets with no exported skill icon", () => {
  const index = createSpriteIndex(
    {
      ...atlas,
      frames: { "frame:JewelFrameUnallocated": { frame: { x: 0, y: 0, w: 50, h: 50 } } },
    },
    "https://example.com/assets/",
  );
  expect(pickPassiveSprite(index, "", "jewel")?.w).toBe(50);
  expect(
    normalizeTree(
      { nodes: { "1": { id: "socket", x: 0, y: 0, isJewelSocket: true, icon: "" } } },
      index,
      index,
    ).nodes[0].image?.w,
  ).toBe(50);
});
test("maps GGG's inactive mastery effect prefix", () => {
  const index = createSpriteIndex(
    {
      ...atlas,
      frames: {
        "masteryEffectInactive:Art/mastery.png": { frame: { x: 0, y: 0, w: 244, h: 241 } },
      },
    },
    "https://example.com/assets/",
  );
  expect(pickPassiveSprite(index, "", "mastery", "Art/mastery.png")?.w).toBe(244);
});

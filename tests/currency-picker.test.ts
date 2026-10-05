import { expect, test } from "bun:test";
import {
  buildCurrencyPickerGroups,
  currencyPickerCategoryCounts,
  currencyPickerSection,
  type CurrencyPickerItem,
} from "../src/lib/currency-picker";

const items: CurrencyPickerItem[] = [
  { id: "Metadata/Items/Currency/CurrencyModValues", name: "Divine Orb" },
  { id: "Metadata/Items/Currency/CurrencyJewellerGreater", name: "Greater Jeweller's Orb" },
  { id: "Metadata/Items/Currency/CurrencyJeweller", name: "Lesser Jeweller's Orb" },
  { id: "Metadata/Items/Currency/CurrencyUpgradeToMagicShard", name: "Transmutation Shard" },
  { id: "Metadata/Items/Currency/CurrencyGemQuality", name: "Gemcutter's Prism" },
  { id: "Metadata/Items/Currency/CurrencyIdentification", name: "Scroll of Wisdom" },
  { id: "Metadata/Items/Currency/CurrencyEssenceAttack", name: "Essence of Battle" },
  { id: "Metadata/Items/SoulCores/RuneFire", name: "Desert Rune", itemClass: "SoulCore" },
  {
    id: "Metadata/Items/Gems/SkillGemEssenceDrain",
    name: "Essence Drain",
    itemClass: "Active Skill Gem",
  },
];

test("All groups currency subtypes before other item categories without losing items", () => {
  const groups = buildCurrencyPickerGroups(items, "All", "");
  expect(groups.map((group) => group.title)).toEqual([
    "Currency",
    "Jewellers' Currency",
    "Currency Shards",
    "Quality Currency",
    "Identification Currency",
    "Essences",
    "Runes",
    "Gems",
  ]);
  expect(groups.flatMap((group) => group.items.map((item) => item.id)).sort()).toEqual(
    items.map((item) => item.id).sort(),
  );
  expect(groups[1].items.map((item) => item.name)).toEqual([
    "Lesser Jeweller's Orb",
    "Greater Jeweller's Orb",
  ]);
});

test("selected categories constrain search instead of pulling matching items from elsewhere", () => {
  expect(buildCurrencyPickerGroups(items, "Essences", "essence")).toEqual([
    { title: "Essences", items: [items[6]] },
  ]);
  expect(buildCurrencyPickerGroups(items, "Currency", "  GEMCUTTER  ")).toEqual([
    { title: "Quality Currency", items: [items[4]] },
  ]);
  expect(buildCurrencyPickerGroups(items, "Currency", "essence")).toEqual([]);
  expect(buildCurrencyPickerGroups(items, "All", "essence").map((group) => group.title)).toEqual([
    "Essences",
    "Gems",
  ]);
});

test("category counts include unsearchable items and recognize metadata class precedence", () => {
  expect(currencyPickerCategoryCounts(items)).toMatchObject({
    All: 9,
    Currency: 6,
    Essences: 1,
    Runes: 1,
    "Soul Cores": 0,
    Gems: 1,
    Other: 0,
  });
  expect(currencyPickerCategoryCounts([]).All).toBe(0);
  expect(buildCurrencyPickerGroups([], "All", "")).toEqual([]);
});

test.each([
  ["Metadata/Items/Currency/CurrencyJeweller", "Jeweller", "Jewellers' Currency"],
  ["Metadata/Items/Currency/CurrencyUpgradeToRareShard", "Rare Shard", "Currency Shards"],
  ["Metadata/Items/Currency/CurrencyWeaponQuality", "Weapon Quality", "Quality Currency"],
  ["Metadata/Items/Currency/CurrencyCasterQuality", "Arcanist's Etcher", "Quality Currency"],
  ["Metadata/Items/Currency/CurrencyIdentification", "Identification", "Identification Currency"],
  ["Metadata/Items/Currency/Essence/EssenceGemQuality", "Essence of Excellence", "Essences"],
  ["Metadata/Items/Currency/CurrencyBreachShard", "Breach Splinter", "Breach"],
])("section of %s follows currency subtype after the main category", (id, name, section) => {
  expect(currencyPickerSection({ id, name })).toBe(section);
});

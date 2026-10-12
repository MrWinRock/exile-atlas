import type { RegexCategory } from "./regex-schema";

export const REGEX_SOURCE = {
  url: "https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/bb52d6b368307457eb9c54bb13f1829993d390b1/src/Data/TradeSiteStats.lua",
  revision: "bb52d6b368307457eb9c54bb13f1829993d390b1",
  verified: "2026-10-12",
};
const propertySource = { ...REGEX_SOURCE, url: "https://poe2.re/waystone" };
export const REGEX_CATEGORIES: { id: RegexCategory; label: string; description: string }[] = [
  { id: "waystone", label: "Waystones", description: "Choose the maps your build can handle." },
  { id: "tablet", label: "Tablets", description: "Find the area effects worth keeping." },
  { id: "relic", label: "Relics", description: "Prepare your next Trial of the Sekhemas." },
  { id: "vendor", label: "Vendor", description: "Spot useful rolls while checking a vendor." },
  {
    id: "equipment",
    label: "Equipment",
    description: "Search for the rolls your next upgrade needs.",
  },
];
export type RegexModifier = {
  id: string;
  categories: RegexCategory[];
  label: string;
  template: string;
  /** Compact in-game presence token, when verified for this item category. */
  presencePattern?: string;
  numericDomain?: [number, number];
  numericSlot?: number;
  tradeStatId?: string;
  source: typeof REGEX_SOURCE;
};
const equipment: RegexCategory[] = ["vendor", "equipment"];
function mod(
  id: string,
  categories: RegexCategory[],
  template: string,
  tradeStatId: string,
  domain: [number, number] = [0, 99999],
): RegexModifier {
  return {
    id,
    categories,
    label: template,
    template,
    tradeStatId,
    source: REGEX_SOURCE,
    ...(template.includes("#") ? { numericDomain: domain, numericSlot: 0 } : {}),
  };
}
export const REGEX_MODIFIERS: RegexModifier[] = [
  mod("life", equipment, "# to maximum Life", "explicit.stat_3299347043"),
  mod("mana", equipment, "# to maximum Mana", "explicit.stat_1050105434"),
  mod(
    "movement-speed",
    equipment,
    "#% increased Movement Speed",
    "explicit.stat_2250533757",
    [0, 1000],
  ),
  mod("fire-resistance", equipment, "#% to Fire Resistance", "explicit.stat_3372524247", [0, 1000]),
  mod("cold-resistance", equipment, "#% to Cold Resistance", "explicit.stat_4220027924", [0, 1000]),
  mod(
    "lightning-resistance",
    equipment,
    "#% to Lightning Resistance",
    "explicit.stat_1671376347",
    [0, 1000],
  ),
  mod(
    "chaos-resistance",
    equipment,
    "#% to Chaos Resistance",
    "explicit.stat_2923486259",
    [0, 1000],
  ),
  mod(
    "monster-damage",
    ["waystone"],
    "#% increased Monster Damage",
    "explicit.stat_1890519597",
    [0, 1000],
  ),
  mod("monster-life", ["waystone"], "#% more Monster Life", "explicit.stat_95249895", [0, 1000]),
  mod(
    "maximum-resistances",
    ["waystone"],
    "#% maximum Player Resistances",
    "explicit.stat_3376488707",
    [-100, 0],
  ),
  mod(
    "extra-fire",
    ["waystone"],
    "Monsters deal #% of Damage as Extra Fire",
    "explicit.stat_92381065",
    [0, 1000],
  ),
  {
    ...mod(
      "chilled-ground",
      ["waystone"],
      "Area has patches of Chilled Ground",
      "explicit.stat_349586058",
    ),
    presencePattern: "chi",
  },
  mod(
    "monster-speed",
    ["waystone"],
    "Monsters have #% increased Attack, Cast and Movement Speed",
    "explicit.stat_3909654181",
    [0, 1000],
  ),
  mod(
    "tablet-pack-size",
    ["tablet"],
    "#% increased Pack Size in Map",
    "explicit.stat_2017682521",
    [0, 1000],
  ),
  mod(
    "tablet-waystones",
    ["tablet"],
    "#% increased Quantity of Waystones found in Map",
    "explicit.stat_2777224821",
    [0, 1000],
  ),
  mod(
    "tablet-rarity",
    ["tablet"],
    "#% increased Rarity of Items found in Map",
    "explicit.stat_2306002879",
    [0, 1000],
  ),
  mod(
    "tablet-experience",
    ["tablet"],
    "#% increased Experience gain in Map",
    "explicit.stat_57434274",
    [0, 1000],
  ),
  mod(
    "honour-resistance",
    ["relic"],
    "#% to Honour Resistance",
    "sanctum.stat_2287831219",
    [0, 1000],
  ),
  mod(
    "maximum-honour-resistance",
    ["relic"],
    "#% to Maximum Honour Resistance",
    "sanctum.stat_3096543632",
    [0, 1000],
  ),
  mod(
    "maximum-honour",
    ["relic"],
    "#% increased maximum Honour",
    "sanctum.stat_3970123360",
    [0, 1000],
  ),
  mod("relic-life", ["relic"], "#% increased maximum Life", "sanctum.stat_1200789871", [0, 1000]),
];
export type RegexProperty = {
  id: string;
  label: string;
  categories: RegexCategory[];
  kind: "range" | "text" | "select";
  templates?: string[];
  searchTemplates?: string[];
  numericDomain?: [number, number];
  tradeField?: string;
  options?: { value: string; label: string }[];
  source: typeof REGEX_SOURCE;
};
const all = REGEX_CATEGORIES.map((c) => c.id);
const range = (
  id: string,
  label: string,
  categories: RegexCategory[],
  templates: string[],
  domain: [number, number],
  tradeField?: string,
): RegexProperty => ({
  id,
  label,
  categories,
  kind: "range",
  templates,
  // Keep the number delimiter literal: .* could accept a suffix of an out-of-range roll.
  searchTemplates: templates.map((t) =>
    t
      .replace("Item Rarity:", "m Rarity:")
      .replace("Pack Size:", "k Size:")
      .replace("Monster Effectiveness:", "r Effectiveness:")
      .replace("Monster Rarity:", "r Rarity:")
      .replace("Waystone Drop Chance:", "e Drop Chance:")
      .replace("Revives Available:", "s Available:"),
  ),
  numericDomain: domain,
  tradeField,
  source: propertySource,
});
export const REGEX_PROPERTIES: RegexProperty[] = [
  { id: "base", label: "Item / base text", categories: all, kind: "text", source: REGEX_SOURCE },
  {
    id: "rarity",
    label: "Rarity",
    categories: all,
    kind: "select",
    options: [
      { value: "normal", label: "Normal" },
      { value: "magic", label: "Magic" },
      { value: "rare", label: "Rare" },
      { value: "unique", label: "Unique" },
    ],
    tradeField: "type_filters.rarity",
    source: REGEX_SOURCE,
  },
  {
    id: "corrupted",
    label: "Corruption",
    categories: all,
    kind: "select",
    options: [
      { value: "true", label: "Corrupted" },
      { value: "false", label: "Uncorrupted" },
    ],
    tradeField: "misc_filters.corrupted",
    source: REGEX_SOURCE,
  },
  range(
    "tier",
    "Waystone tier",
    ["waystone"],
    ["Tier #)", "Waystone Tier: #"],
    [1, 16],
    "map_filters.map_tier",
  ),
  range(
    "revives",
    "Revives",
    ["waystone"],
    ["Revives Available: #"],
    [0, 6],
    "map_filters.map_revives",
  ),
  range(
    "iir",
    "Item rarity yield",
    ["waystone"],
    ["Item Rarity: #%"],
    [0, 99999],
    "map_filters.map_iir",
  ),
  range(
    "pack-size",
    "Pack size",
    ["waystone"],
    ["Pack Size: #%"],
    [0, 99999],
    "map_filters.map_packsize",
  ),
  range(
    "effectiveness",
    "Monster effectiveness",
    ["waystone"],
    ["Monster Effectiveness: #%"],
    [0, 99999],
    "map_filters.map_magic_monsters",
  ),
  range(
    "monster-rarity",
    "Monster rarity",
    ["waystone"],
    ["Monster Rarity: #%"],
    [0, 99999],
    "map_filters.map_rare_monsters",
  ),
  range(
    "drop-chance",
    "Waystone drop chance",
    ["waystone"],
    ["Waystone Drop Chance: #%"],
    [0, 99999],
    "map_filters.map_bonus",
  ),
];

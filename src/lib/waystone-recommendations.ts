import type { RegexDraft } from "./regex-schema";

export const WAYSTONE_BONUS_LABELS = {
  iir: "Item Rarity",
  "monster-rarity": "Monster Rarity",
  "pack-size": "Pack Size",
  effectiveness: "Monster Effectiveness",
  "drop-chance": "Waystone Drop Chance",
} as const;

type WaystoneBonus = keyof typeof WAYSTONE_BONUS_LABELS;
export type WaystoneRecommendation = {
  id: string;
  label: string;
  minimums: readonly (readonly [WaystoneBonus, number])[];
  description: string;
};

export const WAYSTONE_RECOMMENDATIONS: readonly WaystoneRecommendation[] = [
  {
    id: "mapping",
    label: "Normal mapping — balanced",
    minimums: [
      ["iir", 30],
      ["monster-rarity", 40],
    ],
    description: "A starting point for everyday clearing, currency drops, and rare-monster loot.",
  },
  {
    id: "loot",
    label: "High-value loot mapping",
    minimums: [
      ["iir", 40],
      ["monster-rarity", 50],
    ],
    description: "Higher rarity targets for maps focused on general loot and rare monsters.",
  },
  {
    id: "breach",
    label: "Breach farming",
    minimums: [
      ["pack-size", 20],
      ["monster-rarity", 40],
    ],
    description:
      "Prioritize pack density, then look for Monster Rarity to support rare-monster loot.",
  },
  {
    id: "ritual",
    label: "Ritual / Omen farming",
    minimums: [
      ["pack-size", 20],
      ["monster-rarity", 40],
    ],
    description: "Look for denser packs and more rare monsters when farming Tribute.",
  },
  {
    id: "abyss",
    label: "Abyss farming",
    minimums: [
      ["monster-rarity", 50],
      ["pack-size", 15],
    ],
    description:
      "Prioritize rare monsters for Abyss clears. Consider Item Rarity when targeting chest loot.",
  },
  {
    id: "delirium",
    label: "Delirium farming",
    minimums: [
      ["pack-size", 20],
      ["iir", 20],
    ],
    description: "Favor dense packs and item drops while clearing through the fog.",
  },
  {
    id: "expedition",
    label: "Expedition — rare-loot farming",
    minimums: [
      ["monster-rarity", 40],
      ["iir", 30],
    ],
    description: "Focus on rare monsters and the items they drop during Expedition clears.",
  },
  {
    id: "grand-expedition",
    label: "Grand Expedition — effectiveness",
    minimums: [
      ["effectiveness", 40],
      ["monster-rarity", 40],
    ],
    description:
      "Use this for Grand Expedition setups built to handle higher Monster Effectiveness.",
  },
  {
    id: "strongbox-essence",
    label: "Strongbox / Essence / loot",
    minimums: [["iir", 50]],
    description: "Favor Item Rarity for general map loot alongside Strongboxes or Essences.",
  },
  {
    id: "map-boss",
    label: "Map boss / Citadel farming",
    minimums: [
      ["drop-chance", 100],
      ["iir", 20],
    ],
    description:
      "Prioritize Waystone drops for bosses inside Atlas maps and Citadels. Separate pinnacle arenas follow their own rules.",
  },
  {
    id: "sustain",
    label: "Waystone sustain / tablet farming",
    minimums: [["drop-chance", 120]],
    description: "Look for high Waystone Drop Chance when replenishing your map pool.",
  },
];

export function waystoneRecommendationProperties(
  recommendation: WaystoneRecommendation,
  current: RegexDraft["properties"] = {},
): RegexDraft["properties"] {
  const properties = { ...current };
  for (const id of Object.keys(WAYSTONE_BONUS_LABELS)) delete properties[id];
  properties.tier = { min: "15", max: "15" };
  for (const [id, minimum] of recommendation.minimums) {
    properties[id] = { min: String(minimum), max: "" };
  }
  return properties;
}

import type { RegexCatalogue } from "./regex-catalogue-builder";
import type { RegexDraft } from "./regex-schema";
import { compileRegexSearch } from "./regex-search";

type RecommendationCategory = "tablet" | "relic";
type RegexRecommendation = {
  category: RecommendationCategory;
  modifierId: string;
  label: string;
  description: string;
};

export const REGEX_RECOMMENDATIONS = {
  tablet: [
    {
      category: "tablet",
      modifierId: "tablet-pack-size",
      label: "Pack density",
      description: "Look for increased pack size in your maps.",
    },
    {
      category: "tablet",
      modifierId: "tablet-waystones",
      label: "Waystone sustain",
      description: "Look for more Waystone drops in your maps.",
    },
    {
      category: "tablet",
      modifierId: "tablet-rarity",
      label: "Item rarity",
      description: "Look for increased item rarity in your maps.",
    },
  ],
  relic: [
    {
      category: "relic",
      modifierId: "honour-resistance",
      label: "Honour protection",
      description: "Look for Honour Resistance for your next trial.",
    },
    {
      category: "relic",
      modifierId: "maximum-honour",
      label: "Honour pool",
      description: "Look for increased maximum Honour.",
    },
    {
      category: "relic",
      modifierId: "relic-life",
      label: "Life pool",
      description: "Look for increased maximum Life during the trial.",
    },
  ],
} as const satisfies Record<RecommendationCategory, readonly RegexRecommendation[]>;

export function applyRegexRecommendation(
  draft: RegexDraft,
  recommendation: RegexRecommendation,
  catalogue: RegexCatalogue,
): RegexDraft | null {
  if (draft.category !== recommendation.category) return null;

  const id = recommendation.modifierId;
  const next = {
    ...draft,
    wanted: draft.wanted.some((modifier) => modifier.id === id)
      ? draft.wanted
      : [...draft.wanted, { id, min: "", max: "" }],
    unwanted: draft.unwanted.filter((modifier) => modifier.id !== id),
  };
  return compileRegexSearch(next, catalogue).copyable ? next : null;
}

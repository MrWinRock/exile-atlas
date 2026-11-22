import { expect, test } from "bun:test";
import { defaultRegexCatalogue } from "../src/lib/regex-catalogue-builder";
import { REGEX_RECOMMENDATIONS, applyRegexRecommendation } from "../src/lib/regex-recommendations";
import { createRegexDraft } from "../src/lib/regex-schema";
import { compileRegexSearch } from "../src/lib/regex-search";

test.each(["tablet", "relic"] as const)(
  "%s recommendations offer distinct copyable goals",
  (category) => {
    const drafts = REGEX_RECOMMENDATIONS[category].map((recommendation) => {
      const draft = applyRegexRecommendation(
        createRegexDraft(category),
        recommendation,
        defaultRegexCatalogue,
      );
      expect(draft).not.toBeNull();
      const search = compileRegexSearch(draft!, defaultRegexCatalogue);
      expect(search.copyable).toBe(true);
      return search.text;
    });

    expect(drafts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(drafts).size).toBe(drafts.length);
  },
);

test("presets enforce catalogue availability and category", () => {
  const recommendation = REGEX_RECOMMENDATIONS.tablet[0];
  const catalogue = {
    ...defaultRegexCatalogue,
    modifiers: defaultRegexCatalogue.modifiers.filter(({ id }) => id !== recommendation.modifierId),
  };

  expect(
    applyRegexRecommendation(createRegexDraft("tablet"), recommendation, catalogue),
  ).toBeNull();
  expect(
    applyRegexRecommendation(createRegexDraft("relic"), recommendation, defaultRegexCatalogue),
  ).toBeNull();
});

test("applying a preset removes a contrary exclusion and preserves unrelated edits", () => {
  const recommendation = REGEX_RECOMMENDATIONS.relic[0];
  const original = {
    ...createRegexDraft("relic"),
    properties: { corrupted: "false" },
    unwanted: [{ id: recommendation.modifierId, min: "", max: "" }],
  };
  const next = applyRegexRecommendation(original, recommendation, defaultRegexCatalogue);

  expect(next?.wanted).toEqual([{ id: recommendation.modifierId, min: "", max: "" }]);
  expect(next?.unwanted).toEqual([]);
  expect(next?.properties).toEqual(original.properties);
  expect(original.unwanted).toHaveLength(1);
});

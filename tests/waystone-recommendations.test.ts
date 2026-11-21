import { expect, test } from "bun:test";
import { REGEX_PROPERTIES } from "../src/lib/regex-catalogue";
import { createRegexDraft } from "../src/lib/regex-schema";
import { compileRegexSearch } from "../src/lib/regex-search";
import {
  WAYSTONE_RECOMMENDATIONS,
  waystoneRecommendationProperties,
} from "../src/lib/waystone-recommendations";

test("all T15 farming recommendations compile and match at their exact minimum rolls", () => {
  expect(WAYSTONE_RECOMMENDATIONS).toHaveLength(11);
  for (const recommendation of WAYSTONE_RECOMMENDATIONS) {
    const properties = waystoneRecommendationProperties(recommendation);
    const search = compileRegexSearch({ ...createRegexDraft("waystone"), properties });
    const conditions = search.groups.flatMap((group) => group.conditions);
    expect(search.copyable).toBe(true);
    expect(conditions).toHaveLength(recommendation.minimums.length + 1);
    expect(search.text).toContain('"er 15\\)"');

    for (const [id, minimum] of recommendation.minimums) {
      const { template, pattern } = {
        template: REGEX_PROPERTIES.find((property) => property.id === id)?.templates?.[0],
        pattern: conditions.find((condition) => condition.propertyId === id)?.copyPattern,
      };
      expect(template).toBeDefined();
      expect(pattern).toBeDefined();
      const regex = new RegExp(pattern!, "i");
      expect(regex.test(template!.replace("#", `+${minimum - 1}`))).toBe(false);
      expect(regex.test(template!.replace("#", `+${minimum}`))).toBe(true);
    }
  }
});

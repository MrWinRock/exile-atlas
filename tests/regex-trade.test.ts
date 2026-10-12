import { expect, test } from "bun:test";
import { createRegexDraft } from "../src/lib/regex-schema";
import { prepareRegexTrade } from "../src/lib/regex-trade";
import { validateTradeDraft } from "../src/lib/trade-search";
test("trade mapping preserves complete category, range and stat logic", () => {
  const d = createRegexDraft("waystone");
  d.properties = { tier: { min: "15", max: "16" }, corrupted: "false" };
  d.wanted = [
    { id: "monster-damage", min: "0", max: "20" },
    { id: "monster-life", min: "", max: "" },
  ];
  d.unwanted = [{ id: "extra-fire", min: "20", max: "" }];
  const r = prepareRegexTrade(d, "Test League");
  expect(r.ready).toBe(true);
  expect(validateTradeDraft(r.draft)).toEqual([]);
  expect(r.draft.fields["type_filters.category"]).toBe("map.waystone");
  expect(r.draft.fields["misc_filters.corrupted"]).toBe("false");
  expect(r.draft.statGroups.map((g) => g.type)).toEqual(["or", "not"]);
  expect(r.draft.statGroups[0].filters[0].min).toBe("0");
  expect(r.draft.statGroups[1].filters[0].min).toBe("20");
  expect(d.properties.tier).toEqual({ min: "15", max: "16" });
});
test("missing mappings and league block handoff rather than weakening search", () => {
  const d = createRegexDraft("vendor");
  d.text = "boots";
  expect(prepareRegexTrade(d, "League").ready).toBe(false);
  expect(prepareRegexTrade(d, "").errors.length).toBeGreaterThan(0);
  d.text = "";
  d.properties = { base: "boots" };
  expect(prepareRegexTrade(d, "League").unsupported).toContain("Item / base text");
  d.properties = {};
  d.wanted = [{ id: "unknown", min: "", max: "" }];
  expect(prepareRegexTrade(d, "League").ready).toBe(false);
});

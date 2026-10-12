import { expect, test } from "bun:test";
import { REGEX_MODIFIERS, REGEX_PROPERTIES } from "../src/lib/regex-catalogue";
import { createRegexDraft } from "../src/lib/regex-schema";
import { compileRegexSearch } from "../src/lib/regex-search";
import { testRegexItem } from "../src/lib/regex-item-test";
import { prepareRegexTrade } from "../src/lib/regex-trade";

export function referenceWaystoneDraft() {
  const d = createRegexDraft("waystone");
  d.wanted = [
    { id: "ignited-ground", min: "", max: "" },
    { id: "shocked-ground", min: "", max: "" },
    { id: "monster-life", min: "20", max: "30" },
    { id: "monster-elemental-resistances", min: "20", max: "40" },
  ];
  d.unwanted = ["chilled-ground", "monster-evasion", "monster-armour"].map((id) => ({
    id,
    min: "",
    max: "",
  }));
  d.properties = Object.fromEntries(
    ["iir", "drop-chance", "effectiveness", "monster-rarity", "pack-size"].map((id) => [
      id,
      { min: "40", max: "" },
    ]),
  );
  return d;
}

test("the user's complete poe2.re Waystone example is configurable and fits the game limit", () => {
  const c = compileRegexSearch(referenceWaystoneDraft());
  expect(c.errors).toEqual([]);
  expect(c.copyable).toBe(true);
  expect(c.text).toBe(
    '"gn|cke|(2\\d|30)\\(.*fe$|([23]\\d|40)\\(.*r el" "!chi|siv|oure" "m rar.*([4-9].|\\d..)%" "p c.*([4-9].|\\d..)%" "r ef.*([4-9].|\\d..)%" "r rar.*([4-9].|\\d..)%" "k s.*([4-9].|\\d..)%"',
  );
  expect(
    REGEX_MODIFIERS.filter((m) => m.categories.includes("waystone")).length,
  ).toBeGreaterThanOrEqual(32);
});

test("compact header filters omit unrestricted ranges and retain bounded limits", () => {
  const d = createRegexDraft("waystone");
  d.properties = {
    rarity: "rare",
    corrupted: "true",
    tier: { min: "15", max: "16" },
    revives: { min: "0", max: "6" },
  };
  expect(compileRegexSearch(d).text).toBe('"y: r" "corr" "er 1[56]\\)"');
  d.properties.revives = { min: "0", max: "0" };
  expect(compileRegexSearch(d).text).toContain('"le: 0"');
  d.properties.iir = { min: "40", max: "99" };
  const condition = compileRegexSearch(d)
    .groups.flatMap((g) => g.conditions)
    .find((c) => c.propertyId === "iir")!;
  expect(new RegExp(condition.pattern, "i").test("Item Rarity: +140%")).toBe(false);
});

test("basic and advanced pasted items test actual rolls, never the annotated roll limits", () => {
  const d = referenceWaystoneDraft();
  const headers =
    "Item Rarity: +40%\nWaystone Drop Chance: +40%\nMonster Effectiveness: +40%\nMonster Rarity: +40%\nPack Size: +40%\n";
  for (const roll of [19, 20, 30, 31]) {
    for (const annotation of ["", "(10-30)"])
      expect(testRegexItem(d, headers + `${roll}${annotation}% more Monster Life`).status).toBe(
        roll >= 20 && roll <= 30 ? "match" : "no-match",
      );
  }
  expect(
    testRegexItem(d, headers + "Area has patches of Ignited Ground\nMonsters are Evasive").status,
  ).toBe("no-match");
});

test("all numeric Waystone tokens preserve bounded rolls across digit lengths", () => {
  for (const m of REGEX_MODIFIERS.filter((m) => m.rollRange)) {
    const d = createRegexDraft("waystone");
    const [lo, hi] = m.rollRange!;
    const min = lo < 0 ? lo : Math.max(0, Math.min(20, hi)),
      max = lo < 0 ? -4 : Math.min(25, hi);
    d.wanted = [{ id: m.id, min: String(min), max: String(max) }];
    const c = compileRegexSearch(d);
    const token = c.text.slice(1, -1),
      re = new RegExp(token, "im");
    for (let n = lo; n <= hi; n++) {
      const line = m.template.replace("#", `${n}(${Math.abs(lo)}-${Math.abs(hi)})`);
      expect(re.test(line)).toBe(n >= min && n <= max);
    }
  }
});

test("rarity combinations, delirium and optional rounding persist complete trade intent", () => {
  const d = createRegexDraft("waystone");
  d.properties = { rarity: "magic,rare", delirious: "true", iir: { min: "47", max: "99" } };
  d.roundNumbers = true;
  const c = compileRegexSearch(d);
  expect(c.text).toContain('"y: (m|r)"');
  expect(c.text).toContain('"delir"');
  expect(
    testRegexItem(d, "Rarity: Magic\nPlayers in area are 20% Delirious\nItem Rarity: +40%").status,
  ).toBe("match");
  expect(prepareRegexTrade(d, "League").ready).toBe(false);
  d.properties = { iir: { min: "47", max: "99" } };
  const trade = prepareRegexTrade(d, "League");
  expect(trade.ready).toBe(true);
  expect(trade.draft.fields["map_filters.map_iir"]).toEqual({ min: "40", max: "99" });
});

test("minimum-only yield tokens retain thresholds at all supported digit lengths", () => {
  for (const min of [1, 9, 10, 40, 47, 99, 100, 101, 345, 999, 1000, 99999]) {
    const d = createRegexDraft("waystone");
    d.properties.iir = { min: String(min), max: "" };
    const re = new RegExp(compileRegexSearch(d).text.slice(1, -1), "i");
    for (const n of [0, min - 1, min, min + 1, 999, 1000, 99999, 100000])
      expect(re.test(`Item Rarity: +${n}%`)).toBe(n >= min);
  }
});

test("compact modifier fragments cannot match Waystone yield or state headers", () => {
  const headers = [
    ...REGEX_PROPERTIES.flatMap((p) => p.templates ?? []),
    "Item Class: Waystones",
    "Rarity: Rare",
    "Rarity: Normal",
    "Rarity: Magic",
    "Corrupted",
    "Players in area are 20% Delirious",
  ].map((t) => t.replaceAll("#", "40"));
  for (const m of REGEX_MODIFIERS.filter((m) => m.presencePattern)) {
    const re = new RegExp(m.presencePattern!, "i");
    for (const header of headers) expect(re.test(header)).toBe(false);
  }
});

test("single-digit and mixed-digit bounds cannot match suffixes of larger rolls", () => {
  for (const m of REGEX_MODIFIERS.filter((m) => m.rollRange)) {
    const [lo, hi] = m.rollRange!;
    const mid = Math.floor((lo + hi) / 2);
    const intervals = [
      [lo, hi],
      [lo, lo],
      [lo + 1, lo + 1],
      [lo + 1, hi - 1],
      [mid, mid],
      [hi, hi],
      ...(lo >= 0 ? [[0, 0]] : []),
    ];
    for (const [min, max] of intervals) {
      const d = createRegexDraft("waystone");
      d.wanted = [{ id: m.id, min: String(min), max: String(max) }];
      const re = new RegExp(compileRegexSearch(d).text.slice(1, -1), "im");
      for (let n = lo; n <= hi; n++)
        expect(re.test(m.template.replace("#", `${n}(${Math.abs(lo)}-${Math.abs(hi)})`))).toBe(
          n >= min && n <= max,
        );
    }
  }
});

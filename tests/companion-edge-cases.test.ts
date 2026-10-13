import { expect, test } from "bun:test";
import { normalizePobBundle } from "../src/server/game-data/pob-adapter";
import { extractDbDefinitions } from "../src/server/game-data/db-adapter";
import { matchItemModifiers, modifierEligibility } from "../src/lib/game-data";
import { parseItemText } from "../src/lib/item-text";
import { numericSlotsPattern } from "../src/lib/regex-numeric-slots";
import { createCraftRecipe } from "../src/lib/crafting";
import { summarizeCraftBudget } from "../src/lib/crafting-budget";
import { checkCraftStep } from "../src/lib/crafting";
import { CORE_CRAFT_OPERATIONS } from "../src/lib/crafting-operations";
import { validateGameSnapshot } from "../src/lib/game-data";
import { evaluateMapSafety } from "../src/lib/map-safety";
import type { SafetyProfile } from "../src/lib/map-safety";
const refs = [
  {
    source: "fixture",
    revision: "b".repeat(40),
    url: "https://example.test",
    checksum: "a".repeat(64),
  },
];
const bundled = validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
test("flask and jewel source pools cannot become ring affixes", () => {
  const ring = bundled.bases.find((b) => b.name === "Gold Ring")!;
  for (const category of ["Flask", "Jewel", "Charm"]) {
    const mod = bundled.modifiers.find((m) => m.category === category)!;
    expect(modifierEligibility(mod, ring, 82)).toBe("ineligible");
  }
});
test("special item capacities remain unknown instead of assuming six affixes", () => {
  const s = structuredClone(bundled);
  s.bases = [{ id: "j", name: "Ruby", itemClass: "Jewel", tags: ["jewel"] }];
  const item = parseItemText(
    'Rarity: Rare\nA\nRuby\n--------\n{ Prefix Modifier "A" (Tier: 1) }\n+5 to Strength',
  );
  expect(
    checkCraftStep(
      item,
      CORE_CRAFT_OPERATIONS.find((o) => o.name === "Exalted Orb")!,
      s,
    ).status,
  ).toBe("unknown");
});
test("non-finite safety thresholds require review", () => {
  const p: SafetyProfile = { id: "p", name: "P", traits: {}, rules: [] };
  p.rules = [
    {
      id: "r",
      label: "Pack",
      severity: "avoid",
      operator: "any",
      reason: "risk",
      conditions: [{ kind: "modifier", id: "extra-fire", min: "Infinity", max: "" }],
    },
  ];
  const result = evaluateMapSafety(
    parseItemText(
      "Item Class: Waystones\nRarity: Rare\nA\nWaystone (Tier 15)\n--------\nMonsters deal 40% of Damage as Extra Fire",
    ),
    p,
    bundled,
  );
  expect(result.unknown).toContain("Invalid threshold: Pack");
});
test("external minus signs belong to actual numeric domains", () => {
  const s = normalizePobBundle(
    {
      "ModItem.lua":
        'return {Negative={"-(2-5)% to Resistance",weightKey={"default"},weightVal={1}}}',
    },
    refs,
  );
  expect(s.modifiers[0].templates[0]).toBe("#% to Resistance");
  expect(s.modifiers[0].numericSlots[0].domain).toEqual([-5, -2]);
  const d = extractDbDefinitions(
    "<tr><td>1</td><td>Suffix</td><td>-(2-5)% to Resistance</td></tr>",
    "tablet",
    "https://example.test",
  );
  expect(d[0].numericSlots?.[0].domain).toEqual([-5, -2]);
});
test("a single compound stat line cannot identify a complete affix", () => {
  const s = normalizePobBundle(
    {
      "ModItem.lua":
        'return {Compound={"+(5-8) to Strength","+(10-12) to Dexterity",weightKey={"ring","default"},weightVal={1,0}}}',
    },
    refs,
  );
  s.bases = [{ id: "ring", name: "Gold Ring", itemClass: "Ring", tags: ["ring"] }];
  const item = parseItemText(
    "Rarity: Rare\nA\nGold Ring\n--------\nItem Level: 80\n--------\n+6 to Strength",
  );
  expect(matchItemModifiers(item, s)[0].status).toBe("ambiguous");
});
test("unknown selected numeric slots are rejected", () => {
  expect(() =>
    numericSlotsPattern(
      "Adds # Damage",
      [{ index: 0, scale: 1, domain: [0, 20], unit: "value", sign: "positive" }],
      { "2": { min: "5", max: "" } },
    ),
  ).toThrow("Unknown numeric slot");
});
test("custom currency names cannot collide with object prototypes", () => {
  const recipe = createCraftRecipe();
  recipe.steps = [
    {
      id: "s",
      currency: "__proto__",
      quantity: "2",
      notes: "",
      quoteCurrency: "Divine Orb",
      costSource: "unpriced",
    },
  ];
  expect(summarizeCraftBudget(recipe, []).rawTotals["__proto__"]).toBe("2");
});

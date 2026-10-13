import { expect, test } from "bun:test";
import { validateGameSnapshot } from "../src/lib/game-data";
import { buildRegexCatalogue } from "../src/lib/regex-catalogue-builder";
import { createRegexDraft } from "../src/lib/regex-schema";
import { prepareRegexTrade } from "../src/lib/regex-trade";
import { prepareItemTransfer } from "../src/lib/item-transfer";
const snapshot = validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
const catalogue = buildRegexCatalogue(snapshot);
test("legacy modifiers cannot silently accept unsupported numeric slots", () => {
  const draft = createRegexDraft("waystone");
  draft.properties.rarity = "rare";
  draft.unwanted = [
    { id: "chilled-ground", min: "", max: "", slots: { "1": { min: "20", max: "" } } },
  ];
  expect(prepareRegexTrade(draft, "Standard", catalogue).ready).toBe(false);
});
test("decimal and aggregated tier bounds survive complete trade handoff", () => {
  for (const [id, bound] of [
    ["pob:LifeFlaskChargeGeneration:5be1eda1", "0.2"],
    ["pob:LifeLeechPermyriad:764f8123", "6"],
  ]) {
    const draft = createRegexDraft("equipment");
    draft.properties.rarity = "rare";
    draft.wanted = [{ id, min: bound, max: bound }];
    const trade = prepareRegexTrade(draft, "Standard", catalogue);
    expect(trade.ready).toBe(true);
    expect(trade.draft.statGroups[0]?.filters[0]?.min).toBe(bound);
    expect(trade.draft.statGroups[0]?.filters[0]?.max).toBe(bound);
  }
});
test("conversion failure never advertises an omitted criterion as supported", () => {
  const draft = createRegexDraft("equipment");
  draft.properties.rarity = "rare";
  draft.wanted = [{ id: "pob:LifeFlaskChargeGeneration:5be1eda1", min: "999", max: "" }];
  const trade = prepareRegexTrade(draft, "Standard", catalogue);
  expect(trade.ready).toBe(false);
  expect(trade.supported).not.toContain(
    catalogue.modifiers.find((m) => m.id === draft.wanted[0].id)!.label,
  );
});
test("inspector complete transfers retain supported copied item properties", () => {
  const text =
    "Item Class: Bows\nRarity: Rare\nA\nCrude Bow\n--------\nAttacks per Second: 1.25\nSockets: 2\n--------\nRequirements:\nLevel: 50\n--------\nItem Level: 80\n--------\n+6 to Strength";
  const t = prepareItemTransfer(text, snapshot);
  expect(t.complete).toBe(true);
  expect(t.draft.properties["attack-rate"]).toEqual({ min: "1.25", max: "1.25" });
  expect(t.draft.properties.sockets).toEqual({ min: "2", max: "2" });
  expect(t.draft.properties["required-level"]).toEqual({ min: "50", max: "50" });
});
test("unsupported copied item properties block a complete inspector transfer", () => {
  const t = prepareItemTransfer(
    "Rarity: Rare\nA\nCrude Bow\n--------\nArmour: 100\n--------\n+6 to Strength",
    snapshot,
  );
  expect(t.complete).toBe(false);
  expect(t.unresolved.some((s) => s.includes("armour"))).toBe(true);
});

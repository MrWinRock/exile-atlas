import { expect, test } from "bun:test";
import { buildRegexCatalogue } from "../src/lib/regex-catalogue-builder";
import { validateGameSnapshot } from "../src/lib/game-data";
import { createRegexDraft } from "../src/lib/regex-schema";
import { testRegexItem } from "../src/lib/regex-item-test";
const catalogue = buildRegexCatalogue(
  validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json()),
);
test("required level does not accidentally match item level", () => {
  const d = createRegexDraft("equipment");
  d.properties["required-level"] = { min: "50", max: "" };
  expect(
    testRegexItem(
      d,
      "Rarity: Rare\nA\nB\n--------\nRequirements:\nLevel: 10\n--------\nItem Level: 82",
      catalogue,
    ).status,
  ).toBe("no-match");
});
test("class controls match the copied plural class and unknown-precision stats match presence only", () => {
  const d = createRegexDraft("equipment");
  d.properties["item-class"] = "Ring";
  expect(testRegexItem(d, "Item Class: Rings\nRarity: Rare\nA\nGold Ring", catalogue).status).toBe(
    "match",
  );
  const unknown = catalogue.modifiers.find(
    (m) =>
      m.template.includes("#") &&
      m.numericSlots?.length === 0 &&
      m.categories.includes("equipment"),
  )!;
  const p = createRegexDraft("equipment");
  p.wanted = [{ id: unknown.id, min: "", max: "" }];
  expect(
    testRegexItem(
      p,
      "Rarity: Rare\nA\nB\n--------\n" + unknown.template.replaceAll("#", "1.25"),
      catalogue,
    ).status,
  ).toBe("match");
});

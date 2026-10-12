import { expect, test } from "bun:test";
import { createRegexDraft } from "../src/lib/regex-schema";
import { testRegexItem } from "../src/lib/regex-item-test";

// Synthetic item fixtures using exact labels in the pinned trade catalogue.
const item =
  "Item Class: Boots\nRarity: Rare\nUseful Boots\nIron Greaves\n--------\n+50 to maximum Life\n+20% to Fire Resistance\n";
test("item testing shares inclusive ranges, Any/All and exclusion semantics", () => {
  const d = createRegexDraft("equipment");
  d.wanted = [
    { id: "life", min: "50", max: "60" },
    { id: "mana", min: "1", max: "" },
  ];
  expect(testRegexItem(d, item).status).toBe("match");
  expect(testRegexItem(d, item.toUpperCase().replaceAll("\n", "\r\n")).status).toBe("match");
  d.match = "all";
  expect(testRegexItem(d, item).status).toBe("no-match");
  d.match = "any";
  d.unwanted = [{ id: "fire-resistance", min: "21", max: "" }];
  expect(testRegexItem(d, item).status).toBe("match");
  d.unwanted[0].min = "20";
  expect(testRegexItem(d, item).status).toBe("no-match");
});
test("missing headers are unknown while a definite failure wins", () => {
  const d = createRegexDraft("waystone");
  d.properties = { tier: { min: "15", max: "16" } };
  expect(testRegexItem(d, "Rarity: Rare\nUnnamed map").status).toBe("incomplete");
  d.properties.rarity = "normal";
  expect(testRegexItem(d, "Rarity: Rare\nUnnamed map").status).toBe("no-match");
  d.properties = { corrupted: "false" };
  expect(testRegexItem(d, "arbitrary fragment").status).toBe("incomplete");
  expect(testRegexItem(d, "Rarity: Rare\nWaystone (Tier 15)").status).toBe("match");
});
test("byte limits, invalid drafts and unknown IDs are reported", () => {
  const d = createRegexDraft("vendor");
  d.text = "x";
  expect(testRegexItem(d, "x".repeat(65536)).status).toBe("match");
  expect(testRegexItem(d, "x".repeat(65537)).status).toBe("invalid");
  expect(testRegexItem(d, "é".repeat(32769)).status).toBe("invalid");
  d.wanted = [{ id: "unknown", min: "", max: "" }];
  expect(testRegexItem(d, item).status).toBe("invalid");
});

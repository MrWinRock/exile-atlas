import { expect, test } from "bun:test";
import snapshot from "../public/data/poe2-trade-stats.json";
import { REGEX_CATEGORIES, REGEX_MODIFIERS, REGEX_PROPERTIES } from "../src/lib/regex-catalogue";
import { createRegexDraft, regexDraftSchema } from "../src/lib/regex-schema";

test("five generators have sourced, unique, usable definitions", () => {
  expect(REGEX_CATEGORIES).toHaveLength(5);
  const ids = REGEX_MODIFIERS.map((m) => m.id);
  expect(new Set(ids).size).toBe(ids.length);
  const stats = new Map(
    snapshot.groups.flatMap((g) => g.entries.map((e) => [e.id, e.text] as const)),
  );
  for (const category of REGEX_CATEGORIES) {
    expect(REGEX_MODIFIERS.some((m) => m.categories.includes(category.id))).toBe(true);
    expect(REGEX_PROPERTIES.some((p) => p.categories.includes(category.id))).toBe(true);
    expect(regexDraftSchema.safeParse(createRegexDraft(category.id)).success).toBe(true);
  }
  for (const mod of REGEX_MODIFIERS) {
    expect(mod.source.url.startsWith("https://")).toBe(true);
    expect(mod.source.verified).toBe("2026-10-12");
    if (mod.tradeStatId) expect(stats.has(mod.tradeStatId)).toBe(true);
    if (mod.template.includes("#")) expect(mod.numericDomain).toBeDefined();
  }
});

test("verified base options contain each selectable name only once", async () => {
  const { buildRegexCatalogue } = await import("../src/lib/regex-catalogue-builder");
  const { validateGameSnapshot } = await import("../src/lib/game-data");
  const gameData = validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
  const options = buildRegexCatalogue(gameData).properties.find(
    (p) => p.id === "verified-base",
  )!.options!;
  expect(new Set(options.map((option) => option.value)).size).toBe(options.length);
});

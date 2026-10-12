import { expect, test } from "bun:test";
import { createRegexDraft, type RegexPreset } from "../src/lib/regex-schema";
import {
  decodeRegexState,
  exportRegexPresets,
  parseRegexPresetImport,
} from "../src/lib/regex-presets";
const preset: RegexPreset = {
  id: "original",
  name: "My boots",
  draft: createRegexDraft("equipment"),
  favorite: true,
  createdAt: "2026-10-12T00:00:00Z",
  updatedAt: "2026-10-12T00:00:00Z",
};
test("portable presets preserve configuration and assign fresh IDs", () => {
  const text = exportRegexPresets([preset]);
  const imported = parseRegexPresetImport(text, 0);
  expect(imported[0].id).not.toBe(preset.id);
  expect(imported[0].draft).toEqual(preset.draft);
  expect(imported[0].favorite).toBe(true);
  expect(parseRegexPresetImport(text, 0)[0].id).not.toBe(imported[0].id);
});
test("invalid imports fail atomically and enforce byte/capacity limits", () => {
  for (const value of [
    "bad json",
    JSON.stringify({ format: "exile-atlas-regex", version: 2, presets: [preset] }),
    exportRegexPresets([preset]).replace("equipment", "unknown"),
  ])
    expect(() => parseRegexPresetImport(value, 0)).toThrow();
  expect(() => parseRegexPresetImport(exportRegexPresets([preset]), 100)).toThrow();
  expect(() => parseRegexPresetImport("é".repeat(524289), 0)).toThrow();
  const bad = structuredClone(preset);
  bad.draft.wanted = [{ id: "life", min: "60", max: "1" }];
  expect(() =>
    parseRegexPresetImport(
      JSON.stringify({ format: "exile-atlas-regex", version: 1, presets: [preset, bad] }),
      0,
    ),
  ).toThrow();
});
test("persisted records are recovered individually; unknown IDs remain editable", () => {
  const unknown = structuredClone(preset);
  unknown.id = "unknown-preset";
  unknown.draft.wanted = [{ id: "obsolete", min: "", max: "" }];
  const decoded = decodeRegexState({
    presets: [preset, { ...preset, id: "bad", createdAt: "invalid" }, unknown],
    drafts: { equipment: preset.draft },
    setDraft: "injected",
  });
  expect(decoded.presets).toHaveLength(2);
  expect(decoded.warnings.length).toBeGreaterThan(0);
  expect(decoded.presets[1].draft.wanted[0].id).toBe("obsolete");
  expect(
    parseRegexPresetImport(
      JSON.stringify({ format: "exile-atlas-regex", version: 1, presets: [unknown] }),
      0,
    )[0].draft.wanted[0].id,
  ).toBe("obsolete");
});

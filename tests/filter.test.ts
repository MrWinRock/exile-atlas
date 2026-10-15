import { describe, expect, test } from "bun:test";
import * as filters from "../src/lib/filter";

const legacy = {
  name: "Campaign",
  fontSize: 42,
  rareColor: "#ffc46b",
  showNormal: false,
  showMagic: true,
  sounds: false,
};

describe("visual loot filter settings", () => {
  test("migrates legacy drafts without losing their appearance", () => {
    const settings = filters.normalizeFilterSettings(legacy);
    expect(settings).toMatchObject(legacy);
    expect(filters.getFilterStyle(settings!, "rare")).toMatchObject({
      visible: true,
      fontSize: 42,
      textColor: "#ffc46b",
      borderColor: "#ffc46b",
    });
    expect(filters.getFilterStyle(settings!, "normal")?.visible).toBe(false);
    expect(filters.getFilterStyle(settings!, "unique")?.sound).toBe(0);
  });

  test("repairs malformed persisted fields individually", () => {
    expect(
      filters.normalizeFilterSettings({
        ...legacy,
        name: "   ",
        fontSize: 900,
        showNormal: "false",
        styles: { rare: { visible: true, textColor: "red" } },
      }),
    ).toMatchObject({ name: "My PoE2 filter", fontSize: 40, showNormal: false });
    expect(filters.normalizeFilterSettings(null)).toMatchObject({ name: "My PoE2 filter" });
  });

  test("applies explicit styles over legacy settings without mutating them", () => {
    const input = {
      ...legacy,
      styles: {
        rare: {
          visible: false,
          textColor: "#ffffff",
          borderColor: "#112233",
          backgroundColor: "#010203",
          fontSize: 35,
          sound: 8,
        },
      },
    };
    expect(filters.getFilterStyle(input, "rare")).toEqual(input.styles.rare);
    expect(input.fontSize).toBe(42);
  });

  test("rejects invalid category colors and sounds at the generation boundary", () => {
    expect(() =>
      filters.generateFilter({
        ...legacy,
        styles: {
          rare: {
            visible: true,
            textColor: "#ffffff",
            borderColor: "#112233",
            backgroundColor: "#010203",
            fontSize: 35,
            sound: 17,
          },
        },
      }),
    ).toThrow();
  });
});

describe("strictness and theme controls", () => {
  test("presets preserve protected drops and set equipment visibility", () => {
    const soft = filters.applyFilterPreset(legacy, "soft");
    expect(soft?.showNormal).toBe(true);
    const strict = filters.applyFilterPreset(legacy, "strict");
    expect(strict).toMatchObject({ strictness: "strict", showNormal: false, showMagic: false });
    for (const category of ["currency", "unique", "waystones", "gems"] as const)
      expect(filters.getFilterStyle(strict!, category)?.visible).toBe(true);
    expect(legacy.showMagic).toBe(true);
  });

  test.each([
    ["strict", 64, false],
    ["strict", 65, true],
    ["very-strict", 79, false],
    ["very-strict", 80, true],
  ] as const)("%s rare level %i has visibility %s", (preset, itemLevel, visible) => {
    const settings = filters.applyFilterPreset(legacy, preset);
    expect(
      filters.evaluateFilterSample(settings!, {
        id: "rare",
        name: "Rare bow",
        category: "rare",
        itemLevel,
      })?.visible,
    ).toBe(visible);
  });

  test("manual hiding wins over the rare item-level threshold", () => {
    const settings = filters.applyFilterPreset(legacy, "strict");
    expect(settings).toBeDefined();
    if (!settings) return;
    const style = filters.getFilterStyle(settings, "rare");
    settings.styles = { ...settings.styles, rare: { ...style, visible: false } };
    expect(
      filters.evaluateFilterSample(settings, {
        id: "rare",
        name: "Rare bow",
        category: "rare",
        itemLevel: 85,
      })?.visible,
    ).toBe(false);
    expect(filters.generateFilter(settings)).not.toContain("ItemLevel >= 65");
  });

  test("themes keep visibility and label size while changing the palette", () => {
    const settings = filters.applyFilterTheme(legacy, "contrast");
    expect(settings).toBeDefined();
    expect(filters.getFilterStyle(settings!, "normal")).toMatchObject({ visible: false });
    expect(filters.getFilterStyle(settings!, "rare")).toMatchObject({ fontSize: 42 });
    expect(filters.getFilterStyle(settings!, "rare")?.textColor).not.toBe("#ffc46b");
    expect(legacy.rareColor).toBe("#ffc46b");
  });
});

describe("generated PoE2 filter rules", () => {
  test("rejects comment-only source with no rule blocks", () => {
    expect(filters.validateFilter("# A filter title\n\n# No rules yet").valid).toBe(false);
  });

  test("protects PoE2 currency, waystones and gems before equipment rules", () => {
    const text = filters.generateFilter(legacy);
    expect(text).toContain('Class == "Stackable Currency"');
    expect(text).toContain('Class == "Waystones"');
    expect(text).toContain('"Uncut Skill Gems" "Uncut Support Gems" "Uncut Spirit Gems"');
    expect(text.indexOf('Class == "Waystones"')).toBeLessThan(text.indexOf("Rarity == Rare"));
    expect(text).toMatch(/Hide\n\s+Rarity == Normal\n\s+Class == .*"Body Armours"/);
    expect(text.trimEnd()).toEndWith("Show");
    expect(filters.validateFilter(text).valid).toBe(true);
  });

  test("strict rare rules hide lower levels before the safe fallback", () => {
    const settings = filters.applyFilterPreset(legacy, "strict");
    expect(settings).toBeDefined();
    if (!settings) return;
    const text = filters.generateFilter(settings);
    expect(text).toMatch(/Show\n\s+Rarity == Rare[\s\S]*?ItemLevel >= 65/);
    expect(text).toMatch(/Hide\n\s+Rarity == Rare/);
  });

  test("writes the selected appearance and only enabled alert sounds", () => {
    const text = filters.generateFilter({
      ...legacy,
      styles: {
        currency: {
          visible: true,
          textColor: "#ffffff",
          borderColor: "#112233",
          backgroundColor: "#010203",
          fontSize: 35,
          sound: 8,
        },
      },
    });
    expect(text).toContain("SetTextColor 255 255 255");
    expect(text).toContain("SetBorderColor 17 34 51");
    expect(text).toContain("SetBackgroundColor 1 2 3");
    expect(text).toContain("PlayAlertSound 8 200");
    expect(text).not.toContain("PlayAlertSound 0");
  });

  test("sample loot includes visible protected drops and low/high equipment levels", () => {
    const loot = filters.sampleFilterLoot;
    expect(loot?.find((item) => item.name === "Exalted Orb")?.category).toBe("currency");
    expect(loot?.find((item) => item.name === "Expert Dualstring Bow")?.itemLevel).toBe(80);
    expect(loot?.find((item) => item.name === "Iron Greathelm")?.category).toBe("normal");
  });
});

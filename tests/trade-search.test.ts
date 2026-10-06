import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import {
  buildTradeUrl,
  createTradeDraft,
  toTradeQuery,
  TRADE_CATEGORIES,
  tradeSummary,
  validateTradeDraft,
  type TradeDraft,
} from "../src/lib/trade-search";

function draft(overrides: Partial<TradeDraft> = {}): TradeDraft {
  return { ...createTradeDraft(), ...overrides };
}

describe("PoE2 trade search", () => {
  test("omits empty values while preserving the PoE2 availability status", () => {
    expect(toTradeQuery(draft())).toEqual({ status: { option: "any" }, stats: [] });
  });

  test("serializes filters across sections without losing a zero boundary", () => {
    expect(
      toTradeQuery(
        draft({
          name: "  Astramentis  ",
          type: "  Stellar Amulet  ",
          fields: {
            "type_filters.category": "accessory.amulet",
            "type_filters.rarity": "unique",
            "type_filters.ilvl": { min: "80", max: "" },
            "type_filters.quality": { min: "0", max: "20" },
            "equipment_filters.spirit": { min: "50", max: "100" },
            "req_filters.lvl": { min: "", max: "80" },
            "map_filters.map_tier": { min: "15", max: "" },
            "misc_filters.corrupted": "false",
            "trade_filters.indexed": "1day",
            "trade_filters.price": { min: "0", max: "5" },
            "trade_filters.price.option": "divine",
          },
        }),
      ),
    ).toEqual({
      status: { option: "any" },
      name: "Astramentis",
      type: "Stellar Amulet",
      stats: [],
      filters: {
        type_filters: {
          filters: {
            category: { option: "accessory.amulet" },
            rarity: { option: "unique" },
            ilvl: { min: 80 },
            quality: { min: 0, max: 20 },
          },
        },
        equipment_filters: { filters: { spirit: { min: 50, max: 100 } } },
        req_filters: { filters: { lvl: { max: 80 } } },
        map_filters: { filters: { map_tier: { min: 15 } } },
        misc_filters: { filters: { corrupted: { option: "false" } } },
        trade_filters: {
          filters: { indexed: { option: "1day" }, price: { min: 0, max: 5, option: "divine" } },
        },
      },
    });
  });

  test("hands off newly verified current PoE2 equipment, waystone, item-state and gold-fee filters", () => {
    expect(
      toTradeQuery(
        draft({
          fields: {
            "equipment_filters.ward": { min: "1", max: "2" },
            "equipment_filters.total_augment_sockets": { min: "3", max: "" },
            "map_filters.map_magic_monsters": { min: "4", max: "" },
            "map_filters.map_rare_monsters": { min: "5", max: "" },
            "map_filters.map_gold": { min: "6", max: "" },
            "map_filters.map_experience": { min: "7", max: "" },
            "misc_filters.twice_corrupted": "true",
            "misc_filters.mutated": "false",
            "misc_filters.desecrated": "true",
            "misc_filters.crafted": "false",
            "misc_filters.foreseeing": "true",
            "misc_filters.stack_size": { min: "8", max: "10" },
            "trade_filters.fee": { min: "0", max: "100" },
          },
        }),
      ),
    ).toEqual({
      status: { option: "any" },
      stats: [],
      filters: {
        equipment_filters: {
          filters: { ward: { min: 1, max: 2 }, total_augment_sockets: { min: 3 } },
        },
        map_filters: {
          filters: {
            map_magic_monsters: { min: 4 },
            map_rare_monsters: { min: 5 },
            map_gold: { min: 6 },
            map_experience: { min: 7 },
          },
        },
        misc_filters: {
          filters: {
            twice_corrupted: { option: "true" },
            mutated: { option: "false" },
            desecrated: { option: "true" },
            crafted: { option: "false" },
            foreseeing: { option: "true" },
            stack_size: { min: 8, max: 10 },
          },
        },
        trade_filters: { filters: { fee: { min: 0, max: 100 } } },
      },
    });
  });

  test.each(["any", "priced_with_info", "unpriced"])(
    "serializes the current official sale type %s",
    (option) => {
      expect(toTradeQuery(draft({ fields: { "trade_filters.sale_type": option } }))).toEqual({
        status: { option: "any" },
        stats: [],
        filters: { trade_filters: { filters: { sale_type: { option } } } },
      });
    },
  );

  test("omits the official default sale type and exalted-equivalent price currency", () => {
    expect(
      toTradeQuery(
        draft({ fields: { "trade_filters.sale_type": "", "trade_filters.price.option": "" } }),
      ),
    ).toEqual({ status: { option: "any" }, stats: [] });
  });

  test.each([
    "exalted_divine",
    "aug",
    "transmute",
    "exalted",
    "regal",
    "chaos",
    "vaal",
    "alch",
    "divine",
    "annul",
    "mirror",
  ])("serializes verified PoE2 price currency %s", (option) => {
    expect(
      toTradeQuery(
        draft({
          fields: {
            "trade_filters.price.option": option,
            "trade_filters.price": { min: "", max: "5" },
          },
        }),
      ),
    ).toEqual({
      status: { option: "any" },
      stats: [],
      filters: { trade_filters: { filters: { price: { max: 5, option } } } },
    });
  });

  test("states the default exalted-equivalent currency when copying a price filter", () => {
    expect(
      tradeSummary(draft({ fields: { "trade_filters.price": { min: "", max: "5" } } })),
    ).toContain("Price Currency: Exalted Orb Equivalent");
  });

  test("serializes active groups and legitimate negative stats, excluding disabled groups and rows", () => {
    const filter = {
      id: "explicit.stat_123",
      label: "Some stat",
      min: "-5",
      max: "0",
      disabled: false,
    };
    expect(
      toTradeQuery(
        draft({
          statGroups: [
            {
              id: "a",
              type: "count",
              min: "1",
              max: "2",
              disabled: false,
              filters: [filter, { ...filter, id: "explicit.stat_456", disabled: true }],
            },
            { id: "b", type: "and", min: "", max: "", disabled: true, filters: [filter] },
            {
              id: "c",
              type: "weight",
              min: "0",
              max: "",
              disabled: false,
              filters: [{ ...filter, min: "", max: "" }],
            },
          ],
        }),
      ),
    ).toEqual({
      status: { option: "any" },
      stats: [
        {
          type: "count",
          value: { min: 1, max: 2 },
          filters: [{ id: "explicit.stat_123", value: { min: -5, max: 0 } }],
        },
        { type: "weight", value: { min: 0 }, filters: [{ id: "explicit.stat_123" }] },
      ],
    });
  });

  test("preserves selectable skill and passive stat IDs exactly as the pinned PoE2 tools serialize them", () => {
    expect(
      toTradeQuery(
        draft({
          statGroups: [
            {
              id: "a",
              type: "and",
              min: "",
              max: "",
              disabled: false,
              filters: [
                {
                  id: "explicit.stat_448592698|98",
                  label: "+# to Level of all Arc Skills",
                  min: "2",
                  max: "",
                  disabled: false,
                },
                {
                  id: "enchant.stat_2954116742|7338",
                  label: "Allocates Abasement",
                  min: "",
                  max: "",
                  disabled: false,
                },
              ],
            },
          ],
        }),
      ),
    ).toEqual({
      status: { option: "any" },
      stats: [
        {
          type: "and",
          filters: [
            { id: "explicit.stat_448592698|98", value: { min: 2 } },
            { id: "enchant.stat_2954116742|7338" },
          ],
        },
      ],
    });
  });

  test.each([
    "explicit.stat_123|",
    "explicit.stat_123|abc",
    "explicit.stat_123|1|2",
    "explicit.stat_123|1.5",
  ])("rejects malformed selectable stat ID %s", (id) => {
    expect(
      validateTradeDraft(
        draft({
          statGroups: [
            {
              id: "a",
              type: "and",
              min: "",
              max: "",
              disabled: false,
              filters: [{ id, label: "Invalid stat", min: "", max: "", disabled: false }],
            },
          ],
        }),
      ).length,
    ).toBe(1);
  });

  test.each(["NaN", "Infinity", "-Infinity", "10foo", "0xFF", "1e999"])(
    "rejects invalid numeric filter %s instead of dropping it",
    (value) => {
      const valueDraft = draft({ fields: { "type_filters.ilvl": { min: value, max: "" } } });
      expect(validateTradeDraft(valueDraft).some((error) => error.includes("Level"))).toBe(true);
      expect(() => toTradeQuery(valueDraft)).toThrow();
    },
  );

  test("rejects reversed ranges, negative ordinary ranges, and invalid options", () => {
    expect(
      validateTradeDraft(
        draft({
          fields: {
            "type_filters.ilvl": { min: "90", max: "80" },
            "equipment_filters.dps": { min: "-1", max: "" },
            "misc_filters.corrupted": "maybe",
          },
        }),
      ).length,
    ).toBe(3);
  });

  test("rejects unknown fields and incomplete active stats rather than ignoring filters", () => {
    const valueDraft = draft({
      fields: { "misc_filters.fake": "true" },
      statGroups: [
        {
          id: "a",
          type: "and",
          min: "",
          max: "",
          disabled: false,
          filters: [{ id: "", label: "Unselected stat", min: "5", max: "", disabled: false }],
        },
      ],
    });
    expect(validateTradeDraft(valueDraft).length).toBe(2);
    expect(() => toTradeQuery(valueDraft)).toThrow();
  });

  test("rejects a bounded stat group with no active stat rather than dropping its condition", () => {
    expect(
      validateTradeDraft(
        draft({
          statGroups: [{ id: "a", type: "count", min: "1", max: "", disabled: false, filters: [] }],
        }),
      ).some((error) => error.includes("Stat group 1")),
    ).toBe(true);
  });

  test.each([
    ["Any Weapon", "weapon"],
    ["Any One-Handed Melee Weapon", "weapon.onemelee"],
    ["Unarmed", "weapon.unarmed"],
    ["Any Ranged Weapon", "weapon.ranged"],
    ["Any Caster Weapon", "weapon.caster"],
    ["Any Armour", "armour"],
    ["Any Accessory", "accessory"],
    ["Any Gem", "gem"],
    ["Logbook", "map.logbook"],
    ["Breachstone", "map.breachstone"],
    ["Barya", "map.barya"],
    ["Pinnacle Key", "map.bosskey"],
    ["Ultimatum Key", "map.ultimatum"],
    ["Divination Card", "card"],
    ["Any Currency", "currency"],
    ["Omen", "currency.omen"],
    ["Any Augment", "currency.socketable"],
    ["Rune", "currency.rune"],
    ["Soul Core", "currency.soulcore"],
    ["Idol", "currency.idol"],
  ])("hands off current official category %s using verified key %s", (label, expected) => {
    const option = TRADE_CATEGORIES.find((entry) => entry.label === label)!;
    expect(toTradeQuery(draft({ fields: { "type_filters.category": option.value } }))).toEqual({
      status: { option: "any" },
      stats: [],
      filters: { type_filters: { filters: { category: { option: expected } } } },
    });
    expect(tradeSummary(draft({ fields: { "type_filters.category": option.value } }))).toContain(
      `Item Category: ${label}`,
    );
  });

  test("rejects an unknown category instead of silently guessing a handoff key", () => {
    expect(
      validateTradeDraft(draft({ fields: { "type_filters.category": "weapon.unverified" } })).some(
        (error) => error.includes("Item Category"),
      ),
    ).toBe(true);
  });

  test("disabled stat filters may retain unfinished edits without preventing a search", () => {
    expect(
      validateTradeDraft(
        draft({
          statGroups: [
            {
              id: "a",
              type: "and",
              min: "",
              max: "",
              disabled: false,
              filters: [{ id: "", label: "", min: "bad", max: "", disabled: true }],
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  test("preserves weighted stat coefficients and seller account input in the verified query shape", () => {
    const valueDraft = draft({
      fields: { "trade_filters.account": " Seller#1234 " },
      statGroups: [
        {
          id: "a",
          type: "weight",
          min: "100",
          max: "",
          disabled: false,
          filters: [
            {
              id: "explicit.stat_123",
              label: "Life",
              min: "",
              max: "",
              weight: "-0.5",
              disabled: false,
            },
            {
              id: "explicit.stat_456",
              label: "Armour",
              min: "0",
              max: "",
              weight: "0",
              disabled: false,
            },
          ],
        },
      ],
    });
    expect(toTradeQuery(valueDraft)).toEqual({
      status: { option: "any" },
      stats: [
        {
          type: "weight",
          value: { min: 100 },
          filters: [
            { id: "explicit.stat_123", value: { weight: -0.5 } },
            { id: "explicit.stat_456", value: { min: 0, weight: 0 } },
          ],
        },
      ],
      filters: { trade_filters: { filters: { account: { input: "Seller#1234" } } } },
    });
    expect(tradeSummary(valueDraft)).toContain("Life (weight -0.5)");
  });

  test("rejects invalid weighted coefficients and retains invalid edits in the copy summary", () => {
    const valueDraft = draft({
      fields: { "type_filters.category": "weapon.unverified" },
      statGroups: [
        {
          id: "a",
          type: "weight",
          min: "",
          max: "",
          disabled: false,
          filters: [
            {
              id: "explicit.stat_123",
              label: "Life",
              min: "",
              max: "",
              weight: "Infinity",
              disabled: false,
            },
          ],
        },
      ],
    });
    expect(validateTradeDraft(valueDraft).length).toBe(2);
    expect(tradeSummary(valueDraft)).toContain("Item Category: weapon.unverified");
    expect(tradeSummary(valueDraft)).toContain("weight Infinity");
  });

  test("builds a safe PoE2-only URL whose gzip payload roundtrips to the query, without API envelope", async () => {
    const url = await buildTradeUrl(
      draft({
        league: "Dawn / HC?#",
        name: "Astramentis",
        fields: { "trade_filters.price": { min: "", max: "2" } },
      }),
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://www.pathofexile.com");
    expect(parsed.pathname).toStartWith("/trade2/search/poe2/Dawn%20%2F%20HC%3F%23/");
    expect(parsed.search).toBe("");
    expect(parsed.hash).toBe("");
    const token = parsed.pathname.split("/").at(-1)!;
    const result = JSON.parse(
      gunzipSync(Buffer.from(token.replaceAll("-", "+").replaceAll("_", "/"), "base64")).toString(),
    );
    expect(result).toEqual({
      status: { option: "any" },
      name: "Astramentis",
      stats: [],
      filters: { trade_filters: { filters: { price: { max: 2 } } } },
    });
    expect(result.query).toBeUndefined();
    expect(result.sort).toBeUndefined();
  });

  test("summarizes search intent and counts only active filters", () => {
    expect(
      tradeSummary(
        draft({ type: "Stellar Amulet", fields: { "type_filters.ilvl": { min: "80", max: "" } } }),
      ),
    ).toContain("Stellar Amulet");
    expect(tradeSummary(draft())).toBe("Any item · Any status\nLeague: Standard");
  });
});

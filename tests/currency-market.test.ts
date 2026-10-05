import { expect, test } from "bun:test";
import { normalizeMarket, type Market } from "../src/lib/currency";
import {
  buildCurrencyMarketRows,
  currencyMarketCategory,
  type CurrencySnapshot,
} from "../src/lib/currency-market";

const divine = "Metadata/Items/Currency/CurrencyModValues";
const chaos = "Metadata/Items/Currency/CurrencyRerollRare";
const exalted = "Metadata/Items/Currency/CurrencyAddModToRare";
const annulment = "Metadata/Items/Currency/CurrencyRemoveMod";
const essence = "Metadata/Items/Currency/CurrencyEssenceSpeed";
const rune = "Metadata/Items/SoulCores/RuneFire";

function market(
  itemId: string,
  quoteId: string,
  low: number | null,
  high = low,
  league = "Standard",
  reversed = false,
): Market {
  return normalizeMarket({
    league,
    market_pair: reversed ? [quoteId, itemId] : [itemId, quoteId],
    volume_traded: { [itemId]: 120, [quoteId]: 80 },
    lowest_stock: { [itemId]: 50, [quoteId]: 10 },
    highest_stock: { [itemId]: 90, [quoteId]: 20 },
    lowest_ratio: low === null ? {} : { [itemId]: 2, [quoteId]: low * 2 },
    highest_ratio: high === null ? {} : { [itemId]: 4, [quoteId]: high * 4 },
  });
}

test("item rows use direct quantity ratios and the selected item's stock and volume", () => {
  const rows = buildCurrencyMarketRows(
    [market(essence, divine, 2.5, 3, "Standard", true)],
    [],
    "Standard",
    divine,
    3600,
  );
  expect(rows).toEqual([
    {
      itemId: essence,
      quoteId: divine,
      low: 2.5,
      high: 3,
      stock: 90,
      volume: 120,
      history: [{ hour: 3600, price: 2.75 }],
      change: null,
    },
  ]);
});

test("explicit quote lists each league item once without synthesizing an indirect price", () => {
  const rows = buildCurrencyMarketRows(
    [
      market(essence, chaos, 20),
      market(chaos, divine, 0.1),
      market(essence, exalted, 10),
      market(rune, divine, 7, 8, "Hardcore"),
    ],
    [],
    "Standard",
    divine,
    7200,
  );
  expect(rows.map((row) => row.itemId).sort()).toEqual([essence, chaos, exalted].sort());
  expect(rows.find((row) => row.itemId === essence)).toMatchObject({
    quoteId: divine,
    low: null,
    high: null,
    stock: null,
    volume: 0,
    history: [],
    change: null,
  });
  expect(rows.find((row) => row.itemId === chaos)).toMatchObject({ low: 0.1, high: 0.1 });
});

test("history keeps the exact item, quote and league despite changing pair orientation", () => {
  const snapshots: CurrencySnapshot[] = [
    { hour: 7200, markets: [market(essence, divine, 4, 8, "Standard", true)] },
    { hour: 0, markets: [market(essence, divine, 2, 2)] },
    {
      hour: 3600,
      markets: [market(essence, chaos, 99), market(essence, divine, 900, 900, "Hardcore")],
    },
    { hour: 10800, markets: [market(essence, divine, 500)] },
  ];
  const row = buildCurrencyMarketRows(
    [market(essence, divine, 8, 12)],
    snapshots,
    "Standard",
    divine,
    7200,
  )[0];
  expect(row.history).toEqual([
    { hour: 0, price: 2 },
    { hour: 7200, price: 10 },
  ]);
  expect(row.change).toBe(400);
});

test("duplicate historical hours use the last snapshot and current data overrides its hour", () => {
  const row = buildCurrencyMarketRows(
    [market(essence, divine, 6)],
    [
      { hour: 0, markets: [market(essence, divine, 1)] },
      { hour: 0, markets: [market(essence, divine, 3)] },
      { hour: 3600, markets: [market(essence, divine, 100)] },
    ],
    "Standard",
    divine,
    3600,
  )[0];
  expect(row.history).toEqual([
    { hour: 0, price: 3 },
    { hour: 3600, price: 6 },
  ]);
  expect(row.change).toBe(100);
});

test("an invalid current price removes stale same-hour history without discarding stock", () => {
  const row = buildCurrencyMarketRows(
    [market(essence, divine, null)],
    [{ hour: 3600, markets: [market(essence, divine, 4)] }],
    "Standard",
    divine,
    3600,
  )[0];
  expect(row).toMatchObject({
    low: null,
    high: null,
    stock: 90,
    volume: 120,
    history: [],
    change: null,
  });
});

test("partial endpoints remain usable while invalid item stock is omitted", () => {
  const pair = market(essence, divine, null, 4);
  pair.raw.highest_stock[essence] = -1;
  const row = buildCurrencyMarketRows([pair], [], "Standard", divine, 3600)[0];
  expect(row).toMatchObject({ low: 4, high: 4, stock: null, history: [{ hour: 3600, price: 4 }] });
  pair.raw.highest_stock[essence] = Infinity;
  expect(buildCurrencyMarketRows([pair], [], "Standard", divine, 3600)[0].stock).toBeNull();
  pair.raw.highest_stock[essence] = 0;
  expect(buildCurrencyMarketRows([pair], [], "Standard", divine, 3600)[0].stock).toBe(0);
});

test("auto quote chooses the first preferred direct price at least one", () => {
  const rows = buildCurrencyMarketRows(
    [market(essence, divine, 0.01), market(essence, chaos, 2), market(essence, exalted, 10)],
    [],
    "Standard",
    "",
    3600,
  );
  expect(rows.find((row) => row.itemId === essence)).toMatchObject({
    quoteId: chaos,
    low: 2,
    high: 2,
  });
});

test("auto quote falls back to the first valid direct price below one", () => {
  const rows = buildCurrencyMarketRows(
    [market(essence, divine, 0.01), market(essence, chaos, 0.5), market(essence, exalted, 0.9)],
    [],
    "Standard",
    "",
    3600,
  );
  expect(rows.find((row) => row.itemId === essence)).toMatchObject({ quoteId: divine, low: 0.01 });
});

test("auto quote skips invalid preferred pairs and never prices an item against itself", () => {
  const rows = buildCurrencyMarketRows(
    [market(essence, divine, null), market(essence, annulment, 3), market(divine, chaos, 10)],
    [],
    "Standard",
    "",
    3600,
  );
  expect(rows.find((row) => row.itemId === essence)).toMatchObject({ quoteId: annulment, low: 3 });
  expect(rows.find((row) => row.itemId === divine)).toMatchObject({ quoteId: chaos, low: 10 });
});

test("auto quote history keeps today's chosen quote rather than changing quote every hour", () => {
  const rows = buildCurrencyMarketRows(
    [market(essence, divine, 0.1), market(essence, chaos, 4)],
    [{ hour: 0, markets: [market(essence, divine, 20), market(essence, chaos, 2)] }],
    "Standard",
    "",
    3600,
  );
  expect(rows.find((row) => row.itemId === essence)).toMatchObject({
    quoteId: chaos,
    history: [
      { hour: 0, price: 2 },
      { hour: 3600, price: 4 },
    ],
    change: 100,
  });
});

test("items without any supported direct quote remain visible but unpriced", () => {
  const rows = buildCurrencyMarketRows([market(essence, rune, 5)], [], "Standard", "", 3600);
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row).toMatchObject({
      quoteId: "",
      low: null,
      high: null,
      stock: null,
      volume: 0,
      history: [],
    });
  }
  expect(buildCurrencyMarketRows([], [], "Standard", divine, 3600)).toEqual([]);
});

test.each([
  [essence, "Essence of Haste", "StackableCurrency", "Essences"],
  [
    "Metadata/Items/Currency/CurrencyCorruptedEssenceDelirium",
    "Essence of Delirium",
    "StackableCurrency",
    "Essences",
  ],
  ["Metadata/Items/Currency/DistilledEmotion4", "Liquid Paranoia", "StackableCurrency", "Delirium"],
  [
    "Metadata/Items/Currency/CurrencyAfflictionShard",
    "Simulacrum Splinter",
    "StackableCurrency",
    "Delirium",
  ],
  ["Metadata/Items/Currency/CurrencyBreachShard", "Breach Splinter", "StackableCurrency", "Breach"],
  [
    "Metadata/Items/Currency/AbyssalBenchTicketWeaponHigh",
    "Ancient Jawbone",
    "StackableCurrency",
    "Abyss",
  ],
  [
    "Metadata/Items/Currency/CurrencyIncursionDoubleCorrupt",
    "Architect's Orb",
    "StackableCurrency",
    "Atziri's Temple",
  ],
  [
    "Metadata/Items/Currency/CurrencyIncursionModifySoulCore",
    "Core Destabiliser",
    "StackableCurrency",
    "Atziri's Temple",
  ],
  [
    "Metadata/Items/MapFragments/VaultKeyWorldDrop",
    "Twilight Reliquary Key",
    "VaultKey",
    "Fragments",
  ],
  [rune, "Desert Rune", "SoulCore", "Runes"],
  ["Metadata/Items/Currency/OmenOnLowLifeRecoverCharges", "Omen of Refreshment", "Omen", "Ritual"],
  ["Metadata/Items/SoulCores/SoulCoreChaos", "Soul Core of Tacati", "SoulCore", "Soul Cores"],
  ["Metadata/Items/SoulCores/TalismanSpecial1", "Idol of Sirrius", "SoulCore", "Idols"],
  [
    "Metadata/Items/Gems/SkillGemUncutQuest1",
    "Uncut Skill Gem (Level 1)",
    "UncutSkillGemStackable",
    "Uncut Gems",
  ],
  [
    "Metadata/Items/Expedition/ExpeditionLogbook",
    "Expedition Logbook",
    "ExpeditionLogbook",
    "Expedition",
  ],
  ["Metadata/Items/Gem/SkillGemFireball", "Fireball", "Active Skill Gem", "Gems"],
  [
    "Metadata/Items/Gems/SupportGemFirePenetration",
    "Fire Penetration I",
    "Support Skill Gem",
    "Gems",
  ],
  [divine, "Divine Orb", "StackableCurrency", "Currency"],
  [
    "Metadata/Items/Currency/CurrencyGemQuality",
    "Gemcutter's Prism",
    "StackableCurrency",
    "Currency",
  ],
  ["Metadata/Items/Gems/SkillGemEssenceDrain", "Essence Drain", "Active Skill Gem", "Gems"],
  ["Metadata/Items/Unknown/Relic", "Unrecognised Relic", "Relic", "Other"],
])(
  "category groups %s using metadata, display name and item class",
  (id, name, itemClass, category) => {
    expect(currencyMarketCategory(id, name, itemClass)).toBe(category);
  },
);

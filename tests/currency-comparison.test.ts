import { expect, test } from "bun:test";
import { compareExchangePair, type Market } from "../src/lib/currency";

const buyId = "Metadata/Currency/A";
const sellId = "Metadata/Currency/B";

function market(
  lowest: Record<string, number> = { [buyId]: 2, [sellId]: 5 },
  highest: Record<string, number> = { [buyId]: 4, [sellId]: 12 },
): Market {
  return {
    id: "market-ab",
    league: "Standard",
    baseId: buyId,
    quoteId: sellId,
    base: "A",
    quote: "B",
    baseVolume: 120,
    quoteVolume: 45,
    // Existing display fields hold the base quantity, not the pair's quotient.
    low: lowest[buyId] ?? null,
    high: highest[buyId] ?? null,
    raw: {
      league: "Standard",
      market_pair: [buyId, sellId],
      volume_traded: { [buyId]: 120, [sellId]: 45 },
      lowest_stock: {},
      highest_stock: {},
      lowest_ratio: lowest,
      highest_ratio: highest,
    },
  };
}

test("buying A with B compares dictionary quantities instead of treating them as prices", () => {
  const row = market();
  const result = compareExchangePair([row], buyId, sellId, "Standard");
  expect(result?.market).toBe(row);
  expect(result).toMatchObject({
    buyVolume: 120,
    sellVolume: 45,
    low: 2.5,
    high: 3,
    complete: true,
  });
});

test("reversing buy and sell swaps volumes and reciprocates the sorted range", () => {
  const row = market();
  const result = compareExchangePair([row], sellId, buyId, "Standard");
  expect(result?.market).toBe(row);
  expect(result).toMatchObject({ buyVolume: 45, sellVolume: 120, complete: true });
  expect(result?.low).toBeCloseTo(1 / 3);
  expect(result?.high).toBeCloseTo(0.4);
});

test("pair matching ignores exported pair order while preserving the selected direction", () => {
  const row = market();
  const reversed: Market = {
    ...row,
    baseId: sellId,
    quoteId: buyId,
    base: "B",
    quote: "A",
    baseVolume: 45,
    quoteVolume: 120,
    low: 5,
    high: 12,
    raw: { ...row.raw, market_pair: [sellId, buyId] },
  };
  const result = compareExchangePair([reversed], buyId, sellId, "Standard");
  expect(result?.market).toBe(reversed);
  expect(result).toMatchObject({
    buyVolume: 120,
    sellVolume: 45,
    low: 2.5,
    high: 3,
    complete: true,
  });
});

test("the reported range stays ascending when endpoint dictionary ratios are inverted", () => {
  const row = market({ [buyId]: 2, [sellId]: 10 }, { [buyId]: 4, [sellId]: 10 });
  expect(compareExchangePair([row], buyId, sellId, "Standard")).toMatchObject({
    low: 2.5,
    high: 5,
    complete: true,
  });
});

test("two equal valid endpoint ratios still provide a complete comparison", () => {
  const row = market({ [buyId]: 2, [sellId]: 5 }, { [buyId]: 4, [sellId]: 10 });
  expect(compareExchangePair([row], buyId, sellId, "Standard")).toMatchObject({
    low: 2.5,
    high: 2.5,
    complete: true,
  });
});

test("matching requires the exact league even when another league has the same pair", () => {
  const standard = market();
  const hardcoreRow = market({ [buyId]: 1, [sellId]: 9 }, { [buyId]: 1, [sellId]: 12 });
  const hardcore: Market = {
    ...hardcoreRow,
    id: "hardcore-ab",
    league: "Hardcore",
    raw: { ...hardcoreRow.raw, league: "Hardcore" },
  };
  expect(compareExchangePair([hardcore, standard], buyId, sellId, "Standard")?.market).toBe(
    standard,
  );
  expect(compareExchangePair([standard], buyId, sellId, "Hardcore")).toBeNull();
  expect(compareExchangePair([standard], buyId, sellId, "standard")).toBeNull();
});

test("same items, absent pairs and empty markets do not invent a comparison", () => {
  const row = market();
  expect(compareExchangePair([row], buyId, buyId, "Standard")).toBeNull();
  expect(compareExchangePair([row], buyId, "Metadata/Currency/C", "Standard")).toBeNull();
  expect(compareExchangePair([], buyId, sellId, "Standard")).toBeNull();
});

const invalidEndpoints: [string, Record<string, number>][] = [
  ["empty dictionary", {}],
  ["missing buy quantity", { [sellId]: 5 }],
  ["missing sell quantity", { [buyId]: 2 }],
  ["zero buy quantity", { [buyId]: 0, [sellId]: 5 }],
  ["zero sell quantity", { [buyId]: 2, [sellId]: 0 }],
  ["negative buy quantity", { [buyId]: -2, [sellId]: 5 }],
  ["negative sell quantity", { [buyId]: 2, [sellId]: -5 }],
  ["both negative quantities", { [buyId]: -2, [sellId]: -5 }],
  ["NaN buy quantity", { [buyId]: NaN, [sellId]: 5 }],
  ["NaN sell quantity", { [buyId]: 2, [sellId]: NaN }],
  ["infinite buy quantity", { [buyId]: Infinity, [sellId]: 5 }],
  ["infinite sell quantity", { [buyId]: 2, [sellId]: Infinity }],
  ["overflowing ratio", { [buyId]: Number.MIN_VALUE, [sellId]: Number.MAX_VALUE }],
  ["underflowing ratio", { [buyId]: Number.MAX_VALUE, [sellId]: Number.MIN_VALUE }],
];

test.each(invalidEndpoints)("%s leaves the valid endpoint as an incomplete range", (_, invalid) => {
  const row = market(invalid, { [buyId]: 2, [sellId]: 5 });
  expect(compareExchangePair([row], buyId, sellId, "Standard")).toMatchObject({
    low: 2.5,
    high: 2.5,
    complete: false,
  });
});

test("a valid lower endpoint remains available when the higher endpoint is missing", () => {
  const row = market({ [buyId]: 2, [sellId]: 5 }, {});
  expect(compareExchangePair([row], buyId, sellId, "Standard")).toMatchObject({
    low: 2.5,
    high: 2.5,
    complete: false,
  });
});

test("an existing market without valid endpoints retains its volumes but has no range", () => {
  const row = market({}, { [buyId]: 0, [sellId]: Infinity });
  const result = compareExchangePair([row], buyId, sellId, "Standard");
  expect(result?.market).toBe(row);
  expect(result).toMatchObject({
    buyVolume: 120,
    sellVolume: 45,
    low: null,
    high: null,
    complete: false,
  });
});

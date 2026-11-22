import { z } from "zod";
export const rawMarketSchema = z.object({
  league: z.string(),
  market_id: z.string().optional(),
  market_pair: z.tuple([z.string(), z.string()]),
  volume_traded: z.record(z.string(), z.number()),
  lowest_stock: z.record(z.string(), z.number()),
  highest_stock: z.record(z.string(), z.number()),
  lowest_ratio: z.record(z.string(), z.number()),
  highest_ratio: z.record(z.string(), z.number()),
});
export type RawMarket = z.infer<typeof rawMarketSchema>;
export type Market = {
  id: string;
  league: string;
  baseId: string;
  quoteId: string;
  base: string;
  quote: string;
  baseVolume: number;
  quoteVolume: number;
  low: number | null;
  high: number | null;
  raw: RawMarket;
};
export function completedHour(now = new Date()): number {
  return Math.floor(now.getTime() / 3_600_000) * 3600 - 3600;
}
export function validateHour(hour: number, now = new Date()): number {
  if (!Number.isSafeInteger(hour) || hour < 0 || hour % 3600 !== 0 || hour > completedHour(now))
    throw new Error("Choose a completed UTC hour");
  return hour;
}
export function currencyName(id: string): string {
  return id
    .split("/")
    .pop()!
    .replace(/^Currency/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function normalizeMarket(value: unknown): Market {
  const raw = rawMarketSchema.parse(value),
    [baseId, quoteId] = raw.market_pair;
  return {
    id: raw.market_id ?? raw.market_pair.join("|"),
    league: raw.league,
    baseId,
    quoteId,
    base: currencyName(baseId),
    quote: currencyName(quoteId),
    baseVolume: raw.volume_traded[baseId] ?? 0,
    quoteVolume: raw.volume_traded[quoteId] ?? 0,
    low: raw.lowest_ratio[baseId] ?? null,
    high: raw.highest_ratio[baseId] ?? null,
    raw,
  };
}

export type ExchangeComparison = {
  market: Market;
  buyVolume: number;
  sellVolume: number;
  low: number | null;
  high: number | null;
  complete: boolean;
};

export function compareExchangePair(
  markets: Market[],
  buyId: string,
  sellId: string,
  league: string,
): ExchangeComparison | null {
  if (!buyId || !sellId || buyId === sellId) return null;
  const market = markets.find(
    (row) =>
      row.league === league &&
      ((row.baseId === buyId && row.quoteId === sellId) ||
        (row.baseId === sellId && row.quoteId === buyId)),
  );
  if (!market) return null;

  // GGG reports paired quantities at each endpoint, not a scalar price.
  const ratios = [market.raw.lowest_ratio, market.raw.highest_ratio].flatMap((quantities) => {
    const buy = quantities[buyId],
      sell = quantities[sellId];
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) return [];
    const price = sell / buy;
    return Number.isFinite(price) && price > 0 ? [price] : [];
  });
  return {
    market,
    buyVolume: market.raw.volume_traded[buyId] ?? 0,
    sellVolume: market.raw.volume_traded[sellId] ?? 0,
    low: ratios.length ? Math.min(...ratios) : null,
    high: ratios.length ? Math.max(...ratios) : null,
    complete: ratios.length === 2,
  };
}

export function singleExchangeRate(comparison: ExchangeComparison | null): number | null {
  if (!comparison?.complete || comparison.low === null || !Number.isFinite(1 / comparison.low))
    return null;

  const { baseId, quoteId, raw } = comparison.market;
  const low = raw.lowest_ratio;
  const high = raw.highest_ratio;
  const first = decimalProduct(low[baseId], high[quoteId]);
  const second = decimalProduct(high[baseId], low[quoteId]);
  const exponent = Math.min(first.exponent, second.exponent);
  const firstProduct = first.digits * 10n ** BigInt(first.exponent - exponent);
  const secondProduct = second.digits * 10n ** BigInt(second.exponent - exponent);

  // Compare the reported quantities before division can collapse distinct bounds.
  return firstProduct === secondProduct ? comparison.low : null;
}

function decimalProduct(left: number, right: number) {
  function decimalParts(value: number) {
    const [mantissa, exponent = "0"] = value.toString().split("e");
    const [whole, fraction = ""] = mantissa.split(".");
    return { digits: BigInt(whole + fraction), exponent: Number(exponent) - fraction.length };
  }

  const first = decimalParts(left);
  const second = decimalParts(right);
  return { digits: first.digits * second.digits, exponent: first.exponent + second.exponent };
}

export function convertExchangeAmount(
  amount: string,
  rate: number | null,
  from: "buy" | "sell",
): number | null {
  const quantity = Number(amount);
  if (rate === null || !Number.isFinite(quantity) || quantity <= 0) return null;

  const converted = from === "buy" ? quantity * rate : quantity / rate;
  return Number.isFinite(converted) && converted > 0 ? converted : null;
}

const exchangeDecimal = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 7,
  useGrouping: false,
});

export function formatExchangeNumber(value: number): string {
  if (value < 0.000001 || value >= 1e9) return value.toExponential(6).replace(/\.?0+e/, "e");
  return exchangeDecimal.format(value);
}

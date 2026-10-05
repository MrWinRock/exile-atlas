import { compareExchangePair, type ExchangeComparison, type Market } from "./currency";

export type CurrencySnapshot = { hour: number; markets: Market[] };
export type CurrencyMarketRow = {
  itemId: string;
  quoteId: string;
  low: number | null;
  high: number | null;
  stock: number | null;
  volume: number;
  history: { hour: number; price: number }[];
  change: number | null;
};

const automaticQuotes = [
  "Metadata/Items/Currency/CurrencyModValues",
  "Metadata/Items/Currency/CurrencyRerollRare",
  "Metadata/Items/Currency/CurrencyAddModToRare",
  "Metadata/Items/Currency/CurrencyRemoveMod",
];

function pairKey(a: string, b: string): string {
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}

function indexMarkets(markets: Market[], league: string): Map<string, Market> {
  const index = new Map<string, Market>();
  for (const market of markets) {
    if (market.league !== league) continue;
    const key = pairKey(market.baseId, market.quoteId);
    if (!index.has(key)) index.set(key, market);
  }
  return index;
}

function compareIndexedPair(
  index: Map<string, Market>,
  itemId: string,
  quoteId: string,
  league: string,
): ExchangeComparison | null {
  const market = index.get(pairKey(itemId, quoteId));
  return market ? compareExchangePair([market], itemId, quoteId, league) : null;
}

function representativePrice(pair: ExchangeComparison | null): number | null {
  if (!pair) return null;
  if (pair.low !== null && pair.high !== null) return pair.low / 2 + pair.high / 2;
  return pair.low ?? pair.high;
}

export function buildCurrencyMarketRows(
  markets: Market[],
  snapshots: CurrencySnapshot[],
  league: string,
  quoteId: string,
  hour: number,
): CurrencyMarketRow[] {
  const current = indexMarkets(markets, league);
  const itemIds = new Set<string>();
  for (const market of current.values()) {
    itemIds.add(market.baseId);
    itemIds.add(market.quoteId);
  }
  if (quoteId) itemIds.delete(quoteId);

  // A duplicate hour is one snapshot, and the displayed digest is authoritative.
  const snapshotsByHour = new Map<number, Map<string, Market>>();
  for (const snapshot of snapshots) {
    if (!Number.isFinite(snapshot.hour) || snapshot.hour > hour) continue;
    snapshotsByHour.set(snapshot.hour, indexMarkets(snapshot.markets, league));
  }
  snapshotsByHour.set(hour, current);
  const historyIndexes = [...snapshotsByHour].sort(([a], [b]) => a - b);

  return [...itemIds].map((itemId): CurrencyMarketRow => {
    let selectedQuote = quoteId;
    let pair = quoteId ? compareIndexedPair(current, itemId, quoteId, league) : null;
    if (!quoteId) {
      let firstValid: { quoteId: string; pair: ExchangeComparison } | null = null;
      for (const candidate of automaticQuotes) {
        if (candidate === itemId) continue;
        const candidatePair = compareIndexedPair(current, itemId, candidate, league);
        const price = representativePrice(candidatePair);
        if (price === null || !candidatePair) continue;
        firstValid ??= { quoteId: candidate, pair: candidatePair };
        if (price >= 1) {
          selectedQuote = candidate;
          pair = candidatePair;
          break;
        }
      }
      if (!pair && firstValid) {
        selectedQuote = firstValid.quoteId;
        pair = firstValid.pair;
      }
    }

    const history: CurrencyMarketRow["history"] = [];
    if (selectedQuote) {
      for (const [snapshotHour, snapshotIndex] of historyIndexes) {
        const price = representativePrice(
          compareIndexedPair(snapshotIndex, itemId, selectedQuote, league),
        );
        if (price !== null) history.push({ hour: snapshotHour, price });
      }
    }
    const oldest = history[0]?.price;
    const latest = history[history.length - 1]?.price;
    const change = history.length >= 2 && oldest > 0 ? ((latest - oldest) / oldest) * 100 : null;
    const stock = pair?.market.raw.highest_stock[itemId];
    return {
      itemId,
      quoteId: selectedQuote,
      low: pair?.low ?? null,
      high: pair?.high ?? null,
      stock: stock !== undefined && Number.isFinite(stock) && stock >= 0 ? stock : null,
      volume: pair?.buyVolume ?? 0,
      history,
      change: change !== null && Number.isFinite(change) ? change : null,
    };
  });
}

export function currencyMarketCategory(id: string, name: string, itemClass?: string): string {
  const value = `${id} ${name} ${itemClass ?? ""}`.toLowerCase();
  if (/uncut|unengraved/.test(value)) return "Uncut Gems";
  if (/\/gems?\//i.test(id) || /gem/i.test(itemClass ?? "")) return "Gems";
  if (/essence/.test(value)) return "Essences";
  if (/delirium|distilled|distill|affliction|simulacrum/.test(value)) return "Delirium";
  if (/breach/.test(value)) return "Breach";
  if (/abyss/.test(value)) return "Abyss";
  if (/atziri|temple|medallion|incursion/.test(value)) return "Atziri's Temple";
  if (/idol/.test(value)) return "Idols";
  if (/rune/.test(value)) return "Runes";
  if (/soul.?core/.test(value)) return "Soul Cores";
  if (/expedition|logbook|artifact|rerollcurrency/.test(value)) return "Expedition";
  if (/ritual|omen|audience.?with.?the.?king/.test(value)) return "Ritual";
  if (/fragment|splinter|ultimatum|trial.*key/.test(value)) return "Fragments";
  if (/currency/.test(value)) return "Currency";
  return "Other";
}

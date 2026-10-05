"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Bookmark, Search } from "lucide-react";
import { currencyName, type Market } from "@/lib/currency";
import {
  buildCurrencyMarketRows,
  currencyMarketCategory,
  type CurrencySnapshot,
} from "@/lib/currency-market";
import { ItemImage, useItemImages } from "./artwork";
import styles from "./currency-markets.module.css";

const categories = [
  "All items",
  "Currency",
  "Essences",
  "Delirium",
  "Breach",
  "Abyss",
  "Atziri's Temple",
  "Fragments",
  "Runes",
  "Ritual",
  "Soul Cores",
  "Idols",
  "Uncut Gems",
  "Expedition",
  "Gems",
  "Other",
];
const quotes = [
  { id: "", name: "Automatic", label: "ALL" },
  { id: "Metadata/Items/Currency/CurrencyAddModToRare", name: "Exalted Orb" },
  { id: "Metadata/Items/Currency/CurrencyRerollRare", name: "Chaos Orb" },
  { id: "Metadata/Items/Currency/CurrencyRemoveMod", name: "Orb of Annulment" },
  { id: "Metadata/Items/Currency/CurrencyModValues", name: "Divine Orb" },
];
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const small = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });
const percent = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
function number(value: number) {
  return value >= 1000 ? compact.format(value) : small.format(value);
}

const favoritesKey = "exile-atlas:currency-favorites";
const favoritesEvent = "exile-atlas:currency-favorites-changed";
let temporaryFavorites = "[]";
let preferTemporaryFavorites = false;
function favoriteSnapshot() {
  if (preferTemporaryFavorites) return temporaryFavorites;
  try {
    return window.localStorage.getItem(favoritesKey) ?? temporaryFavorites;
  } catch {
    return temporaryFavorites;
  }
}
function subscribeFavorites(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(favoritesEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(favoritesEvent, listener);
  };
}
function emptyFavorites() {
  return "[]";
}
function saveFavorites(entries: Set<string>) {
  temporaryFavorites = JSON.stringify([...entries]);
  try {
    window.localStorage.setItem(favoritesKey, temporaryFavorites);
    preferTemporaryFavorites = false;
  } catch {
    // Session favorites still work without browser storage.
    preferTemporaryFavorites = true;
  }
  window.dispatchEvent(new Event(favoritesEvent));
}

function Sparkline({
  points,
  name,
  change,
}: {
  points: { hour: number; price: number }[];
  name: string;
  change: number | null;
}) {
  if (points.length < 2)
    return (
      <span className={styles.noHistory} title="At least two collected hours are needed">
        —
      </span>
    );
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const start = points[0].hour;
  const duration = points[points.length - 1].hour - start;
  const path = points
    .map(
      (p) =>
        `${2 + ((p.hour - start) / duration) * 76},${max === min ? 16 : 28 - ((p.price - min) / (max - min)) * 24}`,
    )
    .join(" ");
  return (
    <svg
      className={`${styles.sparkline} ${change != null && change < 0 ? styles.negative : styles.positive}`}
      viewBox="0 0 80 32"
      role="img"
      aria-label={`Collected price history for ${name}`}
    >
      <title>Hourly price range midpoints · {points.length} collected hours</title>
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CurrencyMarkets({
  markets,
  snapshots,
  hour,
  onExport,
}: {
  markets: Market[];
  snapshots: CurrencySnapshot[];
  hour: number;
  onExport: () => void;
}) {
  const { find } = useItemImages();
  const [selectedLeague, setLeague] = useState("");
  const [quoteId, setQuote] = useState("");
  const [category, setCategory] = useState("Currency");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"price" | "stock" | "name">("price");
  const [descending, setDescending] = useState(true);
  const rawFavorites = useSyncExternalStore(subscribeFavorites, favoriteSnapshot, emptyFavorites);
  const favorites = useMemo(() => {
    try {
      const entries: unknown = JSON.parse(rawFavorites);
      return new Set<string>(
        Array.isArray(entries)
          ? entries.filter((entry): entry is string => typeof entry === "string")
          : [],
      );
    } catch {
      return new Set<string>();
    }
  }, [rawFavorites]);
  function toggleFavorite(id: string) {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveFavorites(next);
  }
  const leagues = useMemo(() => [...new Set(markets.map((m) => m.league))].sort(), [markets]);
  const defaultLeague = useMemo(
    () =>
      markets.reduce<Market | undefined>(
        (best, row) => (!best || row.baseVolume > best.baseVolume ? row : best),
        undefined,
      )?.league ?? "",
    [markets],
  );
  const league = selectedLeague || defaultLeague;
  const rows = useMemo(() => {
    const names = new Map<string, string>();
    for (const market of markets) {
      names.set(market.baseId, market.base);
      names.set(market.quoteId, market.quote);
    }
    const divineId = "Metadata/Items/Currency/CurrencyModValues";
    const sortPrices = new Map(
      buildCurrencyMarketRows(markets, [], league, quoteId || divineId, hour).map((row) => [
        row.itemId,
        row.low,
      ]),
    );
    if (!quoteId) sortPrices.set(divineId, 1);
    return buildCurrencyMarketRows(markets, snapshots, league, quoteId, hour).map((row) => {
      const item = find(row.itemId);
      const name = item?.name ?? names.get(row.itemId) ?? currencyName(row.itemId);
      return {
        ...row,
        name,
        icon: item?.icon,
        category: currencyMarketCategory(row.itemId, name, item?.itemClass),
        sortPrice: sortPrices.get(row.itemId) ?? null,
      };
    });
  }, [markets, snapshots, league, quoteId, hour, find]);
  const availableCategories = categories.filter(
    (name) => name === "All items" || rows.some((row) => row.category === name),
  );
  const visible = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (category === "All items" ||
              (category === "Favorites" ? favorites.has(row.itemId) : row.category === category)) &&
            `${row.name} ${row.itemId}`.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .sort((a, b) => {
          if (sort === "name") return (descending ? -1 : 1) * a.name.localeCompare(b.name);
          const av = sort === "price" ? a.sortPrice : a.stock,
            bv = sort === "price" ? b.sortPrice : b.stock;
          if (av == null) return bv == null ? a.name.localeCompare(b.name) : 1;
          if (bv == null) return -1;
          return (descending ? -1 : 1) * (av - bv) || a.name.localeCompare(b.name);
        }),
    [rows, category, favorites, search, sort, descending],
  );
  function sortBy(next: typeof sort) {
    if (sort === next) setDescending(!descending);
    else {
      setSort(next);
      setDescending(next !== "name");
    }
  }
  const timestamp = new Date(hour * 1000).toISOString().slice(0, 16).replace("T", " ");
  return (
    <section className={`panel ${styles.panel}`} aria-label="Item markets">
      <nav className={styles.categories} aria-label="Market categories">
        <span className={styles.navLabel}>PERSONAL</span>
        <button
          type="button"
          aria-pressed={category === "Favorites"}
          onClick={() => setCategory("Favorites")}
        >
          <Bookmark size={15} />
          Favorites
        </button>
        <span className={styles.navLabel}>GENERAL</span>
        {availableCategories.map((name) => {
          const sample = rows.find((row) => row.category === name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              <span aria-hidden="true">
                {sample ? (
                  <ItemImage src={sample.icon} name="" size={22} />
                ) : (
                  <span className={styles.allIcon}>Ⅱ</span>
                )}
              </span>
              {name}
            </button>
          );
        })}
      </nav>
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h2>{category}</h2>
            <p>
              {league || "No league"} · {timestamp} UTC
            </p>
          </div>
          <div className={styles.quoteTabs} role="group" aria-label="Price currency">
            {quotes.map((quote) => (
              <button
                key={quote.id}
                type="button"
                aria-label={quote.id ? `Price in ${quote.name}` : "Automatic price currency"}
                aria-pressed={quoteId === quote.id}
                title={quote.name}
                onClick={() => setQuote(quote.id)}
              >
                {quote.id ? (
                  <ItemImage src={find(quote.id)?.icon} name={quote.name} size={26} />
                ) : (
                  quote.label
                )}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.toolbar}>
          <label className={`search-field ${styles.search}`}>
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search market items"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Market league"
            value={league}
            disabled={!leagues.length}
            onChange={(e) => setLeague(e.target.value)}
          >
            {!league && <option value="">No leagues available</option>}
            {league && !leagues.includes(league) && (
              <option value={league}>{league} (no trades)</option>
            )}
            {leagues.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {(
                  [
                    ["name", "Item"],
                    ["price", "Price"],
                    ["stock", "Stock"],
                  ] as const
                ).map(([key, label]) => (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={sort === key ? (descending ? "descending" : "ascending") : "none"}
                  >
                    <button
                      type="button"
                      title={
                        key === "price" && !quoteId
                          ? "Sort by direct Divine Orb value"
                          : `Sort by ${label.toLowerCase()}`
                      }
                      onClick={() => sortBy(key)}
                    >
                      {label}
                      {sort === key &&
                        (descending ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                    </button>
                  </th>
                ))}
                <th scope="col">History</th>
                <th scope="col">
                  <span className={styles.actionsLabel}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 200).map((row) => {
                const quote = find(row.quoteId);
                const quoteName = quote?.name ?? currencyName(row.quoteId);
                const price =
                  row.low == null
                    ? "—"
                    : row.high == null || row.low === row.high
                      ? number(row.low)
                      : `${number(row.low)} – ${number(row.high)}`;
                return (
                  <tr key={row.itemId}>
                    <td>
                      <div className={styles.item}>
                        <span className={styles.art}>
                          <ItemImage src={row.icon} name={row.name} size={34} />
                        </span>
                        <strong title={row.itemId}>{row.name}</strong>
                      </div>
                    </td>
                    <td>
                      <div
                        className={styles.price}
                        title={
                          row.low == null
                            ? "No direct trades for this quote currency"
                            : `${row.low} – ${row.high} ${quoteName} per item`
                        }
                      >
                        <span data-testid="market-price">{price}</span>
                        {row.low != null && (
                          <ItemImage src={quote?.icon} name={quoteName} size={19} />
                        )}
                      </div>
                    </td>
                    <td
                      className={styles.stock}
                      title="Highest stock reported during this completed hour"
                    >
                      <span data-testid="market-stock">
                        {row.stock == null ? "—" : number(row.stock)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.history}>
                        <Sparkline points={row.history} name={row.name} change={row.change} />
                        <span
                          data-testid="market-change"
                          className={
                            row.change == null
                              ? styles.noHistory
                              : row.change < 0
                                ? styles.negative
                                : styles.positive
                          }
                          title="Change in the price range midpoint across collected hours"
                        >
                          {row.change == null ? "—" : `${percent.format(row.change)}%`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.favorite}
                        aria-label={`${favorites.has(row.itemId) ? "Unfavorite" : "Favorite"} ${row.name}`}
                        aria-pressed={favorites.has(row.itemId)}
                        onClick={() => toggleFavorite(row.itemId)}
                      >
                        <Bookmark
                          size={16}
                          fill={favorites.has(row.itemId) ? "currentColor" : "none"}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && <p className={styles.empty}>No items match these filters.</p>}
        </div>
        <div className={styles.footer}>
          <span>
            {Math.min(visible.length, 200)} of {visible.length} items · Completed-hour prices and
            peak stock. Trends use collected range midpoints.
            {!quoteId && " Automatic prices sort by direct Divine Orb value."}
          </span>
          <button type="button" onClick={onExport}>
            Export JSON
          </button>
        </div>
      </div>
    </section>
  );
}

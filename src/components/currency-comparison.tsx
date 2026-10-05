"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ChevronDown, Search, X } from "lucide-react";
import { compareExchangePair, currencyName, type Market } from "@/lib/currency";
import { ItemImage, useItemImages } from "./artwork";
import { Badge } from "./ui";
import styles from "./currency-comparison.module.css";

type ExchangeItem = { id: string; name: string; icon?: string };
type Side = "buy" | "sell";
const priceFormat = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 6 });

function formatRange(low: number, high: number) {
  return low === high
    ? priceFormat.format(low)
    : `${priceFormat.format(low)} – ${priceFormat.format(high)}`;
}

function ItemPicker({
  side,
  items,
  otherId,
  onSelect,
  onClose,
}: {
  side: Side;
  items: ExchangeItem[];
  otherId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const visible = items.filter((item) =>
    `${item.name} ${item.id}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    searchRef.current?.focus();
    return () => dialog?.close();
  }, []);
  function close() {
    dialogRef.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={dialogRef}
      className={styles.picker}
      aria-labelledby="exchange-picker-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className={styles.pickerContent}>
        <div className={styles.pickerHeader}>
          <h2 id="exchange-picker-title">Choose an item to {side}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close item selector"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            aria-label={`Search items to ${side}`}
            placeholder="Search items…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <p className={styles.pickerHint}>
          {visible.length} items in this digest · Select a different item for each side.
        </p>
        <div className={styles.itemList}>
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.name}
              disabled={item.id === otherId}
              onClick={() => {
                dialogRef.current?.close();
                onSelect(item.id);
              }}
            >
              <ItemImage src={item.icon} name={item.name} size={36} />
              <span>{item.name}</span>
            </button>
          ))}
          {!visible.length && <p className={styles.noResults}>No items match your search.</p>}
        </div>
      </div>
    </dialog>
  );
}

export function CurrencyComparison({ markets, hour }: { markets: Market[]; hour: number }) {
  const { find } = useItemImages();
  const [selection, setSelection] = useState({ buyId: "", sellId: "", league: "" });
  const [picker, setPicker] = useState<Side | null>(null);
  const [buyAmount, setBuyAmount] = useState("1");
  const { items, leagues, defaultMarket } = useMemo(() => {
    const unique = new Map<string, ExchangeItem>();
    for (const market of markets) {
      for (const [id, name] of [
        [market.baseId, market.base],
        [market.quoteId, market.quote],
      ]) {
        const artwork = find(id);
        unique.set(id, { id, name: artwork?.name ?? name, icon: artwork?.icon });
      }
    }
    return {
      items: [...unique.values()].sort((a, b) => a.name.localeCompare(b.name)),
      leagues: [...new Set(markets.map((market) => market.league))].sort(),
      defaultMarket: markets.reduce<Market | undefined>(
        (best, market) => (!best || market.baseVolume > best.baseVolume ? market : best),
        undefined,
      ),
    };
  }, [markets, find]);
  const league = selection.league || defaultMarket?.league || "";
  const buyId = selection.buyId || defaultMarket?.quoteId || "";
  const sellId = selection.sellId || defaultMarket?.baseId || "";
  const [buy, sell] = [buyId, sellId].map((id) => {
    if (!id) return undefined;
    const item = items.find((entry) => entry.id === id);
    const artwork = find(id);
    return item ?? { id, name: artwork?.name ?? currencyName(id), icon: artwork?.icon };
  });
  const comparison = compareExchangePair(markets, buyId, sellId, league);
  const timestamp = new Date(hour * 1000).toISOString().slice(0, 16).replace("T", " ");
  const price = comparison?.low == null ? null : formatRange(comparison.low, comparison.high!);
  const quantity = Number(buyAmount);
  const amountLow = comparison?.low == null ? null : comparison.low * quantity;
  const amountHigh = comparison?.high == null ? null : comparison.high * quantity;
  const sellAmount =
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    amountLow != null &&
    amountHigh != null &&
    Number.isFinite(amountLow) &&
    Number.isFinite(amountHigh)
      ? formatRange(amountLow, amountHigh)
      : "—";

  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="exchange-comparison-heading">
      <div className={styles.header}>
        <h2 id="exchange-comparison-heading">Compare an exchange</h2>
        <label className={styles.league}>
          <span>League</span>
          <select
            aria-label="Comparison league"
            value={league}
            disabled={!leagues.length}
            onChange={(event) => setSelection({ buyId, sellId, league: event.target.value })}
          >
            {!league && <option value="">No leagues available</option>}
            {league && !leagues.includes(league) && (
              <option value={league}>{league} (no trades)</option>
            )}
            {leagues.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.exchange}>
        {(["buy", "sell"] as const).map((side) => {
          const item = side === "buy" ? buy : sell;
          const volume = side === "buy" ? comparison?.buyVolume : comparison?.sellVolume;
          return (
            <div
              key={side}
              className={`${styles.slot} ${side === "buy" ? styles.buy : styles.sell}`}
            >
              <h3>{side === "buy" ? "I want to buy" : "I have to sell"}</h3>
              <div className={styles.itemRow}>
                <button
                  type="button"
                  className={styles.itemButton}
                  aria-label={`Item to ${side}: ${item?.name ?? "Choose an item"}`}
                  aria-haspopup="dialog"
                  disabled={!items.length}
                  onClick={() => {
                    setSelection({ buyId, sellId, league });
                    setPicker(side);
                  }}
                >
                  <span className={styles.icon}>
                    <ItemImage src={item?.icon} name={item?.name ?? "Item"} size={40} />
                  </span>
                  <span>{item?.name ?? "Choose an item"}</span>
                  <ChevronDown size={17} aria-hidden="true" />
                </button>
                {side === "buy" ? (
                  <input
                    className={styles.amount}
                    type="number"
                    aria-label="Amount to buy"
                    min="1"
                    step="1"
                    value={buyAmount}
                    onChange={(event) => setBuyAmount(event.target.value)}
                  />
                ) : (
                  <output
                    className={`${styles.amount} ${styles.sellAmount}`}
                    aria-label="Amount to sell"
                    data-testid="exchange-sell-amount"
                    aria-live="polite"
                  >
                    {sellAmount}
                  </output>
                )}
              </div>
              <div className={styles.volume}>
                <span>Traded this hour</span>
                <strong>{volume == null ? "—" : volume.toLocaleString()}</strong>
              </div>
            </div>
          );
        })}
        <div className={styles.market}>
          <span className={styles.resultLabel}>Market ratio</span>
          <strong data-testid="exchange-price" aria-live="polite">
            {price ? `1 : ${price}` : "—"}
          </strong>
          <button
            type="button"
            className={styles.swap}
            aria-label="Swap buy and sell items"
            title="Swap buy and sell items"
            disabled={!buyId || !sellId}
            onClick={() => setSelection({ buyId: sellId, sellId: buyId, league })}
          >
            <ArrowLeftRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {(!price || !comparison?.complete) && (
        <div className={styles.result} aria-live="polite" aria-atomic="true">
          <p>
            {price
              ? "Only one ratio was reported. The price range is incomplete."
              : !markets.length
                ? "No exchange items were reported in this digest."
                : !comparison
                  ? `No trades reported for this pair in ${league} during this hour.`
                  : "Price quantities are unavailable for this pair during this hour."}
          </p>
        </div>
      )}
      <div className={styles.footer}>
        <span>{timestamp} UTC · Completed hourly trades. Actual offers can change.</span>
        <Badge tone="amber">HOURLY HISTORY</Badge>
      </div>
      {picker && (
        <ItemPicker
          side={picker}
          items={items}
          otherId={picker === "buy" ? sellId : buyId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setSelection({
              buyId: picker === "buy" ? id : buyId,
              sellId: picker === "sell" ? id : sellId,
              league,
            });
            setPicker(null);
          }}
        />
      )}
    </section>
  );
}

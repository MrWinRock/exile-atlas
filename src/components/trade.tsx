"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookmarkPlus,
  ChevronDown,
  Copy,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { useTradeWorkspace } from "@/lib/trade-store";
import {
  buildTradeUrl,
  createTradeDraft,
  tradeSummary,
  validateTradeDraft,
  TRADE_FILTER_SECTIONS,
  TRADE_STATUS_OPTIONS,
  TRADE_STAT_GROUP_TYPES,
  type TradeDraft,
  type TradeFieldDefinition,
  type TradeRange,
  type TradeStatGroup,
} from "@/lib/trade-search";
import { ItemImage, useItemImages } from "./artwork";
import { TradeStatPicker } from "./trade-stat-picker";
import { Button, Field, Notice, PageTitle } from "./ui";
import styles from "./trade.module.css";

const emptyRange: TradeRange = { min: "", max: "" };

export function Trade() {
  const { draft, searches, setDraft, saveSearch, deleteSearch } = useTradeWorkspace();
  const catalogue = useItemImages();
  const currencies = useQuery({
    queryKey: ["currency"],
    queryFn: () => api<{ markets: { league: string }[] }>("currency"),
    staleTime: 3600000,
  });
  const [presetName, setPresetName] = useState("");
  const [message, setMessage] = useState("");
  const errors = useMemo(() => validateTradeDraft(draft), [draft]);
  const handoff = useQuery({
    queryKey: ["trade-handoff", draft],
    queryFn: () => buildTradeUrl(draft),
    enabled: !errors.length,
    retry: false,
    staleTime: Infinity,
  });
  const leagues = [
    ...new Set(["Standard", ...(currencies.data?.markets.map((market) => market.league) ?? [])]),
  ].sort();
  const names = [
    ...new Set(
      catalogue.data?.items.filter((item) => item.kind === "unique").map((item) => item.name) ?? [],
    ),
  ].sort();
  const bases = [
    ...new Set(
      catalogue.data?.items.filter((item) => item.kind === "base").map((item) => item.name) ?? [],
    ),
  ].sort();
  const image = catalogue.find(undefined, draft.name || draft.type);
  const summary = tradeSummary(draft);
  const hasManualFilters = TRADE_FILTER_SECTIONS.some((section) =>
    section.fields.some((field) => {
      const value = draft.fields[field.key];
      const active = typeof value === "string" ? !!value.trim() : !!(value?.min || value?.max);
      return (
        active &&
        (field.localOnly ||
          field.options?.some((option) => option.value === value && option.localOnly))
      );
    }),
  );
  const activeFields = Object.values(draft.fields).filter((value) =>
    typeof value === "string" ? !!value : !!(value.min || value.max),
  ).length;
  const activeStats = draft.statGroups
    .filter((group) => !group.disabled)
    .flatMap((group) => group.filters)
    .filter((stat) => !stat.disabled).length;

  function update<K extends keyof TradeDraft>(key: K, value: TradeDraft[K]) {
    setDraft({ ...draft, [key]: value });
    setMessage("");
  }
  function setField(key: string, value: string | TradeRange) {
    update("fields", { ...draft.fields, [key]: value });
  }
  function updateGroup(id: string, change: Partial<TradeStatGroup>) {
    update(
      "statGroups",
      draft.statGroups.map((group) => (group.id === id ? { ...group, ...change } : group)),
    );
  }
  async function copyFilters() {
    try {
      await navigator.clipboard.writeText(summary);
      setMessage("Search filters copied. You can also select the search summary below.");
    } catch {
      setMessage("Select and copy the search summary below.");
    }
  }

  function renderField(field: TradeFieldDefinition) {
    const key = field.key;
    const value = draft.fields[key];
    const manualOnly =
      field.localOnly ||
      field.options?.some((option) => option.value === value && option.localOnly);
    if (field.kind === "range") {
      const range = typeof value === "object" ? value : emptyRange;
      return (
        <div className={styles.filter} key={key}>
          <span className={styles.fieldName}>
            {field.label}
            {field.localOnly && <small>Apply on official site</small>}
          </span>
          <div className={styles.range}>
            <input
              aria-label={`${field.label} minimum`}
              type="number"
              step="any"
              placeholder="Min"
              value={range.min}
              onChange={(event) => setField(key, { ...range, min: event.target.value })}
            />
            <span aria-hidden="true">—</span>
            <input
              aria-label={`${field.label} maximum`}
              type="number"
              step="any"
              placeholder="Max"
              value={range.max}
              onChange={(event) => setField(key, { ...range, max: event.target.value })}
            />
          </div>
        </div>
      );
    }
    return (
      <label className={styles.filter} key={key}>
        <span className={styles.fieldName}>
          {field.label}
          {manualOnly && <small>Apply on official site</small>}
        </span>
        {field.kind === "select" ? (
          <select
            aria-label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => setField(key, event.target.value)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={field.label}
            placeholder="Any"
            value={typeof value === "string" ? value : ""}
            maxLength={300}
            onChange={(event) => setField(key, event.target.value)}
          />
        )}
      </label>
    );
  }

  return (
    <>
      <PageTitle
        eyebrow="TOOLS / ITEM TRADE"
        title="Find your next upgrade."
        description="Build your search, keep the filters that matter, and find matching listings on the official PoE2 trade site."
      />
      <div className={styles.layout}>
        <div className={styles.editor}>
          <section className={`panel ${styles.searchPanel}`} aria-label="Item search">
            <div className={styles.panelTitle}>
              <Search size={18} />
              <h2>Search items</h2>
              <span>PATH OF EXILE 2</span>
            </div>
            <div className={styles.itemSearch}>
              <Field label="Item name" hint="Unique or named item">
                <input
                  aria-label="Item name"
                  list="trade-item-names"
                  placeholder="e.g. Astramentis"
                  value={draft.name}
                  maxLength={200}
                  onChange={(event) => update("name", event.target.value)}
                />
                <datalist id="trade-item-names">
                  {names.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Base type" hint="Leave blank for any base">
                <input
                  aria-label="Base type"
                  list="trade-base-types"
                  placeholder="e.g. Amber Amulet"
                  value={draft.type}
                  maxLength={200}
                  onChange={(event) => update("type", event.target.value)}
                />
                <datalist id="trade-base-types">
                  {bases.map((base) => (
                    <option key={base} value={base} />
                  ))}
                </datalist>
              </Field>
            </div>
            <div className={styles.searchScope}>
              <Field label="League">
                <input
                  list="trade-leagues"
                  value={draft.league}
                  maxLength={200}
                  onChange={(event) => update("league", event.target.value)}
                />
                <datalist id="trade-leagues">
                  {leagues.map((league) => (
                    <option key={league} value={league} />
                  ))}
                </datalist>
              </Field>
              <Field label="Seller availability">
                <select
                  value={draft.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  {TRADE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
          <div className={styles.filtersTitle}>
            <SlidersHorizontal size={16} />
            <h2>Search filters</h2>
            <span>{activeFields + activeStats} active</span>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft({ ...createTradeDraft(), league: draft.league });
                setMessage("");
              }}
            >
              Clear filters
            </Button>
          </div>
          <div className={styles.filterSections}>
            {TRADE_FILTER_SECTIONS.map((section) => {
              const count = section.fields.filter((field) => {
                const value = draft.fields[field.key];
                return typeof value === "string" ? !!value : !!(value?.min || value?.max);
              }).length;
              return (
                <details
                  className={`panel ${styles.filterSection}`}
                  key={section.key}
                  open={section.key === "type_filters" || section.key === "trade_filters"}
                >
                  <summary>
                    <span>{section.label}</span>
                    <span className={styles.sectionCount}>{count || "Any"}</span>
                    <ChevronDown size={15} />
                  </summary>
                  <div className={styles.fieldGrid}>
                    {section.fields.map((field) => renderField(field))}
                  </div>
                </details>
              );
            })}
          </div>
          <section className={`panel ${styles.stats}`} aria-label="Stat filters">
            <div className={styles.panelTitle}>
              <SlidersHorizontal size={18} />
              <h2>Stat Filters</h2>
              <span>{activeStats} ACTIVE</span>
            </div>
            {draft.statGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className={`${styles.statGroup} ${group.disabled ? styles.disabled : ""}`}
              >
                <div className={styles.groupToolbar}>
                  <label className={styles.enable}>
                    <input
                      type="checkbox"
                      checked={!group.disabled}
                      onChange={(event) =>
                        updateGroup(group.id, { disabled: !event.target.checked })
                      }
                      aria-label={`Enable stat group ${groupIndex + 1}`}
                    />
                    <span>Group {groupIndex + 1}</span>
                  </label>
                  <select
                    aria-label={`Stat group ${groupIndex + 1} match`}
                    value={group.type}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        type: event.target.value as TradeStatGroup["type"],
                        min: ["count", "weight"].includes(event.target.value) ? group.min : "",
                        max: ["count", "weight"].includes(event.target.value) ? group.max : "",
                        filters: group.filters.map((stat) => ({
                          ...stat,
                          weight: event.target.value === "weight" ? stat.weight : "",
                        })),
                      })
                    }
                  >
                    {TRADE_STAT_GROUP_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {["count", "weight"].includes(group.type) && (
                    <div className={styles.groupRange}>
                      <input
                        aria-label={`Stat group ${groupIndex + 1} minimum`}
                        type="number"
                        step="any"
                        placeholder="Min"
                        value={group.min}
                        onChange={(event) => updateGroup(group.id, { min: event.target.value })}
                      />
                      <input
                        aria-label={`Stat group ${groupIndex + 1} maximum`}
                        type="number"
                        step="any"
                        placeholder="Max"
                        value={group.max}
                        onChange={(event) => updateGroup(group.id, { max: event.target.value })}
                      />
                    </div>
                  )}
                  {draft.statGroups.length > 1 && (
                    <button
                      className="icon-button"
                      aria-label={`Remove stat group ${groupIndex + 1}`}
                      onClick={() =>
                        update(
                          "statGroups",
                          draft.statGroups.filter((item) => item.id !== group.id),
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                {group.filters.map((stat, index) => (
                  <div
                    className={`${styles.statRow} ${stat.disabled ? styles.disabled : ""}`}
                    key={`${stat.id}-${index}`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Enable ${stat.label}`}
                      checked={!stat.disabled}
                      onChange={(event) =>
                        updateGroup(group.id, {
                          filters: group.filters.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, disabled: !event.target.checked }
                              : item,
                          ),
                        })
                      }
                    />
                    <div className={styles.statLabel}>
                      {stat.label}
                      <small>{stat.id.split(".")[0]}</small>
                    </div>
                    <div className={styles.range}>
                      <input
                        aria-label={`${stat.label} minimum`}
                        type="number"
                        step="any"
                        placeholder="Min"
                        value={stat.min}
                        onChange={(event) =>
                          updateGroup(group.id, {
                            filters: group.filters.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, min: event.target.value } : item,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label={`${stat.label} maximum`}
                        type="number"
                        step="any"
                        placeholder="Max"
                        value={stat.max}
                        onChange={(event) =>
                          updateGroup(group.id, {
                            filters: group.filters.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, max: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    </div>
                    {group.type === "weight" && (
                      <input
                        className={styles.weight}
                        aria-label={`${stat.label} weight`}
                        type="number"
                        step="any"
                        placeholder="Weight"
                        value={stat.weight ?? ""}
                        onChange={(event) =>
                          updateGroup(group.id, {
                            filters: group.filters.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, weight: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Remove ${stat.label}`}
                      onClick={() =>
                        updateGroup(group.id, {
                          filters: group.filters.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                {!group.filters.length && (
                  <p className={styles.statHint}>
                    Choose a modifier, then set its minimum or maximum roll.
                  </p>
                )}
                <TradeStatPicker
                  disabled={group.filters.length >= 100}
                  onSelect={(stat) =>
                    updateGroup(group.id, {
                      filters: [
                        ...group.filters,
                        { id: stat.id, label: stat.text, min: "", max: "", disabled: false },
                      ],
                    })
                  }
                />
              </div>
            ))}
            <Button
              variant="ghost"
              disabled={draft.statGroups.length >= 10}
              onClick={() =>
                update("statGroups", [
                  ...draft.statGroups,
                  {
                    id: crypto.randomUUID(),
                    type: "and",
                    min: "",
                    max: "",
                    disabled: false,
                    filters: [],
                  },
                ])
              }
            >
              <Plus size={15} />
              Add stat group
            </Button>
          </section>
        </div>
        <aside className={styles.sidebar}>
          <section className={`panel ${styles.searchBrief}`} aria-label="Your search">
            <div className={styles.briefItem}>
              <ItemImage
                name={draft.name || draft.type || "Any item"}
                src={image?.icon}
                size={56}
              />
              <div>
                <small>YOUR NEXT UPGRADE</small>
                <h2>{draft.name || draft.type || "Any item"}</h2>
                <span>{draft.league || "Choose a league"}</span>
              </div>
            </div>
            <div className={styles.criteriaCount}>
              <span>
                <strong>{activeFields}</strong> filters
              </span>
              <span>
                <strong>{activeStats}</strong> stats
              </span>
              <span>PoE2</span>
            </div>
            {errors.length > 0 && <Notice error>{errors.join(" ")}</Notice>}
            {handoff.error && !errors.length && <Notice error>{handoff.error.message}</Notice>}
            {!errors.length && handoff.data ? (
              <a
                className={`button primary ${styles.searchButton}`}
                href={handoff.data}
                target="_blank"
                rel="noreferrer"
              >
                Search on official trade
                <ArrowUpRight size={16} />
              </a>
            ) : (
              <Button className={styles.searchButton} disabled>
                Search on official trade
                <ArrowUpRight size={16} />
              </Button>
            )}
            {hasManualFilters && (
              <a
                className={`button secondary ${styles.searchButton}`}
                href={`https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(draft.league.trim() || "Standard")}`}
                target="_blank"
                rel="noreferrer"
              >
                Open official trade to apply manually
                <ArrowUpRight size={16} />
              </a>
            )}
            <p className={styles.handoffNote}>
              Listings and seller contact open on the official trade site. Sign in there with your
              GGG account.
            </p>
            <Button
              variant="secondary"
              className={styles.searchButton}
              onClick={() => void copyFilters()}
            >
              <Copy size={15} />
              Copy filters
            </Button>
            {message && (
              <p className={styles.message} role="status">
                {message}
              </p>
            )}
            <details className={styles.summary}>
              <summary>
                Search summary
                <ChevronDown size={13} />
              </summary>
              <pre>{summary}</pre>
            </details>
          </section>
          <section className={`panel ${styles.saved}`} aria-label="Saved trade searches">
            <div className={styles.panelTitle}>
              <BookmarkPlus size={17} />
              <h2>Saved searches</h2>
              <span>{searches.length}</span>
            </div>
            <Field label="Search name">
              <input
                placeholder="e.g. Levelling amulet"
                maxLength={120}
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
              />
            </Field>
            <Button
              variant="secondary"
              className={styles.searchButton}
              disabled={!presetName.trim()}
              onClick={() => {
                saveSearch(presetName);
                setMessage(`Saved ${presetName.trim()} in this browser.`);
                setPresetName("");
              }}
            >
              <BookmarkPlus size={15} />
              Save search
            </Button>
            {!searches.length && (
              <p className={styles.statHint}>
                Save your filters here and return to them when your budget changes.
              </p>
            )}
            <div className={styles.savedList}>
              {searches.map((search) => (
                <div key={search.id} className={styles.savedRow}>
                  <button
                    aria-label={`Load ${search.name}`}
                    onClick={() => {
                      setDraft(structuredClone(search.draft));
                      setMessage(`Loaded ${search.name}.`);
                    }}
                  >
                    <strong>{search.name}</strong>
                    <small>
                      {search.draft.league} · {search.draft.name || search.draft.type || "Any item"}
                    </small>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${search.name}`}
                    onClick={() => deleteSearch(search.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p className={styles.browserNote}>Drafts and saved searches stay in this browser.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

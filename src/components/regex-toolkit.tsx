"use client";
import { useEffect, useState } from "react";
import {
  Copy,
  Bookmark,
  RotateCcw,
  ArrowUpRight,
  Regex,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  REGEX_CATEGORIES,
  REGEX_MODIFIERS,
  REGEX_PROPERTIES,
  REGEX_SOURCE,
} from "@/lib/regex-catalogue";
import { compileRegexSearch } from "@/lib/regex-search";
import { createRegexDraft, type ModifierSelection, type RegexCategory } from "@/lib/regex-schema";
import { useRegexWorkspace } from "@/lib/regex-store";
import { Badge, Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
import { RegexPresets } from "./regex-presets";
import { RegexItemTester } from "./regex-item-tester";
import { RegexTradePreview } from "./regex-trade-preview";
import styles from "./regex-toolkit.module.css";
export function RegexToolkit() {
  const store = useRegexWorkspace(),
    [search, setSearch] = useState(""),
    [name, setName] = useState(""),
    [editedId, setEditedId] = useState<string>(),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false),
    [showOptions, setShowOptions] = useState(false),
    [live, setLive] = useState("");
  const category: RegexCategory = store.activeTab === "presets" ? "waystone" : store.activeTab,
    draft = store.drafts[category],
    compiled = compileRegexSearch(draft);
  const announcement = compiled.errors.length
    ? compiled.errors.join(" ")
    : `Search: ${compiled.length} of ${compiled.limit} characters.`;
  const options = REGEX_MODIFIERS.filter(
    (m) => m.categories.includes(category) && m.label.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    const timer = setTimeout(() => setLive(announcement), 250);
    return () => clearTimeout(timer);
  }, [announcement]);
  function selectTab(tab: RegexCategory | "presets") {
    store.setActiveTab(tab);
    setSearch("");
    setMessage("");
    setEditedId(undefined);
    setName("");
  }
  function chooseModifier(id: string, mode: string) {
    const old = [...draft.wanted, ...draft.unwanted].find((s) => s.id === id) ?? {
      id,
      min: "",
      max: "",
    };
    store.setDraft({
      ...draft,
      wanted: [...draft.wanted.filter((m) => m.id !== id), ...(mode === "want" ? [old] : [])],
      unwanted: [
        ...draft.unwanted.filter((m) => m.id !== id),
        ...(mode === "exclude" ? [old] : []),
      ],
    });
  }
  function setRange(id: string, key: "min" | "max", value: string) {
    const change = (selections: ModifierSelection[]) =>
      selections.map((m) => (m.id === id ? { ...m, [key]: value } : m));
    store.setDraft({ ...draft, wanted: change(draft.wanted), unwanted: change(draft.unwanted) });
  }
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE / SEARCH TOOLKIT"
        title="Find what’s worth keeping."
        description="Build an in-game search, check an item, and keep your best searches close."
        action={<Badge tone="amber">ENGLISH · LOCAL</Badge>}
      />
      <div className={styles.ribbon}>
        <Regex size={20} />
        <span>
          Choose your criteria. Copy the search into an in-game stash or vendor search box.
        </span>
        <a href="https://poe2.re/" target="_blank" rel="noreferrer">
          Inspired by poe2.re <ArrowUpRight size={13} />
        </a>
      </div>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Search generators"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          const buttons = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
          );
          const i = buttons.indexOf(e.target as HTMLButtonElement);
          if (i < 0) return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next].click();
          buttons[next].focus();
        }}
      >
        {[
          ...REGEX_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
          { id: "presets" as const, label: `Presets (${store.presets.length})` },
        ].map((c) => (
          <button
            role="tab"
            key={c.id}
            id={`tab-${c.id}`}
            aria-selected={store.activeTab === c.id}
            aria-controls="regex-panel"
            tabIndex={store.activeTab === c.id ? 0 : -1}
            onClick={() => selectTab(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {store.warning && <Notice error>{store.warning}</Notice>}
      <div id="regex-panel" role="tabpanel" aria-labelledby={`tab-${store.activeTab}`}>
        {store.activeTab === "presets" ? (
          <RegexPresets
            onLoad={(p) => {
              store.loadPreset(p.id);
              setEditedId(p.id);
              setName(p.name);
              setMessage("Preset loaded. Update it to save your changes.");
            }}
          />
        ) : (
          <div className={styles.workspace}>
            <div className={styles.controls}>
              <section className="panel">
                <SectionHeader
                  title="Narrow your search"
                  aside={
                    <span className="muted">
                      {REGEX_CATEGORIES.find((c) => c.id === category)?.label}
                    </span>
                  }
                />
                <div className={styles.properties}>
                  {REGEX_PROPERTIES.filter((p) => p.categories.includes(category)).map((p) => {
                    const value = draft.properties[p.id] ?? "";
                    if (p.kind === "range")
                      return (
                        <fieldset className={styles.rangeField} key={p.id}>
                          <legend>{p.label}</legend>
                          <div className={styles.range}>
                            <input
                              aria-label={`${p.label} minimum`}
                              placeholder="Min"
                              inputMode="numeric"
                              value={typeof value === "string" ? "" : value.min}
                              onChange={(e) =>
                                store.setDraft({
                                  ...draft,
                                  properties: {
                                    ...draft.properties,
                                    [p.id]: {
                                      min: e.target.value,
                                      max: typeof value === "string" ? "" : value.max,
                                    },
                                  },
                                })
                              }
                            />
                            <span>to</span>
                            <input
                              aria-label={`${p.label} maximum`}
                              placeholder="Max"
                              inputMode="numeric"
                              value={typeof value === "string" ? "" : value.max}
                              onChange={(e) =>
                                store.setDraft({
                                  ...draft,
                                  properties: {
                                    ...draft.properties,
                                    [p.id]: {
                                      min: typeof value === "string" ? "" : value.min,
                                      max: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        </fieldset>
                      );
                    return (
                      <Field key={p.id} label={p.label}>
                        {p.kind === "text" ? (
                          <input
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) =>
                              store.setDraft({
                                ...draft,
                                properties: { ...draft.properties, [p.id]: e.target.value },
                              })
                            }
                            placeholder="Any item"
                          />
                        ) : (
                          <select
                            aria-label={p.label}
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) =>
                              store.setDraft({
                                ...draft,
                                properties: { ...draft.properties, [p.id]: e.target.value },
                              })
                            }
                          >
                            <option value="">Any</option>
                            {p.options?.map((o) => (
                              <option value={o.value} key={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    );
                  })}
                </div>
                <Field
                  label="Additional text"
                  hint="Literal text, safely escaped. It must also appear on the item."
                >
                  <input
                    aria-label="Additional text"
                    value={draft.text}
                    maxLength={1000}
                    onChange={(e) => store.setDraft({ ...draft, text: e.target.value })}
                    placeholder="An item name or extra search text"
                  />
                </Field>
              </section>
              <section className="panel">
                <SectionHeader title="Modifiers to keep. Modifiers to avoid." />
                <div className={styles.modifierTools}>
                  <Field label="Search modifiers">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search effects…"
                    />
                  </Field>
                  <Field label="Match wanted modifiers">
                    <select
                      value={draft.match}
                      onChange={(e) =>
                        store.setDraft({ ...draft, match: e.target.value as "any" | "all" })
                      }
                    >
                      <option value="any">Any wanted modifier</option>
                      <option value="all">All wanted modifiers</option>
                    </select>
                  </Field>
                </div>
                <div className={styles.modifiers}>
                  {options.map((m) => {
                    const selected = [...draft.wanted, ...draft.unwanted].find(
                      (s) => s.id === m.id,
                    );
                    const mode = draft.wanted.some((s) => s.id === m.id)
                      ? "want"
                      : draft.unwanted.some((s) => s.id === m.id)
                        ? "exclude"
                        : "ignore";
                    return (
                      <div
                        key={m.id}
                        className={`${styles.modifier} ${mode === "want" ? styles.wanted : mode === "exclude" ? styles.excluded : ""}`}
                      >
                        <div>
                          <span>{m.label}</span>
                          <small>
                            {m.numericDomain ? "Optional inclusive range" : "Presence only"}
                          </small>
                        </div>
                        <select
                          aria-label={`Action for ${m.label}`}
                          value={mode}
                          onChange={(e) => chooseModifier(m.id, e.target.value)}
                        >
                          <option value="ignore">Ignore</option>
                          <option value="want">Want</option>
                          <option value="exclude">Avoid</option>
                        </select>
                        {selected && m.numericDomain && (
                          <div className={styles.modRange}>
                            <input
                              aria-label={`${m.label} minimum`}
                              placeholder="Min"
                              inputMode="numeric"
                              value={selected.min}
                              onChange={(e) => setRange(m.id, "min", e.target.value)}
                            />
                            <span>to</span>
                            <input
                              aria-label={`${m.label} maximum`}
                              placeholder="Max"
                              inputMode="numeric"
                              value={selected.max}
                              onChange={(e) => setRange(m.id, "max", e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!options.length && <p className="muted">No modifiers match your search.</p>}
                </div>
                {[...draft.wanted, ...draft.unwanted]
                  .filter(
                    (m) =>
                      !REGEX_MODIFIERS.some(
                        (d) => d.id === m.id && d.categories.includes(category),
                      ),
                  )
                  .map((m) => (
                    <Notice error key={m.id}>
                      Unsupported criterion: {m.id}{" "}
                      <Button variant="ghost" onClick={() => chooseModifier(m.id, "ignore")}>
                        Remove criterion
                      </Button>
                    </Notice>
                  ))}
                {Object.entries(draft.properties)
                  .filter(
                    ([id]) =>
                      !REGEX_PROPERTIES.some((p) => p.id === id && p.categories.includes(category)),
                  )
                  .map(([id, value]) => (
                    <Notice error key={id}>
                      Unsupported property: {id} ·{" "}
                      {typeof value === "string"
                        ? value
                        : `${value.min || "Any"} to ${value.max || "Any"}`}
                      <Button
                        variant="ghost"
                        aria-label={`Remove property ${id}`}
                        onClick={() => {
                          const properties = { ...draft.properties };
                          delete properties[id];
                          store.setDraft({ ...draft, properties });
                        }}
                      >
                        Remove property
                      </Button>
                    </Notice>
                  ))}
              </section>
            </div>
            <aside className={styles.outputRail}>
              <section className={`panel ${styles.output}`} aria-label="Floating search panel">
                <div className={styles.outputHeading}>
                  <span className="eyebrow">YOUR IN-GAME SEARCH</span>
                  <span className={compiled.length > compiled.limit ? styles.fail : "muted"}>
                    {compiled.length} / {compiled.limit}
                  </span>
                  <button
                    className={styles.optionsToggle}
                    aria-label={showOptions ? "Hide search options" : "Show search options"}
                    aria-expanded={showOptions}
                    aria-controls="search-options"
                    onClick={() => setShowOptions(!showOptions)}
                  >
                    Options {showOptions ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                  </button>
                </div>
                <textarea
                  aria-label="Generated search"
                  readOnly
                  value={compiled.text}
                  rows={2}
                  placeholder="Choose your first criterion…"
                />
                <span className={styles.srOnly} role="status" aria-live="polite">
                  {live}
                </span>
                <div className={styles.outputButtons}>
                  <Button
                    disabled={!compiled.copyable}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(compiled.text);
                        setMessage("Search copied.");
                      } catch {
                        setMessage(
                          "Copy failed. Select the generated search and copy it manually.",
                        );
                      }
                    }}
                  >
                    <Copy size={15} />
                    Copy search
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      store.setDraft(createRegexDraft(category));
                      setEditedId(undefined);
                      setName("");
                      setMessage("Current generator reset. Saved presets are kept.");
                    }}
                  >
                    <RotateCcw size={15} />
                    Reset
                  </Button>
                </div>
                <div className={styles.feedback}>
                  {compiled.errors.map((e) => (
                    <Notice error key={e}>
                      {e}
                    </Notice>
                  ))}
                  {compiled.length > compiled.limit && (
                    <Notice error>
                      Search exceeds the limit. Remove criteria to copy it; every condition is still
                      retained.
                    </Notice>
                  )}
                  {message && <Notice>{message}</Notice>}
                </div>
                <div id="search-options" className={styles.searchOptions} hidden={!showOptions}>
                  <Field label="Preset name">
                    <input
                      value={name}
                      maxLength={120}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Safe tier 15 maps"
                    />
                  </Field>
                  <div className={styles.outputButtons}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const r = store.savePreset(name, category);
                        setMessage(r.ok ? "Preset saved." : r.error!);
                      }}
                    >
                      <Bookmark size={15} />
                      Save preset
                    </Button>
                    {editedId && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const r = store.savePreset(name, category, editedId);
                          setMessage(r.ok ? "Preset updated." : r.error!);
                        }}
                      >
                        Update preset
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    disabled={!compiled.valid || !compiled.text}
                    onClick={() => setPreview(true)}
                  >
                    Prepare trade <ArrowUpRight size={15} />
                  </Button>
                  <p className={styles.source}>
                    Curated English snapshot · checked {REGEX_SOURCE.verified}.{" "}
                    <a href="/data/poe2-regex.NOTICE.md" target="_blank" rel="noreferrer">
                      Sources & limitations ↗
                    </a>
                  </p>
                </div>
              </section>
              <RegexItemTester draft={draft} />
            </aside>
          </div>
        )}
      </div>
      {preview && <RegexTradePreview draft={draft} onClose={() => setPreview(false)} />}
    </>
  );
}

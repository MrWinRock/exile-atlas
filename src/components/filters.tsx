"use client";

import { useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Coins,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FolderOpen,
  Gem,
  Layers3,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sword,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { api, useStatus } from "@/lib/client";
import { useWorkspace } from "@/lib/workspace-store";
import {
  applyFilterPreset,
  applyFilterTheme,
  defaultFilterSettings,
  evaluateFilterSample,
  filterCategories,
  filterThemes,
  generateFilter,
  getFilterStyle,
  normalizeFilterSettings,
  sampleFilterLoot,
  strictnessPresets,
  validateFilter,
  type FilterCategory,
  type FilterRuleStyle,
  type FilterSettings,
} from "@/lib/filter";
import { downloadFile } from "@/lib/build";
import { Badge, Button, Field, Notice, PageTitle } from "./ui";
import styles from "./filters.module.css";

const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), { ssr: false });
type Tab = "overview" | "customize" | "simulate" | "export";
type OnlineFilter = {
  id: string;
  filter_name: string;
  filter?: string;
  validation?: { valid: boolean };
};
const tabs = [
  { id: "overview", label: "Overview", icon: Layers3 },
  { id: "customize", label: "Customize", icon: SlidersHorizontal },
  { id: "simulate", label: "Simulate", icon: Sparkles },
  { id: "export", label: "Export", icon: ArrowDownToLine },
] as const;
const categoryIcons = {
  currency: Coins,
  unique: Sparkles,
  waystones: Layers3,
  gems: Gem,
  rare: Sword,
  magic: Sword,
  normal: Sword,
};
function builderText(settings: FilterSettings) {
  return generateFilter({ ...settings, name: settings.name.trim() || "Untitled filter" });
}

export function Filters() {
  const { data: status } = useStatus();
  const store = useWorkspace();
  const importInput = useRef<HTMLInputElement>(null);
  const documentVersion = useRef(0);
  const currentDraftId = useRef<string | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("overview");
  const [settings, setSettings] = useState<FilterSettings>(defaultFilterSettings);
  const [text, setText] = useState(() => generateFilter(defaultFilterSettings));
  const [custom, setCustom] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const [remoteId, setRemoteId] = useState<string>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [category, setCategory] = useState<FilterCategory>("currency");
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [generation, setGeneration] = useState(0);
  const validation = validateFilter(text);
  const canExport = validation.valid && !!settings.name.trim();
  const selected = filterCategories.find((entry) => entry.id === category)!;
  const ruleStyle = getFilterStyle(settings, category);
  const preset = strictnessPresets.find((entry) => entry.id === settings.strictness);
  const visibleSamples = sampleFilterLoot.filter(
    (item) => evaluateFilterSample(settings, item).visible,
  );
  const activeDraft = store.filters.find((entry) => entry.id === activeId);
  const saved =
    !!activeDraft &&
    activeDraft.text === text &&
    activeDraft.name === settings.name &&
    JSON.stringify(normalizeFilterSettings(activeDraft.settings)) === JSON.stringify(settings);
  const online = useQuery({
    queryKey: ["filters"],
    queryFn: () => api<{ filters: OnlineFilter[] }>("filters"),
    enabled: !!status?.connected,
  });

  function report(value: string, isError = false) {
    setMessage(value);
    setError(isError);
  }
  function selectDraft(id: string | undefined) {
    currentDraftId.current = id;
    setActiveId(id);
  }
  function changeSettings(next: FilterSettings) {
    if (loadingOnline) documentVersion.current++;
    setSettings(next);
    if (!custom) setText(builderText(next));
  }
  function editSource(value: string) {
    if (loadingOnline) documentVersion.current++;
    setText(value);
    setCustom(value !== builderText(settings));
  }
  function changeStyle(patch: Partial<FilterRuleStyle>) {
    if (custom) return;
    const next = { ...ruleStyle, ...patch };
    changeSettings({
      ...settings,
      ...(category === "rare" ? { rareColor: next.textColor } : {}),
      ...(category === "magic" ? { showMagic: next.visible } : {}),
      ...(category === "normal" ? { showNormal: next.visible } : {}),
      ...(category === "unique" ? { sounds: next.sound > 0 } : {}),
      styles: { ...settings.styles, [category]: next },
    });
  }
  function reset() {
    documentVersion.current++;
    setSettings(defaultFilterSettings);
    setText(generateFilter(defaultFilterSettings));
    setCustom(false);
    selectDraft(undefined);
    setRemoteId(undefined);
    setTab("overview");
    report("");
  }
  function openDraft(id: string) {
    const draft = store.filters.find((entry) => entry.id === id);
    if (!draft) return;
    documentVersion.current++;
    const loaded = { ...normalizeFilterSettings(draft.settings), name: draft.name };
    setSettings(loaded);
    setText(draft.text);
    setCustom(draft.text !== builderText(loaded));
    selectDraft(draft.id);
    setRemoteId(draft.remoteId);
    report("Saved filter opened.");
  }
  function save() {
    if (!canExport) return report(validation.issues.join(". ") || "Give your filter a name.", true);
    selectDraft(
      store.saveFilter({ name: settings.name.trim(), text, settings, remoteId }, activeId),
    );
    report("Filter draft saved in this browser.");
  }
  async function importFilter(file?: File) {
    if (!file) return;
    const version = ++documentVersion.current;
    try {
      if (file.size > 1_000_000) throw new Error("Filter must be smaller than 1 MB.");
      const imported = await file.text(),
        check = validateFilter(imported);
      if (version !== documentVersion.current) return;
      if (!check.valid) throw new Error(check.issues.join(". "));
      setText(imported);
      setSettings({
        ...defaultFilterSettings,
        name: file.name.replace(/\.filter$/i, "").slice(0, 120) || "Imported filter",
      });
      setCustom(true);
      selectDraft(undefined);
      setRemoteId(undefined);
      setTab("export");
      report("Filter imported. Your original rules are ready to edit, save, or download.");
    } catch (e) {
      if (version === documentVersion.current)
        report(e instanceof Error ? e.message : "Could not import filter.", true);
    }
  }
  async function sync() {
    if (!canExport || !status?.connected || syncing) return;
    const version = documentVersion.current;
    const draftBeforeSync = store.filters.find((draft) => draft.id === activeId);
    setSyncing(true);
    try {
      const result = await api<{ filter: OnlineFilter; error?: { message: string } }>(
        "filters" + (remoteId ? "/" + encodeURIComponent(remoteId) : ""),
        {
          method: "POST",
          body: JSON.stringify({ filter_name: settings.name.trim(), filter: text }),
        },
      );
      const targetId = version === documentVersion.current ? currentDraftId.current : activeId;
      const latestDraft = useWorkspace.getState().filters.find((draft) => draft.id === targetId);
      const savedId = store.saveFilter(
        latestDraft && latestDraft !== draftBeforeSync
          ? {
              name: latestDraft.name,
              text: latestDraft.text,
              settings: latestDraft.settings,
              remoteId: result.filter.id,
            }
          : { name: settings.name.trim(), text, settings, remoteId: result.filter.id },
        targetId,
      );
      void online.refetch();
      if (version !== documentVersion.current) return;
      setRemoteId(result.filter.id);
      selectDraft(savedId);
      if (result.filter.validation?.valid === false)
        report(
          "GGG saved the filter but its validation failed. Review its syntax before using it.",
          true,
        );
      else if (result.error) report(result.error.message, true);
      else if (result.filter.validation?.valid === true)
        report("Filter saved to GGG and checked against the current game version.");
      else report("Filter saved to GGG. Full validation was not returned.");
    } catch (e) {
      if (version === documentVersion.current)
        report(e instanceof Error ? e.message : "Sync failed.", true);
    } finally {
      setSyncing(false);
    }
  }
  async function openOnline(id: string) {
    const version = ++documentVersion.current;
    setLoadingOnline(true);
    try {
      const result = await api<{ filter: OnlineFilter }>("filters/" + encodeURIComponent(id));
      if (version !== documentVersion.current) return;
      if (typeof result.filter.filter !== "string")
        throw new Error("This online filter did not include its rules.");
      setText(result.filter.filter);
      setSettings({ ...defaultFilterSettings, name: result.filter.filter_name });
      setCustom(true);
      setRemoteId(id);
      selectDraft(undefined);
      setTab("export");
      report("Online PoE2 filter loaded. Sync will update this filter.");
    } catch (e) {
      if (version === documentVersion.current)
        report(e instanceof Error ? e.message : "Could not open filter.", true);
    } finally {
      setLoadingOnline(false);
    }
  }
  function editCategory(id: FilterCategory) {
    setCategory(id);
    setSearch("");
    setTab("customize");
  }
  function lootScene(simulator = false) {
    const pool = simulator
      ? sampleFilterLoot
      : sampleFilterLoot.filter((item) =>
          [
            "exalted",
            "divine",
            "goldrim",
            "waystone-15",
            "skill-gem",
            "expert-bow",
            "rare-boots",
            "magic-wand",
            "normal-helm",
          ].includes(item.id),
        );
    const rotated = [
      ...pool.slice(generation % pool.length),
      ...pool.slice(0, generation % pool.length),
    ];
    return (
      <div
        className={`${styles.ground} ${simulator ? styles.simulatorGround : ""}`}
        aria-label="Loot preview"
      >
        <div className={styles.groundCompass} aria-hidden="true">
          ✧
        </div>
        {custom ? (
          <div className={styles.customPreview}>
            <FileCode2 size={30} />
            <h3>Custom rules, your way.</h3>
            <p>
              The visual preview and simulator are available for filters made with the builder. Your
              custom rules are preserved in Export.
            </p>
            <Button variant="secondary" onClick={() => setTab("export")}>
              View filter rules <ArrowRight size={14} />
            </Button>
          </div>
        ) : (
          <div className={styles.lootScatter}>
            {rotated.map((item, index) => {
              const result = evaluateFilterSample(settings, item);
              if (!result.visible && !(simulator && showHidden)) return null;
              return (
                <button
                  key={item.id}
                  className={`${styles.lootItem} ${!result.visible ? styles.hiddenLoot : ""}`}
                  style={
                    {
                      color: result.style.textColor,
                      borderColor: result.style.borderColor,
                      backgroundColor: result.style.backgroundColor,
                      fontSize: Math.max(12, result.style.fontSize * 0.43),
                      "--loot-offset": `${[0, 14, -6, 22, -15, 8, -10][index % 7]}px`,
                    } as CSSProperties
                  }
                  title={`${item.name} · Item level ${item.itemLevel} · ${result.reason}. Click to customize.`}
                  onClick={() => editCategory(item.category)}
                >
                  {result.style.sound > 0 && result.visible && (
                    <span className={styles.lootDiamond} aria-hidden="true">
                      ◆
                    </span>
                  )}
                  {item.name}
                  {!result.visible && <EyeOff size={11} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
        {!custom && (
          <span className={styles.groundCaption}>
            ILLUSTRATIVE LOOT · CLICK A LABEL TO CUSTOMIZE
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <PageTitle
        eyebrow="TOOLS / LOOT FILTERS"
        title="Good loot. Less noise."
        description="A little less clutter. A lot more of what matters. Build a filter for your journey."
        action={
          <Button variant="secondary" onClick={reset}>
            <Plus size={15} />
            New filter
          </Button>
        }
      />
      <div className={styles.filterBar}>
        <div className={styles.filterIdentity}>
          <span className={styles.filterIcon}>
            <FileCode2 size={21} />
          </span>
          <label className={styles.nameField}>
            <span>YOUR FILTER</span>
            <input
              aria-label="Filter name"
              maxLength={120}
              value={settings.name}
              onChange={(e) => changeSettings({ ...settings, name: e.target.value })}
            />
          </label>
          <Badge tone="green">POE 2</Badge>
        </div>
        <div className={styles.filterTools}>
          <label className={styles.draftPicker}>
            <FolderOpen size={15} />
            <select
              aria-label="Saved filters"
              value={activeId ?? ""}
              onChange={(e) => openDraft(e.target.value)}
            >
              <option value="">
                My filters{store.filters.length ? ` (${store.filters.length})` : ""}
              </option>
              {store.filters.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="ghost" onClick={() => importInput.current?.click()}>
            <Upload size={14} />
            Import
          </Button>
          <input
            className={styles.fileInput}
            type="file"
            accept=".filter,text/plain"
            aria-label="Import .filter"
            ref={importInput}
            onChange={(e) => {
              void importFilter(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={save} disabled={!canExport}>
            <Save size={14} />
            Save draft
          </Button>
        </div>
      </div>
      <div className={styles.tabBar}>
        <div role="tablist" aria-label="Filter workflow" className={styles.tabs}>
          {tabs.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              id={`filter-tab-${id}`}
              role="tab"
              aria-label={label}
              aria-selected={tab === id}
              aria-controls="filter-tab-panel"
              tabIndex={tab === id ? 0 : -1}
              className={tab === id ? styles.activeTab : ""}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                setTab(tabs[next].id);
                e.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
              <small>0{index + 1}</small>
            </button>
          ))}
        </div>
        <span className={styles.saveState}>
          {saved ? <Check size={12} /> : <span className={styles.unsavedDot} />}
          {saved ? "Saved in browser" : "Unsaved changes"}
        </span>
      </div>
      {message && <Notice error={error}>{message}</Notice>}
      {custom && (
        <div className={styles.customNotice}>
          <Code2 size={17} />
          <div>
            <strong>Custom rules are active.</strong>
            <p>
              Builder controls are paused to preserve your edits. Replacing them starts from the
              builder settings shown here.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (loadingOnline) documentVersion.current++;
              setText(builderText(settings));
              setCustom(false);
              report("Custom rules replaced with the visual builder settings.");
            }}
          >
            Replace custom rules with builder
          </Button>
        </div>
      )}
      <div
        id="filter-tab-panel"
        role="tabpanel"
        aria-labelledby={`filter-tab-${tab}`}
        className={styles.tabPanel}
      >
        {tab === "overview" && (
          <>
            <div className={styles.overviewGrid}>
              <div className={styles.setupColumn}>
                <section className={styles.panel}>
                  <div className={styles.panelHeading}>
                    <span className={styles.step}>01</span>
                    <h2>Find your balance.</h2>
                    <SlidersHorizontal size={16} />
                  </div>
                  <p className={styles.panelDescription}>Choose how much makes it to the ground.</p>
                  <fieldset disabled={custom} className={styles.fieldset}>
                    <legend className={styles.srOnly}>Filter strictness</legend>
                    <div className={styles.strictnessTrack}>
                      {strictnessPresets.map((entry, index) => (
                        <button
                          key={entry.id}
                          aria-pressed={settings.strictness === entry.id}
                          aria-label={entry.label}
                          title={entry.description}
                          className={settings.strictness === entry.id ? styles.selectedPreset : ""}
                          onClick={() => changeSettings(applyFilterPreset(settings, entry.id))}
                        >
                          <span style={{ height: `${12 + index * 5}px` }} />
                          <small>{entry.label}</small>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className={styles.presetDetail}>
                    <div>
                      <strong>{preset?.label ?? "Custom"}</strong>
                      <Badge>
                        {settings.strictness === "regular" ? "A GOOD START" : "STRICTNESS"}
                      </Badge>
                    </div>
                    <p>{preset?.description ?? "Your own category settings."}</p>
                  </div>
                  <div className={styles.scaleLegend}>
                    <span>More drops</span>
                    <span>
                      Less clutter <ArrowRight size={11} />
                    </span>
                  </div>
                </section>
                <section className={styles.panel}>
                  <div className={styles.panelHeading}>
                    <span className={styles.step}>02</span>
                    <h2>Make it yours.</h2>
                    <Palette size={16} />
                  </div>
                  <p className={styles.panelDescription}>
                    A familiar palette, or a fresh perspective.
                  </p>
                  <fieldset disabled={custom} className={styles.fieldset}>
                    <legend className={styles.srOnly}>Color theme</legend>
                    <div className={styles.themes}>
                      {filterThemes.map((theme) => (
                        <button
                          key={theme.id}
                          aria-label={theme.label}
                          onClick={() => changeSettings(applyFilterTheme(settings, theme.id))}
                        >
                          <span className={styles.themeSwatches}>
                            {theme.colors.map((color, index) => (
                              <i key={index} style={{ background: color }} />
                            ))}
                          </span>
                          <span>{theme.label}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </section>
              </div>
              <section className={styles.previewPanel}>
                <div className={styles.previewHeading}>
                  <div>
                    <span className={styles.kicker}>A GLIMPSE OF YOUR NEXT DROP</span>
                    <h2>The ground, reimagined.</h2>
                  </div>
                  <Badge tone="green">LIVE PREVIEW</Badge>
                </div>
                {lootScene()}
                <div className={styles.previewFooter}>
                  <span>
                    <span className={styles.liveDot} />
                    Changes appear as you make them
                  </span>
                  <button onClick={() => setTab("simulate")}>
                    Open simulator <ArrowRight size={13} />
                  </button>
                </div>
                <div className={styles.previewStats}>
                  <div>
                    <strong>{filterCategories.length}</strong>
                    <span>ITEM CATEGORIES</span>
                  </div>
                  <div>
                    <strong>
                      {custom ? "—" : visibleSamples.length}
                      <small> / {sampleFilterLoot.length}</small>
                    </strong>
                    <span>SAMPLE DROPS SHOWN</span>
                  </div>
                  <div>
                    <strong>{custom ? "Custom" : (preset?.label ?? "Custom")}</strong>
                    <span>CURRENT STRICTNESS</span>
                  </div>
                </div>
              </section>
            </div>
            <div className={styles.nextSteps}>
              <button onClick={() => setTab("customize")} aria-label="Customize filter">
                <SlidersHorizontal size={20} />
                <span>
                  <strong>Every detail, your decision.</strong>
                  <small>Colors, sizes, sounds, and what stays visible.</small>
                </span>
                <span className={styles.cardAction}>
                  Customize filter <ArrowRight size={14} />
                </span>
              </button>
              <button onClick={() => setTab("simulate")} aria-label="Test in simulator">
                <Sparkles size={20} />
                <span>
                  <strong>Try it before the next map.</strong>
                  <small>Generate sample loot and see what gets through.</small>
                </span>
                <ArrowRight size={15} />
              </button>
              <button onClick={() => setTab("export")}>
                <Download size={20} />
                <span>
                  <strong>Ready for Wraeclast.</strong>
                  <small>Download your filter or sync it to your account.</small>
                </span>
                <ArrowRight size={15} />
              </button>
            </div>
            <p className={styles.attribution}>
              Inspired by the workflow of{" "}
              <a href="https://www.filterblade.xyz/?game=Poe2" target="_blank" rel="noreferrer">
                FilterBlade <ArrowRight size={10} />
              </a>
              . Built with Exile Atlas rules. Presets use item categories and levels, without live
              economy pricing.
            </p>
          </>
        )}
        {tab === "customize" && (
          <div className={styles.customizeGrid}>
            <aside className={styles.categoryPanel}>
              <div className={styles.categoryTitle}>
                <h2>Item categories</h2>
                <span>{filterCategories.length}</span>
              </div>
              <label className={styles.categorySearch}>
                <Search size={14} />
                <input
                  aria-label="Search categories"
                  placeholder="Find a category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className={styles.categoryList}>
                {filterCategories
                  .filter((entry) =>
                    `${entry.label} ${entry.description}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((entry) => {
                    const Icon = categoryIcons[entry.id],
                      appearance = getFilterStyle(settings, entry.id);
                    return (
                      <button
                        key={entry.id}
                        aria-label={entry.label}
                        aria-pressed={category === entry.id}
                        className={category === entry.id ? styles.activeCategory : ""}
                        onClick={() => setCategory(entry.id)}
                      >
                        <Icon size={16} style={{ color: appearance.textColor }} />
                        <span>{entry.label}</span>
                        {appearance.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    );
                  })}
              </div>
              {!filterCategories.some((entry) =>
                `${entry.label} ${entry.description}`.toLowerCase().includes(search.toLowerCase()),
              ) && <p className={styles.panelDescription}>No categories match your search.</p>}
              <div className={styles.categoryNote}>
                <ShieldCheck size={17} />
                <p>
                  Specific categories match before equipment rules. Unmatched items stay visible.
                </p>
              </div>
            </aside>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>{selected.label}</h2>
                <Badge>CATEGORY RULE</Badge>
              </div>
              <p className={styles.panelDescription}>{selected.description}</p>
              <fieldset disabled={custom} className={styles.fieldset}>
                <legend className={styles.srOnly}>{selected.label} appearance</legend>
                <label className={styles.visibilityToggle}>
                  <span>
                    <Eye size={17} />
                    <span>
                      <strong>Show {selected.label}</strong>
                      <small>
                        {ruleStyle.visible
                          ? "Included in your filter"
                          : "Hidden by this category rule"}
                      </small>
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={`Show ${selected.label}`}
                    checked={ruleStyle.visible}
                    onChange={(e) => changeStyle({ visible: e.target.checked })}
                  />
                </label>
                <div className={styles.labelExample}>
                  <span className={styles.kicker}>LABEL APPEARANCE</span>
                  <span
                    style={{
                      color: ruleStyle.textColor,
                      borderColor: ruleStyle.borderColor,
                      background: ruleStyle.backgroundColor,
                      fontSize: ruleStyle.fontSize * 0.6,
                    }}
                  >
                    {selected.example}
                  </span>
                </div>
                <div className={styles.colorFields}>
                  {(
                    [
                      ["textColor", "Text color"],
                      ["borderColor", "Border color"],
                      ["backgroundColor", "Background color"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <div className={styles.colorControl}>
                        <input
                          type="color"
                          aria-label={label}
                          value={ruleStyle[key]}
                          onChange={(e) => changeStyle({ [key]: e.target.value })}
                        />
                        <code>{ruleStyle[key].toUpperCase()}</code>
                      </div>
                    </Field>
                  ))}
                </div>
                <Field label={`Label size · ${ruleStyle.fontSize}`}>
                  <input
                    type="range"
                    aria-label="Label size"
                    min={18}
                    max={45}
                    value={ruleStyle.fontSize}
                    onChange={(e) => changeStyle({ fontSize: Number(e.target.value) })}
                  />
                </Field>
                <div className={styles.rangeLabels}>
                  <span>Subtle</span>
                  <span>Unmissable</span>
                </div>
                <Field label="Alert sound">
                  <select
                    value={ruleStyle.sound}
                    onChange={(e) => changeStyle({ sound: Number(e.target.value) })}
                  >
                    <option value={0}>Off · silent drop</option>
                    {Array.from({ length: 16 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        In-game alert {index + 1}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className={styles.soundNote}>
                  <Volume2 size={12} />
                  Alert sounds play in game.
                </p>
              </fieldset>
              {category === "rare" &&
                ["strict", "very-strict"].includes(settings.strictness ?? "") && (
                  <div className={styles.ruleHint}>
                    This preset also hides rare equipment below item level{" "}
                    {settings.strictness === "strict" ? 65 : 80}.
                  </div>
                )}
            </section>
            <section className={styles.previewPanel}>
              <div className={styles.previewHeading}>
                <div>
                  <span className={styles.kicker}>YOUR FILTER IN CONTEXT</span>
                  <h2>See the difference.</h2>
                </div>
                <Badge tone="green">LIVE</Badge>
              </div>
              {lootScene()}
              <div className={styles.previewFooter}>
                <span>Click any drop to edit its category.</span>
              </div>
            </section>
          </div>
        )}
        {tab === "simulate" && (
          <section className={styles.simulator}>
            <div className={styles.simulatorToolbar}>
              <div>
                <span className={styles.kicker}>THE NEXT BEST THING TO A MAP</span>
                <h2>A little field testing.</h2>
                <p>Illustrative sample items evaluated against your builder rules.</p>
              </div>
              <div className={styles.simulatorActions}>
                <label>
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(e) => setShowHidden(e.target.checked)}
                  />
                  Show hidden items
                </label>
                <Button
                  variant="secondary"
                  disabled={custom}
                  onClick={() => setGeneration((value) => value + 1)}
                >
                  <RefreshCw size={14} />
                  Generate loot
                </Button>
              </div>
            </div>
            {lootScene(true)}
            <div className={styles.simulatorSummary}>
              <span>
                <Eye size={14} />
                {custom ? "—" : visibleSamples.length} shown
              </span>
              <span>
                <EyeOff size={14} />
                {custom ? "—" : sampleFilterLoot.length - visibleSamples.length} hidden
              </span>
              <span>
                Sample item levels are included in each label’s tooltip. Click a label to edit its
                rule.
              </span>
            </div>
            {!custom && (
              <details className={styles.breakdown}>
                <summary>
                  Inspect sample results <ChevronRight size={14} />
                </summary>
                <div className={styles.resultTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Item level</th>
                        <th>Result</th>
                        <th>Matched rule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleFilterLoot.map((item) => {
                        const result = evaluateFilterSample(settings, item);
                        return (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.itemLevel}</td>
                            <td
                              className={result.visible ? styles.shownResult : styles.hiddenResult}
                            >
                              {result.visible ? "Shown" : "Hidden"}
                            </td>
                            <td>{result.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
        )}
        {tab === "export" && (
          <div className={styles.exportGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <span className={styles.step}>04</span>
                <h2>Take it into the game.</h2>
                <Download size={17} />
              </div>
              <p className={styles.panelDescription}>Your rules, ready for your next adventure.</p>
              <div className={styles.exportCheck}>
                <ShieldCheck size={20} />
                <div>
                  <strong>
                    {validation.valid
                      ? "Basic syntax check passed"
                      : `${validation.issues.length} syntax issue(s)`}
                  </strong>
                  <p>GGG performs full game validation when you sync.</p>
                </div>
              </div>
              {!validation.valid && <Notice error>{validation.issues.join(". ")}</Notice>}
              {!settings.name.trim() && (
                <Notice error>Give your filter a name before saving or exporting.</Notice>
              )}
              <Button
                className={styles.downloadButton}
                disabled={!canExport}
                onClick={() => downloadFile(settings.name.trim() + ".filter", text)}
              >
                <Download size={16} />
                Download .filter
                <ArrowRight size={14} />
              </Button>
              <ol className={styles.installSteps}>
                <li>
                  <span>1</span>Save the file in your Path of Exile 2 filter folder.
                </li>
                <li>
                  <span>2</span>Open the game’s Options → Game menu.
                </li>
                <li>
                  <span>3</span>Select your filter under Item Filter and apply.
                </li>
              </ol>
              <div className={styles.syncSection}>
                <div className={styles.panelHeading}>
                  <h3>Prefer account sync?</h3>
                  <Upload size={15} />
                </div>
                <p>Save directly to your Path of Exile account.</p>
                <Button
                  variant="secondary"
                  className="full-width"
                  disabled={!status?.connected || syncing || !canExport}
                  onClick={() => void sync()}
                >
                  {syncing ? "Syncing…" : remoteId ? "Update on GGG" : "Sync to GGG"}
                  <Upload size={14} />
                </Button>
                {!status?.connected && (
                  <Link className={styles.connectLink} href="/settings">
                    Connect your account in Settings <ArrowRight size={12} />
                  </Link>
                )}
              </div>
              {store.filters.length > 0 && (
                <div className={styles.savedList}>
                  <h3>Saved in this browser</h3>
                  {store.filters.map((draft) => (
                    <div key={draft.id}>
                      <button onClick={() => openDraft(draft.id)}>
                        <FileCode2 size={13} />
                        <span>{draft.name}</span>
                      </button>
                      <button
                        aria-label={`Delete ${draft.name}`}
                        title={`Delete ${draft.name}`}
                        onClick={() => {
                          store.deleteFilter(draft.id);
                          if (activeId === draft.id) selectDraft(undefined);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {status?.connected && (
                <div className={styles.savedList}>
                  <h3>Online filters</h3>
                  {online.isPending && <p>Loading your filters…</p>}
                  {online.error && <Notice error>{online.error.message}</Notice>}
                  {online.data?.filters.length === 0 && <p>No online filters yet.</p>}
                  {online.data?.filters.map((filter) => (
                    <div key={filter.id}>
                      <button disabled={loadingOnline} onClick={() => void openOnline(filter.id)}>
                        <Upload size={13} />
                        {filter.filter_name}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className={styles.sourcePanel}>
              <div className={styles.sourceHeading}>
                <div>
                  <FileCode2 size={16} />
                  <h2>Filter rules</h2>
                  <Badge>{custom ? "CUSTOM" : "GENERATED"}</Badge>
                </div>
                <Button variant="ghost" onClick={() => setAdvanced((value) => !value)}>
                  <Code2 size={14} />
                  {advanced ? "Simple editor" : "Advanced editor"}
                </Button>
              </div>
              {advanced ? (
                <CodeEditor value={text} onChange={editSource} />
              ) : (
                <textarea
                  className={styles.source}
                  aria-label="Filter rules"
                  value={text}
                  spellCheck={false}
                  onChange={(e) => editSource(e.target.value)}
                />
              )}
              <div className={styles.sourceStatus}>
                <Badge tone={validation.valid ? "green" : "amber"}>
                  {validation.valid ? "BASIC SYNTAX OK" : "REVIEW SYNTAX"}
                </Badge>
                <span>{text.split("\n").length} lines · PoE2</span>
              </div>
              <p className={styles.sourceNote}>
                You can edit the source directly. Custom edits pause the visual builder so your
                rules stay intact.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

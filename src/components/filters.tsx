"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Code2, Download, Save, Sparkles, Upload, Plus, Trash2 } from "lucide-react";
import { api, useStatus } from "@/lib/client";
import { useWorkspace } from "@/lib/workspace-store";
import {
  defaultFilterSettings,
  generateFilter,
  validateFilter,
  type FilterSettings,
} from "@/lib/filter";
import { downloadFile } from "@/lib/build";
import { Badge, Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), { ssr: false });
type OnlineFilter = {
  id: string;
  filter_name: string;
  filter?: string;
  description?: string;
  public?: boolean;
  validation?: { valid: boolean };
};
export function Filters() {
  const { data: status } = useStatus(),
    store = useWorkspace(),
    [settings, setSettings] = useState<FilterSettings>(defaultFilterSettings),
    [text, setText] = useState(() => generateFilter(defaultFilterSettings)),
    [activeId, setActiveId] = useState<string>(),
    [remoteId, setRemoteId] = useState<string>(),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [syncing, setSyncing] = useState(false);
  const validation = validateFilter(text);
  const online = useQuery({
    queryKey: ["filters"],
    queryFn: () => api<{ filters: OnlineFilter[] }>("filters"),
    enabled: !!status?.connected,
  });
  function report(value: string, isError = false) {
    setMessage(value);
    setError(isError);
  }
  function update<K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  function save() {
    if (!validation.valid) {
      report(validation.issues.join(". "), true);
      return;
    }
    const id = store.saveFilter({ name: settings.name, text, settings, remoteId }, activeId);
    setActiveId(id);
    report("Filter draft saved in this browser.");
  }
  async function sync() {
    setSyncing(true);
    try {
      const result = await api<{ filter: OnlineFilter; error?: { message: string } }>(
        "filters" + (remoteId ? "/" + encodeURIComponent(remoteId) : ""),
        { method: "POST", body: JSON.stringify({ filter_name: settings.name, filter: text }) },
      );
      setRemoteId(result.filter.id);
      const savedId = store.saveFilter(
        { name: settings.name, text, settings, remoteId: result.filter.id },
        activeId,
      );
      setActiveId(savedId);
      if (result.filter.validation?.valid === false)
        report(
          "GGG saved the filter but its validation failed. Review its syntax before using it.",
          true,
        );
      else
        report(
          result.error?.message ??
            "Filter saved to GGG and checked against the current game version.",
        );
      void online.refetch();
    } catch (e) {
      report(e instanceof Error ? e.message : "Sync failed", true);
    } finally {
      setSyncing(false);
    }
  }
  async function openOnline(id: string) {
    try {
      const result = await api<{ filter: OnlineFilter }>("filters/" + encodeURIComponent(id));
      setText(result.filter.filter ?? "");
      setSettings((s) => ({ ...s, name: result.filter.filter_name }));
      setRemoteId(id);
      setActiveId(undefined);
      report("Online PoE2 filter loaded. Sync will update this filter.");
    } catch (e) {
      report(e instanceof Error ? e.message : "Could not open filter", true);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="TOOLS / LOOT FILTERS"
        title="Make every drop count."
        description="Design your own loot labels. Save locally, download, or sync to your account."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSettings(defaultFilterSettings);
              setText(generateFilter(defaultFilterSettings));
              setActiveId(undefined);
              setRemoteId(undefined);
              report("");
            }}
          >
            <Plus size={15} />
            New filter
          </Button>
        }
      />
      {message && <Notice error={error}>{message}</Notice>}
      <div className="editor-grid">
        <section className="panel settings-panel">
          <SectionHeader title="Filter settings" aside={<Sparkles size={17} />} />
          <Field label="Filter name">
            <input
              value={settings.name}
              maxLength={120}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label={`Rare label size · ${settings.fontSize}`}>
            <input
              type="range"
              min={18}
              max={45}
              value={settings.fontSize}
              onChange={(e) => update("fontSize", Number(e.target.value))}
            />
          </Field>
          <Field label="Rare label color">
            <div className="color-control">
              <input
                type="color"
                value={settings.rareColor}
                onChange={(e) => update("rareColor", e.target.value)}
              />
              <span>{settings.rareColor.toUpperCase()}</span>
            </div>
          </Field>
          {(
            [
              ["showNormal", "Show normal items"],
              ["showMagic", "Show magic items"],
              ["sounds", "Unique item alert sound"],
            ] as const
          ).map(([key, label]) => (
            <label className="toggle-row" key={key}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => update(key, e.target.checked)}
              />
            </label>
          ))}
          <Button
            variant="secondary"
            className="full-width"
            onClick={() => {
              try {
                setText(generateFilter(settings));
                report("Rules regenerated from your settings.");
              } catch {
                report("Check the filter name and settings.", true);
              }
            }}
          >
            Apply settings to rules <Sparkles size={15} />
          </Button>
          <p className="fine-print">
            Applying settings replaces the rules below. The local check catches basic syntax; GGG
            performs full validation when syncing.
          </p>
          <SectionHeader title="Saved drafts" aside={<Badge>{store.filters.length}</Badge>} />
          {store.filters.length === 0 ? (
            <p className="muted text-small">Save your first filter to keep it here.</p>
          ) : (
            store.filters.map((f) => (
              <div className="draft-row" key={f.id}>
                <button
                  onClick={() => {
                    setActiveId(f.id);
                    setRemoteId(f.remoteId);
                    setSettings(f.settings);
                    setText(f.text);
                    report("");
                  }}
                >
                  {f.name}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${f.name}`}
                  onClick={() => store.deleteFilter(f.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
          {status?.connected && (
            <>
              <SectionHeader title="Online filters" />
              {online.data?.filters.map((f) => (
                <button className="draft-row" key={f.id} onClick={() => void openOnline(f.id)}>
                  {f.filter_name}
                  <Upload size={14} />
                </button>
              ))}
              {online.error && <Notice error>{online.error.message}</Notice>}
            </>
          )}
        </section>
        <div>
          <section className="panel loot-preview">
            <SectionHeader
              title="Label preview"
              aside={<span className="eyebrow">STYLE PREVIEW</span>}
            />
            <div className="loot-ground">
              <span className="loot-label unique-label">Unique item</span>
              <span className="loot-label currency-label">Currency drop</span>
              <span
                className="loot-label"
                style={{
                  color: settings.rareColor,
                  borderColor: settings.rareColor,
                  fontSize: settings.fontSize * 0.45,
                }}
              >
                Rare item
              </span>
              {settings.showMagic && <span className="loot-label magic-label">Magic item</span>}
              {settings.showNormal && <span className="loot-label normal-label">Normal item</span>}
            </div>
          </section>
          <section className="panel code-panel">
            <SectionHeader
              title="Filter rules"
              aside={
                <Button variant="ghost" onClick={() => setAdvanced((v) => !v)}>
                  <Code2 size={15} />
                  {advanced ? "Simple editor" : "Advanced editor"}
                </Button>
              }
            />
            {advanced ? (
              <CodeEditor value={text} onChange={setText} />
            ) : (
              <textarea
                className="code-textarea"
                aria-label="Filter rules"
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
            <div className="editor-status">
              <Badge tone={validation.valid ? "green" : "amber"}>
                {validation.valid ? "BASIC SYNTAX OK" : `${validation.issues.length} ISSUE(S)`}
              </Badge>
              <span>{text.split("\n").length} lines · PoE2</span>
            </div>
            {!validation.valid && <Notice error>{validation.issues.join(". ")}</Notice>}
            <div className="editor-actions">
              <Button variant="secondary" onClick={save} disabled={!settings.name.trim()}>
                <Save size={15} />
                Save draft
              </Button>
              <Button
                variant="secondary"
                onClick={() => downloadFile(settings.name + ".filter", text)}
                disabled={!validation.valid}
              >
                <Download size={15} />
                Download .filter
              </Button>
              <Button
                disabled={!status?.connected || syncing || !validation.valid}
                title={!status?.connected ? "Connect an account in Settings" : undefined}
                onClick={() => void sync()}
              >
                <Upload size={15} />
                {syncing ? "Syncing…" : remoteId ? "Update on GGG" : "Sync to GGG"}
              </Button>
            </div>
            {!status?.connected && (
              <p className="fine-print">
                Local editing and downloads are ready. Connect an account in Settings to sync
                online.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

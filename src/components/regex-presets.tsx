"use client";
import { useState } from "react";
import { Star, Copy, Download, Pencil, Trash2 } from "lucide-react";
import { REGEX_CATEGORIES } from "@/lib/regex-catalogue";
import { exportRegexPresets } from "@/lib/regex-presets";
import { compileRegexSearch } from "@/lib/regex-search";
import { useRegexWorkspace } from "@/lib/regex-store";
import { downloadFile } from "@/lib/build";
import type { RegexPreset } from "@/lib/regex-schema";
import { Button, Field, Notice } from "./ui";
import styles from "./regex-toolkit.module.css";
export function RegexPresets({ onLoad }: { onLoad: (preset: RegexPreset) => void }) {
  const store = useRegexWorkspace(),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [message, setMessage] = useState(""),
    [rename, setRename] = useState(""),
    [name, setName] = useState("");
  const presets = store.presets
    .filter(
      (p) =>
        (category === "all" || p.draft.category === category) &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort(
      (a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt),
    );
  function exportFile(list: RegexPreset[], filename: string) {
    try {
      downloadFile(filename, exportRegexPresets(list), "application/json");
      setMessage("Presets exported.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <section className={`panel ${styles.library}`}>
      <div className={styles.libraryTools}>
        <Field label="Search presets">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a saved search…"
          />
        </Field>
        <Field label="Preset category">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All generators</option>
            {REGEX_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Button
          variant="secondary"
          disabled={!store.presets.length}
          onClick={() => exportFile(store.presets, "exile-atlas-presets.json")}
        >
          <Download size={15} />
          Export all presets
        </Button>
      </div>
      <Field label="Import preset file" hint="JSON · up to 1 MiB · imports create copies">
        <input
          aria-label="Import preset file"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              if (file.size > 1048576) throw new Error("Preset imports must be at most 1 MiB.");
              const r = store.importPresets(await file.text());
              setMessage(r.ok ? "Presets imported as new copies." : r.error!);
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        />
      </Field>
      {message && <Notice>{message}</Notice>}
      {!presets.length ? (
        <div className={styles.empty}>
          <Star size={27} />
          <h2>{store.presets.length ? "No matching presets." : "No presets yet."}</h2>
          <p className="muted">Configure a generator and save a search to keep it here.</p>
        </div>
      ) : (
        <div className={styles.presetGrid}>
          {presets.map((p) => {
            const compiled = compileRegexSearch(p.draft);
            return (
              <article className={styles.presetCard} key={p.id}>
                <div className={styles.cardTop}>
                  <span className="eyebrow">
                    {REGEX_CATEGORIES.find((c) => c.id === p.draft.category)?.label}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`${p.favorite ? "Unfavorite" : "Favorite"} ${p.name}`}
                    onClick={() => store.toggleFavorite(p.id)}
                  >
                    <Star size={18} fill={p.favorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <h3>{p.name}</h3>
                <code className={styles.presetCode}>
                  {compiled.text || "No searchable criteria"}
                </code>
                {(!compiled.valid || compiled.length > compiled.limit) && (
                  <p className={styles.fail}>
                    Needs adjustment ·{" "}
                    {compiled.errors.join(" ") || `${compiled.length}/${compiled.limit} characters`}
                  </p>
                )}
                {rename === p.id ? (
                  <div className={styles.rename}>
                    <Field label={`New name for ${p.name}`}>
                      <input
                        value={name}
                        maxLength={120}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const r = store.renamePreset(p.id, name);
                        if (r.ok) setRename("");
                        else setMessage(r.error!);
                      }}
                    >
                      Save name
                    </Button>
                    <Button variant="ghost" onClick={() => setRename("")}>
                      Cancel rename
                    </Button>
                  </div>
                ) : (
                  <div className={styles.presetActions}>
                    <Button
                      variant="secondary"
                      aria-label={`Load ${p.name}`}
                      onClick={() => onLoad(p)}
                    >
                      Load
                    </Button>
                    <button
                      className="icon-button"
                      aria-label={`Rename ${p.name}`}
                      onClick={() => {
                        setRename(p.id);
                        setName(p.name);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Duplicate ${p.name}`}
                      onClick={() => {
                        const r = store.duplicatePreset(p.id);
                        if (!r.ok) setMessage(r.error!);
                      }}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Export ${p.name}`}
                      onClick={() => exportFile([p], p.name + ".json")}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => store.deletePreset(p.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

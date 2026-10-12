"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseItemText, type ParsedItem } from "@/lib/item-text";
import { matchItemModifiers, type ModifierMatch } from "@/lib/game-data";
import { useGameData } from "@/lib/game-data-store";
import { prepareItemTransfer, saveItemTransfer, type ItemTransfer } from "@/lib/item-transfer";
import { buildRegexCatalogue } from "@/lib/regex-catalogue-builder";
import { compileRegexSearch } from "@/lib/regex-search";
import { useRegexWorkspace } from "@/lib/regex-store";
import { Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
import { RegexTradePreview } from "./regex-trade-preview";
import styles from "./item-inspector.module.css";
export function ItemInspector() {
  const data = useGameData(),
    router = useRouter();
  const [text, setText] = useState(""),
    [error, setError] = useState(""),
    [analysis, setAnalysis] = useState<{
      item: ParsedItem;
      matches: ModifierMatch[];
      transfer: ItemTransfer;
    }>(),
    [preview, setPreview] = useState(false),
    [trade, setTrade] = useState(false);
  function analyse() {
    try {
      if (!data.snapshot) throw new Error(data.error || "Game data is loading");
      const item = parseItemText(text);
      if (!item.rarity) throw new Error("Paste English item text including its Rarity header");
      setAnalysis({
        item,
        matches: matchItemModifiers(item, data.snapshot),
        transfer: prepareItemTransfer(text, data.snapshot),
      });
      setPreview(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyse item");
    }
  }
  const compiled =
    analysis && data.snapshot
      ? compileRegexSearch(analysis.transfer.draft, buildRegexCatalogue(data.snapshot))
      : undefined;
  function send(path: string) {
    try {
      if (!analysis) return;
      saveItemTransfer(analysis.transfer);
      router.push(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer unavailable");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="TOOLS / ITEM INSPECTOR"
        title="Read the roll. Keep the unknowns."
        description="Paste basic or advanced English item text to inspect its facts and prepare your next search."
      />
      {(error || data.error) && <Notice error>{error || data.error}</Notice>}
      <div className={styles.grid}>
        <section className={`panel ${styles.input}`}>
          <SectionHeader title="Copied item" />
          <Field label="Item text">
            <textarea
            aria-label="Item text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the item’s copied English text…"
            />
          </Field>
          <p className="fine-print">
            64 KiB maximum. Analysis stays in this browser; manual paste always works.
          </p>
          <div className="button-group">
            <Button disabled={!text.trim() || !data.snapshot} onClick={analyse}>
              Analyse item
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard
                  .readText()
                  .then(setText)
                  .catch(() => setError("Clipboard access unavailable; paste manually."))
              }
            >
              Paste from clipboard
            </Button>
          </div>
        </section>
        <section className={`panel ${styles.result}`}>
          <SectionHeader title={analysis?.item.name ?? "Item facts"} />
          {!analysis ? (
            <p className="muted">
              Your item’s facts, actual rolls, annotations and unresolved lines appear here.
            </p>
          ) : (
            <>
              <p>
                {analysis.item.base} · {analysis.item.rarity}
              </p>
              <dl className={styles.facts}>
                {Object.entries({
                  "Item class": analysis.item.itemClass,
                  "Item level": analysis.item.itemLevel,
                  "Required level": analysis.item.requiredLevel,
                  Corrupted: analysis.item.corrupted ? "Yes" : "No",
                  ...analysis.item.properties,
                })
                  .filter(([, v]) => v !== undefined)
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
              </dl>
              <p className="fine-print">
                Source snapshot {analysis.transfer.snapshotId.slice(0, 12)}
                {data.snapshot?.id !== analysis.transfer.snapshotId &&
                  " · Dataset changed; analyse again before transferring."}
              </p>
              {analysis.matches.map((m, i) => (
                <div className={styles.modifier} key={i}>
                  <strong>{m.line.text}</strong>
                  <p>
                    {m.line.actualRolls.length
                      ? `Actual rolls: ${m.line.actualRolls.join(", ")}`
                      : "Presence condition"}
                  </p>
                  {m.line.annotations.some(Boolean) && (
                    <p>
                      Annotated ranges:{" "}
                      {m.line.annotations
                        .filter(Boolean)
                        .map((r) => r!.join("–"))
                        .join(", ")}
                    </p>
                  )}
                  <p>
                    {m.status === "exact"
                      ? "Verified match"
                      : m.status === "ambiguous"
                        ? "Ambiguous affix identity"
                        : "Unknown modifier"}{" "}
                    · source line {m.line.line + 1}
                  </p>
                  {(m.line.affixType || m.line.tier) && (
                    <p>
                      {m.line.affixType} {m.line.tier ? `· supplied tier ${m.line.tier}` : ""}
                    </p>
                  )}
                  {m.status === "exact" && (
                    <p>
                      {m.candidates[0].affixType ?? "Affix type unavailable"} · required item level{" "}
                      {m.candidates[0].requiredLevel ?? "unknown"} · group{" "}
                      {m.candidates[0].group ?? "unknown"}
                    </p>
                  )}
                  <details>
                    <summary>Source identities ({m.candidates.length})</summary>
                    {m.candidates.map((c) => (
                      <p key={c.id}>{c.id}</p>
                    ))}
                  </details>
                </div>
              ))}
              <div className="button-group">
                <Button variant="secondary" onClick={() => setPreview(true)}>
                  Preview regex
                </Button>
                <Button
                  variant="secondary"
                  disabled={!analysis.transfer.complete}
                  onClick={() => setTrade(true)}
                >
                  Preview trade
                </Button>
                <Button variant="secondary" onClick={() => send("/safety")}>
                  Check map safety
                </Button>
                <Button variant="secondary" onClick={() => send("/crafting")}>
                  Open crafting workbench
                </Button>
              </div>
              {preview && (
                <div className={styles.preview}>
                  <h3>Review complete criteria</h3>
                  <pre>{compiled?.text}</pre>
                  {analysis.transfer.unresolved.length > 0 && (
                    <Notice error>
                      Unresolved criteria: {analysis.transfer.unresolved.join(" · ")}. Complete
                      transfer is unavailable.
                    </Notice>
                  )}
                  {compiled?.errors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                  <div className="button-group">
                    <Button
                      disabled={
                        !analysis.transfer.complete ||
                        !compiled?.valid ||
                        analysis.transfer.snapshotId !== data.snapshot?.id
                      }
                      onClick={() => {
                        useRegexWorkspace.getState().setDraft(analysis.transfer.draft);
                        useRegexWorkspace.getState().setActiveTab(analysis.transfer.draft.category);
                        router.push("/regex");
                      }}
                    >
                      Use complete regex
                    </Button>
                    <Button variant="secondary" onClick={() => setPreview(false)}>
                      Cancel preview
                    </Button>
                  </div>
                </div>
              )}
              {trade && (
                <RegexTradePreview
                  draft={analysis.transfer.draft}
                  onClose={() => setTrade(false)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

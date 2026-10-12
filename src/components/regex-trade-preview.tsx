"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {useGameData} from "@/lib/game-data-store";
import {buildRegexCatalogue} from "@/lib/regex-catalogue-builder";
import { useRouter } from "next/navigation";
import { prepareRegexTrade } from "@/lib/regex-trade";
import { useTradeWorkspace } from "@/lib/trade-store";
import { tradeSummary } from "@/lib/trade-search";
import type { RegexDraft } from "@/lib/regex-schema";
import { Button, Field, Notice } from "./ui";
import styles from "./regex-toolkit.module.css";
export function RegexTradePreview({ draft, onClose }: { draft: RegexDraft; onClose: () => void }) {
  const snapshot=useGameData(s=>s.snapshot);const catalogue=useMemo(()=>snapshot?buildRegexCatalogue(snapshot):undefined,[snapshot]);
  const dialog = useRef<HTMLDialogElement>(null),
    router = useRouter();
  const [league, setLeague] = useState(() => useTradeWorkspace.getState().draft.league);
  const result = prepareRegexTrade(draft, league,catalogue);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="regex-trade-title"
      onCancel={onClose}
    >
      <h2 id="regex-trade-title">Prepare your trade search</h2>
      <p className="muted">
        Review the criteria before replacing your current trade draft. Your saved trade searches are
        kept.
      </p>
      <Field label="Trade league">
        <input value={league} onChange={(e) => setLeague(e.target.value)} />
      </Field>
      {result.unsupported.length > 0 && (
        <Notice error>
          These criteria have no equivalent trade mapping. Remove them to transfer:{" "}
          <ul>
            {result.unsupported.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Notice>
      )}
      {result.errors.map((e) => (
        <Notice error key={e}>
          {e}
        </Notice>
      ))}
      <pre className={styles.summary}>{tradeSummary(result.draft)}</pre>
      <div className="button-group">
        <Button
          disabled={!result.ready}
          onClick={() => {
            useTradeWorkspace.getState().setDraft(result.draft);
            onClose();
            router.push("/trade");
          }}
        >
          Use these filters
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel preview
        </Button>
      </div>
    </dialog>
  );
}

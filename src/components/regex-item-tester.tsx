"use client";
import { useState } from "react";
import { testRegexItem, type RegexItemTestResult } from "@/lib/regex-item-test";
import type { RegexDraft } from "@/lib/regex-schema";
import { Button, Field, Notice, SectionHeader } from "./ui";
import styles from "./regex-toolkit.module.css";
export function RegexItemTester({ draft }: { draft: RegexDraft }) {
  const [text, setText] = useState(""),
    [tested, setTested] = useState<{ signature: string; result: RegexItemTestResult } | null>(null);
  const signature = JSON.stringify(draft) + text;
  const result = tested?.signature === signature ? tested.result : undefined;
  const labels = {
    match: "Match",
    "no-match": "No match",
    incomplete: "Incomplete item text",
    invalid: "Invalid test",
  };
  return (
    <section className={`panel ${styles.tester}`}>
      <SectionHeader title="Check an item" />
      <p className="muted">
        Copy an item in-game and paste its English text. This local preview checks searchable lines;
        it cannot verify the game’s search engine.
      </p>
      <Field label="Pasted item text">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rarity: Rare…"
        />
      </Field>
      <Button
        variant="secondary"
        disabled={!text.trim()}
        onClick={() => setTested({ signature, result: testRegexItem(draft, text) })}
      >
        Test item
      </Button>
      {result && (
        <div data-testid="item-test-result" className={styles.testResult} role="status">
          <strong>{labels[result.status]}</strong>
          {result.errors.map((e) => (
            <Notice error key={e}>
              {e}
            </Notice>
          ))}
          <ul>
            {result.conditions.map((c, i) => (
              <li key={c.key + i}>
                <span className={styles[c.status]}>
                  {c.status === "unknown" ? "Unavailable" : c.status === "pass" ? "Pass" : "Fail"}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import { Copy } from "lucide-react";
import type { RegexCatalogue } from "@/lib/regex-catalogue-builder";
import { createRegexDraft } from "@/lib/regex-schema";
import { compileRegexSearch } from "@/lib/regex-search";
import {
  WAYSTONE_BONUS_LABELS,
  WAYSTONE_RECOMMENDATIONS,
  waystoneRecommendationProperties,
  type WaystoneRecommendation,
} from "@/lib/waystone-recommendations";
import { Button, Field, Notice, SectionHeader } from "./ui";
import styles from "./regex-toolkit.module.css";

export function WaystoneRecommendations({
  catalogue,
  recommendation,
  onSelect,
}: {
  catalogue: RegexCatalogue;
  recommendation?: WaystoneRecommendation;
  onSelect: (recommendation: WaystoneRecommendation) => void;
}) {
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const search =
    recommendation &&
    compileRegexSearch(
      {
        ...createRegexDraft("waystone"),
        properties: waystoneRecommendationProperties(recommendation),
      },
      catalogue,
    );

  return (
    <section
      className={`panel ${styles.recommendations}`}
      aria-label="T15 Waystone recommendations"
    >
      <SectionHeader title="T15 Waystone recommendations" />
      <Field
        label="Farming strategy"
        hint="Selecting a strategy sets tier 15 and the bonus ranges below, and turns off rounding."
      >
        <select
          aria-label="Farming strategy"
          value={recommendation?.id ?? ""}
          onChange={(event) => {
            const next = WAYSTONE_RECOMMENDATIONS.find(({ id }) => id === event.target.value);
            if (next) {
              setFeedback(undefined);
              onSelect(next);
            }
          }}
        >
          <option value="" disabled>
            Choose a farming strategy
          </option>
          {WAYSTONE_RECOMMENDATIONS.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {recommendation && search && (
        <>
          <ul className={styles.recommendedBonuses} aria-label="Recommended minimum rolls">
            {recommendation.minimums.map(([id, minimum]) => (
              <li key={id}>
                {WAYSTONE_BONUS_LABELS[id]} ≥{minimum}%
              </li>
            ))}
          </ul>
          <p className={styles.recommendationDescription}>{recommendation.description}</p>
          <Field label="Recommended search">
            <textarea readOnly rows={2} value={search.text} />
          </Field>
          {search.errors.map((error) => (
            <Notice key={error} error>
              {error}
            </Notice>
          ))}
          <div className={styles.outputButtons}>
            <Button
              type="button"
              disabled={!search.copyable}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(search.text);
                  setFeedback({ text: "Recommended search copied." });
                } catch {
                  setFeedback({
                    text: "Copy failed. Select the recommended search and copy it manually.",
                    error: true,
                  });
                }
              }}
            >
              <Copy size={15} />
              Copy recommended search
            </Button>
          </div>
          {feedback && <Notice error={feedback.error}>{feedback.text}</Notice>}
        </>
      )}
    </section>
  );
}

import { z } from "zod";
import { safetyProfileSchema, safetyRuleSchema } from "./map-safety-schema";
import { buildRegexCatalogue } from "./regex-catalogue-builder";
import { templateMatcher, type GameSnapshot } from "./game-data";
import type { ParsedItem } from "./item-text";
import { createRegexDraft } from "./regex-schema";
import { compileRegexSearch } from "./regex-search";
export type SafetyProfile = z.infer<typeof safetyProfileSchema>;
export type SafetyRule = z.infer<typeof safetyRuleSchema>;
export type SafetyResult = {
  status: "avoid" | "caution" | "no-flagged-condition" | "needs-review";
  findings: {
    id: string;
    label: string;
    severity: SafetyRule["severity"];
    reason: string;
    conditions: string[];
  }[];
  unknown: string[];
};
export function evaluateMapSafety(
  item: ParsedItem,
  profile: SafetyProfile,
  snapshot: GameSnapshot,
): SafetyResult {
  safetyProfileSchema.parse(profile);
  const catalogue = buildRegexCatalogue(snapshot);
  const mods = catalogue.modifiers.filter((m) => m.categories.includes("waystone"));
  const unknown: string[] = [];
  if (
    !item.rarity ||
    !(item.itemClass?.toLowerCase().includes("waystone") || item.base?.includes("Waystone"))
  )
    unknown.push("Waystone class or rarity is incomplete");
  if (!profile.rules.length) unknown.push("Profile has no risk rules");
  if (profile.snapshotId && profile.snapshotId !== snapshot.id)
    unknown.push("Profile source changed; revalidate referenced criteria");
  for (const line of item.modifiers)
    if (!mods.some((m) => templateMatcher(m.template).test(line.text)))
      unknown.push(line.originalText);
  const findings: SafetyResult["findings"] = [];
  for (const rule of profile.rules) {
    const explanations: string[] = [];
    const values = rule.conditions.map((c) => {
      if (c.kind === "trait") {
        if (!Object.hasOwn(profile.traits, c.id)) {
          unknown.push(`Unknown build trait: ${c.id}`);
          return undefined;
        }
        const result = profile.traits[c.id] === c.value;
        if (result) explanations.push(`${c.id}: ${profile.traits[c.id]}`);
        return result;
      }
      const mod = mods.find((m) => m.id === c.id);
      if (!mod) {
        unknown.push(`Unknown rule modifier: ${c.id}`);
        return undefined;
      }
      const lines = item.modifiers.filter((l) => templateMatcher(mod.template).test(l.text));
      if (!lines.length) return false;
      const slot = c.slot ?? 0;
      const ranged = !!(c.min?.trim() || c.max?.trim());
      if (ranged && !mod.numericDomain) {
        unknown.push(`Unverified numeric condition: ${mod.label}`);
        return undefined;
      }
      const low = c.min?.trim() ? Number(c.min) : -Infinity,
        high = c.max?.trim() ? Number(c.max) : Infinity;
      if (
        (c.min?.trim() && (!/^-?\d+(\.\d+)?$/.test(c.min.trim()) || !Number.isFinite(low))) ||
        (c.max?.trim() && (!/^-?\d+(\.\d+)?$/.test(c.max.trim()) || !Number.isFinite(high))) ||
        low > high
      ) {
        unknown.push(`Invalid threshold: ${rule.label}`);
        return undefined;
      }
      return lines.some((line) => {
        const roll = line.actualRolls[slot];
        if (ranged && roll === undefined) {
          unknown.push(`Missing numeric slot: ${rule.label}`);
          return false;
        }
        const match = !ranged || (roll >= low && roll <= high);
        if (match)
          explanations.push(
            `${line.text}${ranged ? ` · roll ${roll} in ${c.min || "any"}–${c.max || "any"}` : ""}`,
          );
        return match;
      });
    });
    const flagged =
      rule.operator === "all" ? values.every((v) => v === true) : values.some((v) => v === true);
    if (flagged)
      findings.push({
        id: rule.id,
        label: rule.label,
        severity: rule.severity,
        reason: rule.reason,
        conditions: explanations,
      });
  }
  return {
    status: findings.some((f) => f.severity === "avoid")
      ? "avoid"
      : findings.length
        ? "caution"
        : unknown.length
          ? "needs-review"
          : "no-flagged-condition",
    findings,
    unknown: [...new Set(unknown)],
  };
}
export function prepareSafetyRegex(
  profile: SafetyProfile,
  snapshot: GameSnapshot,
  selectedRuleIds?: string[],
) {
  const draft = createRegexDraft("waystone");
  draft.snapshotId = snapshot.id;
  const unsupported: string[] = [];
  const supported: string[] = [];
  const catalogue = buildRegexCatalogue(snapshot);
  for (const rule of profile.rules.filter(
    (r) => r.severity === "avoid" && (!selectedRuleIds || selectedRuleIds.includes(r.id)),
  )) {
    const conditions = rule.conditions.filter((c) => c.kind === "modifier");
    const traits = rule.conditions.filter((c) => c.kind === "trait");
    if (!conditions.length || (rule.operator === "all" && conditions.length > 1) || traits.length) {
      unsupported.push(rule.label);
      continue;
    }
    for (const c of conditions) {
      if (!catalogue.modifiers.some((m) => m.id === c.id && m.categories.includes("waystone"))) {
        unsupported.push(rule.label);
        continue;
      }
      draft.unwanted.push({
        id: c.id,
        min: c.min ?? "",
        max: c.max ?? "",
        slots: c.slot ? { [String(c.slot)]: { min: c.min ?? "", max: c.max ?? "" } } : undefined,
      });
    }
    supported.push(rule.label);
  }
  const compiled = compileRegexSearch(draft, catalogue);
  return {
    draft,
    compiled,
    supported,
    unsupported,
    canTransferComplete: !unsupported.length && compiled.valid && draft.unwanted.length > 0,
  };
}

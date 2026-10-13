import { REGEX_MODIFIERS, REGEX_PROPERTIES } from "./regex-catalogue";
import { compileRegexSearch, hasRegexValue, rangeBounds } from "./regex-search";
import { numericSlotsPattern } from "./regex-numeric-slots";
import type { ModifierSelection, RegexDraft } from "./regex-schema";
import type { RegexCatalogue } from "./regex-catalogue-builder";
import {
  createTradeDraft,
  validateTradeDraft,
  type TradeDraft,
  type TradeStatFilter,
} from "./trade-search";
export function prepareRegexTrade(
  input: RegexDraft,
  league: string,
  catalogue?: RegexCatalogue,
): {
  draft: TradeDraft;
  supported: string[];
  unsupported: string[];
  errors: string[];
  ready: boolean;
} {
  const draft = createTradeDraft(),
    supported: string[] = [],
    unsupported: string[] = [];
  const compiled = compileRegexSearch(input, catalogue);
  const errors = [...compiled.errors];
  draft.league = league.trim();
  draft.statGroups = [];
  const category = {
    waystone: "map.waystone",
    tablet: "map.tablet",
    relic: "sanctum.relic",
    vendor: "",
    equipment: "",
  }[input.category];
  if (category) draft.fields["type_filters.category"] = category;
  const mapped = (selection: ModifierSelection): TradeStatFilter | undefined => {
    const m = (catalogue?.modifiers ?? REGEX_MODIFIERS).find(
      (m) => m.id === selection.id && m.categories.includes(input.category),
    );
    if (!m?.tradeStatId) {
      unsupported.push(m?.label ?? selection.id);
      return;
    }
    if (
      m.tradeSemantics === "average" &&
      [selection, ...Object.values(selection.slots ?? {})].some((s) => hasRegexValue(s))
    ) {
      unsupported.push(`${m.label}: individual rolls have only an average trade mapping`);
      return;
    }
    let min = selection.min.trim(),
      max = selection.max.trim();
    try {
      if (
        !m.numericSlots &&
        Object.values(selection.slots ?? {}).some((range) => hasRegexValue(range))
      )
        throw new Error("Numeric slot constraints are unavailable for this trade mapping");
      if (m.numericSlots) {
        const ranges = { "0": { min, max }, ...selection.slots };
        numericSlotsPattern(m.template, m.numericSlots, ranges, true);
        if (m.numericSlots.length > 1 && Object.values(ranges).some((r) => hasRegexValue(r)))
          throw new Error("Individual rolls cannot be represented by this trade stat");
        const range = ranges["0"],
          slot = m.numericSlots[0];
        if (slot && hasRegexValue(range)) {
          min = String(range.min.trim() ? Number(range.min) : slot.domain[0]);
          max = String(range.max.trim() ? Number(range.max) : slot.domain[1]);
        } else {
          min = "";
          max = "";
        }
      } else if (m.numericDomain && hasRegexValue(selection)) {
        const bounds = rangeBounds(selection, m.numericDomain, m.label, input.roundNumbers);
        min = String(bounds[0]);
        max = String(bounds[1]);
      }
    } catch (error) {
      errors.push(
        `${m.label}: ${error instanceof Error ? error.message : "Trade conversion unavailable"}`,
      );
      return;
    }
    supported.push(m.label);
    return { id: m.tradeStatId, label: m.label, min, max, disabled: false };
  };
  const dedupe = (filters: TradeStatFilter[]) => [
    ...new Map(filters.map((f) => [`${f.id}:${f.min}:${f.max}`, f])).values(),
  ];
  const wanted = dedupe(input.wanted.map(mapped).filter((f): f is TradeStatFilter => !!f));
  if (wanted.length)
    draft.statGroups.push({
      id: "regex-wanted",
      type: input.match === "any" ? "or" : "and",
      min: "",
      max: "",
      disabled: false,
      filters: wanted,
    });
  input.unwanted.forEach((selection, index) => {
    const f = mapped(selection);
    if (f)
      draft.statGroups.push({
        id: `regex-not-${index}`,
        type: "not",
        min: "",
        max: "",
        disabled: false,
        filters: [f],
      });
  });
  for (const [id, value] of Object.entries(input.properties)) {
    if (!hasRegexValue(value)) continue;
    const p = (catalogue?.properties ?? REGEX_PROPERTIES).find(
      (p) => p.id === id && p.categories.includes(input.category),
    );
    if (id === "rarity" && typeof value === "string" && value.includes(",")) {
      if (value !== "normal,magic,rare" || input.category !== "waystone")
        unsupported.push("Multiple rarities");
      continue;
    }
    if (!p?.tradeField) {
      unsupported.push(p?.label ?? id);
      continue;
    }
    if (p.kind === "range" && typeof value !== "string") {
      try {
        const bounds = rangeBounds(value, p.numericDomain!, p.label, input.roundNumbers);
        if (bounds[0] === p.numericDomain![0] && bounds[1] === p.numericDomain![1]) continue;
        draft.fields[p.tradeField] = {
          min: String(bounds[0]),
          max: value.max.trim() ? String(bounds[1]) : "",
        };
      } catch (error) {
        errors.push(
          `${p.label}: ${error instanceof Error ? error.message : "Trade conversion unavailable"}`,
        );
        continue;
      }
    } else draft.fields[p.tradeField] = typeof value === "string" ? value : "";
    supported.push(p.label);
  }
  if (input.text.trim()) unsupported.push("Additional text");
  if (!compiled.text) errors.push("Configure at least one search criterion.");
  errors.push(...validateTradeDraft(draft));
  return {
    draft,
    supported: [...new Set(supported)],
    unsupported: [...new Set(unsupported)],
    errors: [...new Set(errors)],
    ready: errors.length === 0 && unsupported.length === 0,
  };
}

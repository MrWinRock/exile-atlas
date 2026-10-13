import { REGEX_MODIFIERS, REGEX_PROPERTIES } from "./regex-catalogue";
import { numericSlotsPattern } from "./regex-numeric-slots";
import type { RegexCatalogue } from "./regex-catalogue-builder";
import {
  regexDraftSchema,
  type ModifierSelection,
  type RegexDraft,
  type RegexRange,
} from "./regex-schema";

export const REGEX_LIMIT = 250;
export type SearchCondition = {
  key: string;
  label: string;
  pattern: string;
  /** Compact game token; pattern remains a matcher for basic/advanced pasted text. */
  copyPattern?: string;
  negative: boolean;
  source: "header" | "modifier" | "property" | "text";
  propertyId?: string;
};
export type SearchGroup = { operator: "any" | "all"; conditions: SearchCondition[] };
export type CompiledRegexSearch = {
  text: string;
  length: number;
  limit: number;
  valid: boolean;
  copyable: boolean;
  errors: string[];
  groups: SearchGroup[];
};
export const escapeRegexLiteral = (text: string) =>
  text
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll('"', "\\x22")
    .replaceAll("!", "\\x21")
    .replace(/\r?\n/g, "\\s");

/** Decimal-prefix partitioning; no unbounded enumeration or engine-specific lookarounds. */
export function integerRangePattern(min: number, max: number): string {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max || min < -99999 || max > 99999)
    throw new Error("Invalid bounded integer interval");
  const positive = (lo: number, hi: number): string[] => {
    const patterns: string[] = [];
    const visit = (prefix: string, digits: number, start: number, end: number) => {
      if (end < lo || start > hi) return;
      if (start >= lo && end <= hi) {
        patterns.push(prefix + (digits === 0 ? "" : digits === 1 ? "[0-9]" : `[0-9]{${digits}}`));
        return;
      }
      const place = 10 ** (digits - 1);
      for (let d = 0; d < 10; d++)
        visit(prefix + d, digits - 1, start + d * place, start + (d + 1) * place - 1);
    };
    if (lo === 0) patterns.push("0");
    for (let len = 1; len <= String(hi).length; len++) {
      const place = 10 ** (len - 1);
      for (let d = 1; d <= 9; d++) visit(String(d), len - 1, d * place, (d + 1) * place - 1);
    }
    // Collapse sibling digit prefixes, then contiguous wildcard lengths. Both
    // transformations are exact unions, so compactness never broadens a range.
    const siblings = new Map<string, { prefix: string; suffix: string; digits: number[] }>();
    for (const pattern of patterns) {
      const match = /^(\d*)(\d)(\[0-9\](?:\{\d+\})?)?$/.exec(pattern)!;
      const prefix = match[1],
        suffix = match[3] ?? "",
        key = prefix + ":" + suffix;
      const group = siblings.get(key) ?? { prefix, suffix, digits: [] };
      group.digits.push(Number(match[2]));
      siblings.set(key, group);
    }
    const digitClass = (digits: number[]) => {
      const ordered = [...new Set(digits)].sort((a, b) => a - b);
      if (ordered.length === 1) return String(ordered[0]);
      let text = "";
      for (let i = 0; i < ordered.length; i++) {
        let end = i;
        while (end + 1 < ordered.length && ordered[end + 1] === ordered[end] + 1) end++;
        text += end - i >= 2 ? `${ordered[i]}-${ordered[end]}` : ordered.slice(i, end + 1).join("");
        i = end;
      }
      return `[${text}]`;
    };
    const collapsed = [...siblings.values()].map((g) => g.prefix + digitClass(g.digits) + g.suffix);
    const lengths = new Map<string, number[]>(),
      compact: string[] = [];
    for (const pattern of collapsed) {
      const match = /^(.*)\[0-9\](?:\{(\d+)\})?$/.exec(pattern);
      if (!match) {
        compact.push(pattern);
        continue;
      }
      const counts = lengths.get(match[1]) ?? [];
      counts.push(Number(match[2] ?? 1));
      lengths.set(match[1], counts);
    }
    for (const [prefix, counts] of lengths) {
      counts.sort((a, b) => a - b);
      for (let i = 0; i < counts.length; i++) {
        let end = i;
        while (end + 1 < counts.length && counts[end + 1] === counts[end] + 1) end++;
        const quantifier =
          end > i ? `{${counts[i]},${counts[end]}}` : counts[i] === 1 ? "" : `{${counts[i]}}`;
        compact.push(prefix + "[0-9]" + quantifier);
        i = end;
      }
    }
    return compact;
  };
  const parts: string[] = [];
  if (min < 0) {
    const neg = positive(Math.max(1, -max), -min);
    parts.push(...neg.map((p) => "-" + p));
  }
  if (max >= 0) parts.push(...positive(Math.max(0, min), max));
  return (parts.length === 1 ? parts[0] : `(${parts.join("|")})`).replaceAll("[0-9]", "\\d");
}
export function rangeBounds(
  value: RegexRange,
  domain: [number, number],
  label: string,
  roundMinimum = false,
): [number, number] {
  const parse = (v: string, fallback: number) => {
    const s = v.trim();
    if (!s) return fallback;
    if (!/^-?\d+$/.test(s)) throw new Error(`${label}: enter whole numbers.`);
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n < domain[0] || n > domain[1])
      throw new Error(`${label}: use ${domain[0]} to ${domain[1]}.`);
    return n;
  };
  const min = parse(value.min, domain[0]),
    max = parse(value.max, domain[1]);
  if (min > max) throw new Error(`${label}: minimum exceeds maximum.`);
  return [roundMinimum && min >= 0 ? Math.max(domain[0], Math.floor(min / 10) * 10) : min, max];
}
export const hasRegexValue = (v: string | RegexRange) =>
  typeof v === "string" ? !!v.trim() : !!(v.min.trim() || v.max.trim());
export function templatePattern(
  template: string,
  bounds?: [number, number],
  slot = 0,
  advanced = false,
  unbounded = false,
): string {
  const parts = template.split("#");
  let pattern = escapeRegexLiteral(parts[0]);
  for (let i = 1; i < parts.length; i++) {
    const constrained = i - 1 === slot && bounds;
    const num = constrained
      ? unbounded
        ? `(${integerRangePattern(...bounds)}|[1-9]\\d{5,})`
        : integerRangePattern(...bounds)
      : "\\d{1,5}";
    pattern +=
      (constrained ? (bounds[0] >= 0 ? "\\+?" : "") : "[+-]?") +
      num +
      (advanced ? "(?:\\([^\\r\\n)]*\\))?" : "") +
      escapeRegexLiteral(parts[i]);
  }
  // Header/searchable modifier lines permit suffix annotations, but never longer numeric values.
  return pattern + (template.endsWith("#") ? "($|[^\\d.])" : "");
}

function compactRange(min: number, max: number): string {
  const pattern = integerRangePattern(min, max);
  if (!pattern.startsWith("(") || min < 0) return pattern;
  const low = (part: string) =>
    Number(part.replace(/\[(\d)[^\]]*\]/g, "$1").replaceAll("\\d", "0"));
  return (
    "(" +
    pattern
      .slice(1, -1)
      .split("|")
      .sort((a, b) => low(a) - low(b))
      .join("|") +
    ")"
  );
}
// Game yield headers contain nonnegative whole numbers. With a minimum only,
// a three-digit suffix covers every larger canonical integer without a long cap.
function compactMinimum(min: number): string {
  if (min === 0) return "\\d+";
  if (min < 10) return `([${min}-9]|\\d..?)`;
  if (min < 100) {
    const tens = Math.floor(min / 10),
      ones = min % 10;
    const two =
      ones === 0
        ? `[${tens}-9].`
        : tens === 9
          ? `9[${ones}-9]`
          : `${tens}[${ones}-9]|[${tens + 1}-9].`;
    return `(${two}|\\d..)`;
  }
  const width = String(min).length;
  if (min === 10 ** (width - 1)) return "\\d" + ".".repeat(width - 1);
  const sameWidth = compactRange(min, 10 ** width - 1).replaceAll("\\d", ".");
  return (
    "(" +
    (sameWidth.startsWith("(") ? sameWidth.slice(1, -1) : sameWidth) +
    "|\\d" +
    ".".repeat(width) +
    ")"
  );
}
const yieldPrefixes: Record<string, string> = {
  iir: "m rar",
  "drop-chance": "p c",
  effectiveness: "r ef",
  "monster-rarity": "r rar",
  "pack-size": "k s",
};
export function validateRegexDraft(draft: RegexDraft, allowUnknown = false): string[] {
  return compileRegexSearch(draft).errors.filter((e) => !allowUnknown || !e.startsWith("Unknown "));
}
export function compileRegexSearch(
  draft: RegexDraft,
  catalogue?: RegexCatalogue,
): CompiledRegexSearch {
  const errors: string[] = [],
    groups: SearchGroup[] = [];
  const result = (text = ""): CompiledRegexSearch => ({
    text,
    length: text.length,
    limit: REGEX_LIMIT,
    valid: errors.length === 0,
    copyable: errors.length === 0 && text.length > 0 && text.length <= REGEX_LIMIT,
    errors,
    groups,
  });
  const shape = regexDraftSchema.safeParse(draft);
  if (!shape.success) {
    errors.push(
      "Invalid search configuration: " + shape.error.issues.map((i) => i.message).join("; "),
    );
    return result();
  }
  const modifiers = new Map((catalogue?.modifiers ?? REGEX_MODIFIERS).map((m) => [m.id, m]));
  const wantedIds = new Set(draft.wanted.map((m) => m.id));
  const compileMod = (
    selection: ModifierSelection,
    negative: boolean,
  ): SearchCondition | undefined => {
    const m = modifiers.get(selection.id);
    if (!m) {
      errors.push(`Unknown modifier: ${selection.id}. Remove it or update the catalogue.`);
      return;
    }
    if (!m.categories.includes(draft.category)) {
      errors.push(`${m.label}: unavailable for this generator.`);
      return;
    }
    try {
      if (m.numericSlots) {
        const ranges = { "0": { min: selection.min, max: selection.max }, ...selection.slots };
        return {
          key: (negative ? "exclude:" : "wanted:") + m.id,
          label: m.label,
          pattern: numericSlotsPattern(m.template, m.numericSlots, ranges, true),
          copyPattern: numericSlotsPattern(m.template, m.numericSlots, ranges, true),
          negative,
          source: "modifier",
        };
      }
      if (!m.numericDomain && (selection.min.trim() || selection.max.trim()))
        throw new Error(`${m.label}: has no numeric range.`);
      const bounds = m.numericDomain
        ? rangeBounds(selection, m.numericDomain, m.label, draft.roundNumbers)
        : undefined;
      const pattern =
        "^" +
        (m.numericDomain
          ? templatePattern(
              m.template,
              hasRegexValue(selection) ? bounds : undefined,
              m.numericSlot,
              draft.category === "waystone",
            )
          : escapeRegexLiteral(m.template));
      let copyPattern = pattern;
      if (m.presencePattern) {
        copyPattern = m.presencePattern;
        if (bounds && hasRegexValue(selection)) {
          const max =
            !selection.max.trim() && m.rollRange && bounds[0] <= m.rollRange[1]
              ? m.rollRange[1]
              : bounds[1];
          // A smaller selected roll must not match a suffix of a longer roll.
          const boundary =
            m.rollRange &&
            (String(Math.max(Math.abs(m.rollRange[0]), Math.abs(m.rollRange[1]))).length >
              String(Math.abs(bounds[0])).length ||
              m.rollRange[0] < 0)
              ? bounds[0] < 0
                ? "(^|[^\\d-])"
                : "\\b"
              : "";
          const numeric = boundary + compactRange(bounds[0], max) + "\\(";
          const sample = m.template.replaceAll("#", "0");
          const match = new RegExp(m.presencePattern, "i").exec(sample)!;
          copyPattern =
            match.index > sample.indexOf("0")
              ? numeric + ".*" + m.presencePattern
              : m.presencePattern + ".*" + numeric;
        }
      }
      return {
        key: (negative ? "exclude:" : "wanted:") + m.id,
        label: m.label,
        pattern,
        copyPattern,
        negative,
        source: "modifier",
      };
    } catch (e) {
      errors.push((e as Error).message);
    }
  };
  const wanted = draft.wanted
    .map((m) => compileMod(m, false))
    .filter((m): m is SearchCondition => !!m);
  const dedupe = (conditions: SearchCondition[]) =>
    Array.from(new Map(conditions.map((c) => [c.pattern + ":" + c.negative, c])).values());
  if (wanted.length) groups.push({ operator: draft.match, conditions: dedupe(wanted) });
  for (const m of draft.unwanted) {
    if (wantedIds.has(m.id)) errors.push(`${m.id}: cannot be both wanted and unwanted.`);
    const c = compileMod(m, true);
    if (c) groups.push({ operator: "all", conditions: [c] });
  }
  for (const [id, value] of Object.entries(draft.properties)) {
    if (!hasRegexValue(value)) continue;
    const p = (catalogue?.properties ?? REGEX_PROPERTIES).find((p) => p.id === id);
    if (!p) {
      errors.push(`Unknown property: ${id}.`);
      continue;
    }
    if (!p.categories.includes(draft.category)) {
      errors.push(`${p.label}: unavailable for this generator.`);
      continue;
    }
    try {
      let pattern: string,
        copyPattern: string | undefined,
        negative = false;
      if (p.kind === "range") {
        if (typeof value === "string") throw new Error(`${p.label}: enter a range.`);
        if (p.scale) {
          pattern = numericSlotsPattern(
            p.templates![0],
            [
              {
                index: 0,
                scale: p.scale,
                domain: p.numericDomain!,
                unit: "rate",
                sign: "positive",
              },
            ],
            { "0": value },
          );
          groups.push({
            operator: "all",
            conditions: [
              {
                key: "property:" + id,
                label: p.label,
                pattern,
                negative: false,
                source: "property",
                propertyId: id,
              },
            ],
          });
          continue;
        }
        const bounds = rangeBounds(value, p.numericDomain!, p.label, draft.roundNumbers);
        if (bounds[0] === p.numericDomain![0] && bounds[1] === p.numericDomain![1]) continue;
        pattern = (p.searchTemplates ?? p.templates)!
          .map((t) =>
            templatePattern(t, bounds, 0, false, !!yieldPrefixes[id] && !value.max.trim()),
          )
          .join("|");
        if (["required-level", "item-level", "quality", "sockets"].includes(id))
          pattern = "^" + pattern;
        if (id === "tier") copyPattern = "er " + compactRange(...bounds) + "\\)";
        else if (id === "revives") copyPattern = "le: " + compactRange(...bounds);
        else if (yieldPrefixes[id] && !value.max.trim())
          copyPattern = yieldPrefixes[id] + ".*" + compactMinimum(bounds[0]) + "%";
      } else {
        if (typeof value !== "string") throw new Error(`${p.label}: choose one value.`);
        if (p.kind === "select" && !p.options?.some((o) => o.value === value))
          throw new Error(`${p.label}: select a valid option.`);
        if (id === "rarity") {
          const values = value.split(",");
          pattern = "^Rarity: *(" + values.map(escapeRegexLiteral).join("|") + ")$";
          if (draft.category === "waystone" && value === "normal,magic,rare") continue;
          const initials = values.map((v) => v[0]);
          copyPattern =
            "y: " + (initials.length === 1 ? initials[0] : "(" + initials.join("|") + ")");
        } else if (id === "corrupted") {
          pattern = "^Corrupted$";
          negative = value === "false";
          copyPattern = "corr";
        } else if (id === "delirious") {
          pattern = "^Players in area are [0-9]+% Delirious";
          negative = value === "false";
          copyPattern = "delir";
        } else if (id === "item-class") {
          const classLabels: Record<string, string[]> = {
            Ring: ["Rings"],
            Amulet: ["Amulets"],
            Belt: ["Belts"],
            Helmet: ["Helmets"],
            "Body Armour": ["Body Armours"],
            Boots: ["Boots"],
            Gloves: ["Gloves"],
            Staff: ["Staves"],
            Quarterstaff: ["Quarterstaves"],
            Focus: ["Foci"],
            Flask: ["Life Flasks", "Mana Flasks"],
            "One Hand Mace": ["One Hand Maces"],
            "Two Hand Mace": ["Two Hand Maces"],
          };
          const labels = [
            ...new Set([
              value,
              ...(classLabels[value] ?? [value.endsWith("s") ? value : value + "s"]),
            ]),
          ];
          pattern = "^Item Class: *(" + labels.map(escapeRegexLiteral).join("|") + ")$";
        } else pattern = escapeRegexLiteral(value.trim());
      }
      groups.push({
        operator: "all",
        conditions: [
          {
            key: "property:" + id,
            label: p.label,
            pattern,
            copyPattern,
            negative,
            source: p.kind === "text" ? "text" : "property",
            propertyId: id,
          },
        ],
      });
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  if (draft.text.trim())
    groups.push({
      operator: "all",
      conditions: [
        {
          key: "text",
          label: "Additional text",
          pattern: escapeRegexLiteral(draft.text.trim()),
          negative: false,
          source: "text",
        },
      ],
    });
  // Verified reference: poe2.re WaystoneResult.ts, quoted ! negation, token AND and pipe OR.
  const quote = (c: SearchCondition) => `"${c.negative ? "!" : ""}${c.copyPattern ?? c.pattern}"`;
  const tokens = groups.flatMap((g) =>
    g.operator === "any" && g.conditions.length > 1
      ? [`"${g.conditions.map((c) => c.copyPattern ?? c.pattern).join("|")}"`]
      : g.conditions.map(quote),
  );
  // De Morgan: !A AND !B is !(A OR B), so combine exclusions without changing groups.
  const positives = tokens.filter((t) => !t.startsWith('"!'));
  const negatives = tokens.filter((t) => t.startsWith('"!')).map((t) => t.slice(2, -1));
  const firstNegative = tokens.findIndex((t) => t.startsWith('"!'));
  if (negatives.length)
    positives.splice(firstNegative, 0, '"!' + [...new Set(negatives)].join("|") + '"');
  return result([...new Set(positives)].join(" "));
}

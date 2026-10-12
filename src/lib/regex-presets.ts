import { z } from "zod";
import { REGEX_CATEGORIES } from "./regex-catalogue";
import {
  regexDraftSchema,
  regexPresetSchema,
  type RegexCategory,
  type RegexDraft,
  type RegexPreset,
} from "./regex-schema";
import { validateRegexDraft } from "./regex-search";
const envelope = z
  .object({
    format: z.literal("exile-atlas-regex"),
    version: z.literal(1),
    presets: z.array(regexPresetSchema).max(100),
  })
  .strict();
function validatePreset(p: RegexPreset): RegexPreset {
  const errors = validateRegexDraft(p.draft, true);
  if (errors.length) throw new Error(errors.join(" "));
  return p;
}
export function parseRegexPresetImport(text: string, currentCount: number): RegexPreset[] {
  if (new TextEncoder().encode(text).length > 1048576)
    throw new Error("Preset imports must be at most 1 MiB.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid JSON preset file.");
  }
  const parsed = envelope.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      "Invalid preset file: check the format, version, categories, names, dates and size.",
    );
  if (currentCount + parsed.data.presets.length > 100)
    throw new Error("The library can hold at most 100 presets.");
  return parsed.data.presets.map((p) => ({ ...validatePreset(p), id: crypto.randomUUID() }));
}
export function exportRegexPresets(presets: RegexPreset[]): string {
  const valid = envelope.parse({ format: "exile-atlas-regex", version: 1, presets });
  valid.presets.forEach(validatePreset);
  return JSON.stringify(valid, null, 2) + "\n";
}
export function decodeRegexState(raw: unknown): {
  drafts: Partial<Record<RegexCategory, RegexDraft>>;
  presets: RegexPreset[];
  activeTab: RegexCategory | "presets";
  warnings: string[];
} {
  const out: {
    drafts: Partial<Record<RegexCategory, RegexDraft>>;
    presets: RegexPreset[];
    activeTab: RegexCategory | "presets";
    warnings: string[];
  } = { drafts: {}, presets: [], activeTab: "waystone", warnings: [] };
  if (!raw || typeof raw !== "object") return out;
  const value = raw as { drafts?: unknown; presets?: unknown; activeTab?: unknown };
  if (value.activeTab === "presets" || REGEX_CATEGORIES.some((c) => c.id === value.activeTab))
    out.activeTab = value.activeTab as typeof out.activeTab;
  if (value.drafts && typeof value.drafts === "object")
    for (const c of REGEX_CATEGORIES) {
      const parsed = regexDraftSchema.safeParse((value.drafts as Record<string, unknown>)[c.id]);
      if (
        parsed.success &&
        parsed.data.category === c.id &&
        !validateRegexDraft(parsed.data, true).length
      )
        out.drafts[c.id] = parsed.data;
      else if (c.id in value.drafts) out.warnings.push("An invalid saved draft was reset.");
    }
  const ids = new Set<string>();
  if (Array.isArray(value.presets))
    for (const p of value.presets) {
      const parsed = regexPresetSchema.safeParse(p);
      if (
        parsed.success &&
        !ids.has(parsed.data.id) &&
        !validateRegexDraft(parsed.data.draft, true).length &&
        out.presets.length < 100
      ) {
        out.presets.push(parsed.data);
        ids.add(parsed.data.id);
      } else out.warnings.push("An invalid or duplicate stored preset was ignored.");
    }
  return out;
}

import { normalizeNumericTemplate } from "./numeric-template";
import { createHash } from "node:crypto";
import { parseLuaLiterals, type LiteralValue } from "./lua-literals";
import {
  validateGameSnapshot,
  type GameSnapshot,
  type ModifierDefinition,
} from "../../lib/game-data";
const object = (v: LiteralValue): Record<string, LiteralValue> =>
  v && typeof v === "object" ? v : {};
const strings = (v: LiteralValue | undefined): string[] =>
  v && typeof v === "object"
    ? Object.keys(v)
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => v[k])
        .filter((s): s is string => typeof s === "string")
    : [];
export function normalizePobBundle(
  files: Record<string, string>,
  sourceRefs: GameSnapshot["sourceRefs"],
): GameSnapshot {
  const modifiers: ModifierDefinition[] = [],
    bases: GameSnapshot["bases"] = [],
    diagnostics: string[] = [];
  for (const [path, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    let root: Record<string, LiteralValue>;
    try {
      root = path.startsWith("Base-")
        ? baseRecords(content, diagnostics)
        : object(parseLuaLiterals(content));
    } catch (error) {
      throw new Error(`${path}: ${error instanceof Error ? error.message : "Invalid literal"}`);
    }
    for (const [id, raw] of Object.entries(root)) {
      const r = object(raw);
      if (path.startsWith("Base-")) {
        if (r.hidden === true || /\[DNT\]/.test(id)) {
          diagnostics.push(`${path}:${id}: hidden base excluded`);
          continue;
        }
        if (typeof r.name === "string" || Object.keys(r).length) {
          const tags = strings(r.tags);
          for (const [tag, on] of Object.entries(object(r.tags ?? null)))
            if (on === true) tags.push(tag);
          bases.push({
            id,
            name: typeof r.name === "string" ? r.name : id,
            itemClass: typeof r.type === "string" ? r.type : path.slice(5, -4),
            tags: [...new Set(tags)],
            requiredLevel:
              typeof object(r.req ?? null).level === "number"
                ? Number(object(r.req ?? null).level)
                : undefined,
          });
        }
        continue;
      }
      const rawTemplates = strings(r);
      if (!rawTemplates.length) {
        diagnostics.push(`${path}:${id}: no literal stat lines`);
        continue;
      }
      const slots: ModifierDefinition["numericSlots"] = [];
      const templates = rawTemplates.map((t) => normalizeNumericTemplate(t, slots));
      const weights = object(r.weightVal ?? null);
      const keys = strings(r.weightKey);
      modifiers.push({
        id: `${path.replace(/\.lua$/, "")}:${id}`,
        category: path.replace(/^Mod|\.lua$/g, ""),
        affixType: r.type === "Prefix" || r.type === "Suffix" ? r.type : undefined,
        name: typeof r.affix === "string" ? r.affix : undefined,
        requiredLevel: typeof r.level === "number" ? r.level : undefined,
        group: typeof r.group === "string" ? r.group : undefined,
        tags: strings(r.modTags),
        eligibilityRules: keys.map((tag, i) => ({
          tag,
          value: Number(weights[String(i + 1)] ?? 0),
        })),
        templates,
        numericSlots: slots,
        tradeMappings: Object.keys(object(r.tradeHashes ?? null)).map((hash) => ({
          id: `explicit.stat_${hash}`,
          semantics:
            templates.reduce((n, t) => n + (t.match(/#/g)?.length ?? 0), 0) > 1
              ? "average"
              : "exact",
        })),
      });
    }
  }
  const payload = {
    schemaVersion: 1 as const,
    sourceRefs,
    bases,
    modifiers,
    stats: [],
    regexDefinitions: [],
    currencyOperations: [],
    diagnostics,
  };
  const id = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return validateGameSnapshot({ ...payload, id, verifiedAt: "2026-10-13" });
}
function baseRecords(source: string, diagnostics: string[]): Record<string, LiteralValue> {
  const clean = source.replace(/^\s*--[^\n]*\n/gm, "");
  if (!/^\s*return function\s*\(itemBases\)/.test(clean) || !/\bend\s*$/.test(clean))
    throw new Error("Unsupported base wrapper");
  const body = clean.replace(/^\s*return function\s*\(itemBases\)/, "").replace(/\bend\s*$/, "");
  const records: Record<string, LiteralValue> = Object.create(null);
  const parts = body.split(/(?=^itemBases\[)/m);
  let variant = 0;
  for (const part of parts) {
    if (!part.trim()) continue;
    const match = part.match(/^itemBases\[("(?:[^"\\]|\\.)*")\]\s*=\s*([\s\S]+)$/);
    if (!match) throw new Error("Unsupported base assignment");
    const name = String(parseLuaLiterals(match[1]));
    let row: Record<string, LiteralValue>;
    try {
      row = object(parseLuaLiterals(match[2]));
    } catch (error) {
      diagnostics.push(
        `${name}: base table rejected: ${error instanceof Error ? error.message : "Invalid table"}`,
      );
      continue;
    }
    const key = Object.hasOwn(records, name) ? `${name}:variant-${++variant}` : name;
    records[key] = { ...row, name };
  }
  return records;
}

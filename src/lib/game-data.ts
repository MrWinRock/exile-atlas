import { z } from "zod";
import type { ParsedItem, ParsedModifier } from "./item-text";
const sourceSchema = z
  .object({
    source: z.string(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    url: z.url(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const slotSchema = z
  .object({
    index: z.number().int().nonnegative(),
    scale: z.union([z.literal(1), z.literal(10), z.literal(100)]),
    domain: z.tuple([z.number().finite(), z.number().finite()]),
    unit: z.string(),
    sign: z.enum(["positive", "signed"]),
  })
  .strict();
export const modifierDefinitionSchema = z.object({
  id: z.string().min(1),
  category: z.string(),
  affixType: z.enum(["Prefix", "Suffix"]).optional(),
  name: z.string().optional(),
  requiredLevel: z.number().int().nonnegative().optional(),
  group: z.string().optional(),
  tags: z.array(z.string()),
  eligibilityRules: z.array(z.object({ tag: z.string(), value: z.number() })),
  templates: z.array(z.string()),
  numericSlots: z.array(slotSchema),
  tradeMappings: z.array(
    z.object({ id: z.string(), semantics: z.enum(["exact", "average", "presence"]) }),
  ),
});
const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  itemClass: z.string(),
  tags: z.array(z.string()),
  requiredLevel: z.number().optional(),
});
export const gameSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-f0-9]{64}$/),
    sourceRefs: z.array(sourceSchema).min(1),
    verifiedAt: z.string(),
    bases: z.array(baseSchema),
    modifiers: z.array(modifierDefinitionSchema),
    stats: z.array(z.object({ id: z.string(), text: z.string(), type: z.string() })),
    regexDefinitions: z.array(
      z.object({
        id: z.string(),
        template: z.string(),
        categories: z.array(z.string()),
        tradeStatId: z.string().optional(),
        numericSlots: z.array(slotSchema).optional(),
        sourceUrl: z.url().optional(),
      }),
    ),
    currencyOperations: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        effect: z.string(),
        rarities: z.array(z.string()),
        source: z.url(),
        addsAffix: z.boolean().optional(),
      }),
    ),
    diagnostics: z.array(z.string()),
  })
  .strict();
export type GameSnapshot = z.infer<typeof gameSnapshotSchema>;
export type ModifierDefinition = z.infer<typeof modifierDefinitionSchema>;
export type BaseDefinition = z.infer<typeof baseSchema>;
export function validateGameSnapshot(raw: unknown): GameSnapshot {
  const s = gameSnapshotSchema.parse(raw);
  for (const records of [s.bases, s.modifiers, s.regexDefinitions])
    if (new Set(records.map((r) => r.id)).size !== records.length)
      throw new Error("Duplicate data identities");
  for (const m of s.modifiers)
    for (const slot of m.numericSlots)
      if (slot.domain[0] > slot.domain[1]) throw new Error("Invalid numeric domain");
  return s;
}
export function templateMatcher(template: string): RegExp {
  return new RegExp(
    "^" +
      template
        .split("#")
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("([+-]?\\d+(?:\\.\\d+)?)") +
      "$",
    "i",
  );
}
export function modifierEligibility(
  mod: ModifierDefinition,
  base: BaseDefinition | undefined,
  level: number | undefined,
): "eligible" | "ineligible" | "unknown" {
  if (base) {
    const special = ["Flask", "Charm", "Jewel"];
    if (special.includes(mod.category) && mod.category !== base.itemClass) return "ineligible";
    if (
      special.includes(base.itemClass) &&
      ["Item", "ItemExclusive", "Veiled"].includes(mod.category)
    )
      return "ineligible";
  }
  if (level !== undefined && mod.requiredLevel !== undefined && level < mod.requiredLevel)
    return "ineligible";
  if (!base || level === undefined || !mod.eligibilityRules.length) return "unknown";
  const rule = mod.eligibilityRules.find((r) => r.tag === "default" || base.tags.includes(r.tag));
  return rule ? (rule.value > 0 ? "eligible" : "ineligible") : "unknown";
}
export type ModifierMatch = {
  line: ParsedModifier;
  candidates: ModifierDefinition[];
  status: "exact" | "ambiguous" | "unknown";
};
export function matchItemModifiers(item: ParsedItem, snapshot: GameSnapshot): ModifierMatch[] {
  const base = snapshot.bases.find((b) => b.name === item.base || b.name === item.name);
  const matchesTemplate = (
    line: ParsedModifier,
    mod: ModifierDefinition,
    templateIndex: number,
  ) => {
    const match = line.text.match(templateMatcher(mod.templates[templateIndex]));
    const offset = mod.templates
      .slice(0, templateIndex)
      .reduce((n, t) => n + (t.match(/#/g)?.length ?? 0), 0);
    return (
      !!match &&
      match
        .slice(1)
        .every(
          (n, i) =>
            !mod.numericSlots[offset + i] ||
            (Number(n) >= mod.numericSlots[offset + i].domain[0] &&
              Number(n) <= mod.numericSlots[offset + i].domain[1]),
        )
    );
  };
  return item.modifiers.map((line) => {
    const candidates = snapshot.modifiers.filter(
      (m) =>
        modifierEligibility(m, base, item.itemLevel) !== "ineligible" &&
        m.templates.some((_, i) => matchesTemplate(line, m, i)),
    );
    const sole = candidates.length === 1 ? candidates[0] : undefined;
    const complete = sole?.templates.every((_, i) =>
      item.modifiers.some((other) => matchesTemplate(other, sole, i)),
    );
    return {
      line,
      candidates,
      status:
        sole && complete && base && modifierEligibility(sole, base, item.itemLevel) === "eligible"
          ? "exact"
          : candidates.length
            ? "ambiguous"
            : "unknown",
    };
  });
}

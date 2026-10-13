import {
  REGEX_MODIFIERS,
  REGEX_PROPERTIES,
  REGEX_CATEGORIES,
  REGEX_SOURCE,
  type RegexModifier,
  type RegexProperty,
} from "./regex-catalogue";
import type { GameSnapshot } from "./game-data";
import type { RegexCategory } from "./regex-schema";
export type RegexCatalogue = {
  snapshotId?: string;
  modifiers: RegexModifier[];
  properties: RegexProperty[];
  categories: typeof REGEX_CATEGORIES;
};
export const defaultRegexCatalogue: RegexCatalogue = {
  modifiers: REGEX_MODIFIERS,
  properties: REGEX_PROPERTIES,
  categories: REGEX_CATEGORIES,
};
const hash = (s: string) => {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16);
};
export function buildRegexCatalogue(snapshot: GameSnapshot): RegexCatalogue {
  const source = {
    ...REGEX_SOURCE,
    revision: snapshot.sourceRefs[0].revision,
    verified: snapshot.verifiedAt,
  };
  const modifiers = [...REGEX_MODIFIERS];
  const templates = new Map<string, RegexModifier>();
  for (const m of snapshot.modifiers) {
    const template = m.templates.join("\n");
    if (!template) continue;
    const previous = templates.get(template);
    if (previous) {
      m.numericSlots.forEach((s, i) => {
        const slot = previous.numericSlots?.[i];
        if (slot) {
          slot.domain = [
            Math.min(slot.domain[0], s.domain[0]),
            Math.max(slot.domain[1], s.domain[1]),
          ];
        }
      });
      continue;
    }
    const slots = structuredClone(m.numericSlots);
    const entry: RegexModifier = {
      id: `pob:${m.group ?? m.category}:${hash(template)}`,
      categories: ["vendor", "equipment"],
      label: template.replaceAll("\n", " · "),
      template,
      numericSlots: slots,
      numericDomain: slots[0]?.domain,
      tradeStatId: m.tradeMappings.length === 1 ? m.tradeMappings[0].id : undefined,
      tradeSemantics: m.tradeMappings.length === 1 ? m.tradeMappings[0].semantics : "unmapped",
      source,
    };
    templates.set(template, entry);
  }
  modifiers.push(...templates.values());
  const seen = new Set(modifiers.flatMap((m) => m.categories.map((c) => `${c}:${m.template}`)));
  for (const r of snapshot.regexDefinitions) {
    const categories = r.categories.filter(
      (c) => !seen.has(`${c}:${r.template}`),
    ) as RegexCategory[];
    if (!categories.length) continue;
    const slots = r.numericSlots ?? (r.template.includes("#") ? [] : undefined);
    modifiers.push({
      id: r.id,
      categories,
      label: r.template,
      template: r.template,
      tradeStatId: r.tradeStatId,
      tradeSemantics: (slots?.length ?? 0) > 1 ? "average" : r.tradeStatId ? "exact" : "unmapped",
      numericSlots: slots,
      numericDomain: slots?.[0]?.domain,
      source: { ...source, url: r.sourceUrl ?? source.url },
    });
    categories.forEach((c) => seen.add(`${c}:${r.template}`));
  }
  const equipment: RegexCategory[] = ["vendor", "equipment"];
  const properties: RegexProperty[] = [
    ...REGEX_PROPERTIES,
    {
      id: "item-class",
      label: "Item class",
      categories: equipment,
      kind: "select",
      options: [
        ...new Set([
          ...snapshot.bases.map((b) => b.itemClass),
          ...(snapshot.bases.some((b) => b.tags.includes("warstaff")) ? ["Quarterstaff"] : []),
          ...(snapshot.bases.some((b) => b.tags.includes("buckler")) ? ["Buckler"] : []),
        ]),
      ]
        .sort()
        .map((value) => ({ value, label: value })),
      source,
    },
    {
      id: "verified-base",
      label: "Verified base",
      categories: equipment,
      kind: "select",
      options: snapshot.bases.map((b) => ({ value: b.name, label: b.name })),
      source,
    },
    {
      id: "required-level",
      label: "Required level",
      categories: equipment,
      kind: "range",
      templates: ["Level: #"],
      numericDomain: [0, 100],
      source,
    },
    {
      id: "attack-rate",
      label: "Attacks per Second",
      categories: equipment,
      kind: "range",
      templates: ["Attacks per Second: #"],
      numericDomain: [0, 100],
      scale: 100,
      source,
    },
  ];
  properties.push(
    ...(
      [
        ["item-level", "Item level", "Item Level: #", 100],
        ["quality", "Quality", "Quality: #% ", 100],
        ["sockets", "Sockets", "Sockets: #", 10],
      ] as const
    ).map(([id, label, template, max]): RegexProperty => ({
      id,
      label,
      categories: equipment,
      kind: "range",
      templates: [template.trimEnd()],
      numericDomain: [0, max],
      source,
    })),
  );
  return { snapshotId: snapshot.id, modifiers, properties, categories: REGEX_CATEGORIES };
}

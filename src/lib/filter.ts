import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
const strictnessSchema = z.enum(["soft", "regular", "semi-strict", "strict", "very-strict"]);
export type FilterCategory =
  "currency" | "unique" | "waystones" | "gems" | "rare" | "magic" | "normal";
const filterRuleStyleSchema = z.object({
  visible: z.boolean(),
  textColor: colorSchema,
  borderColor: colorSchema,
  backgroundColor: colorSchema,
  fontSize: z.number().int().min(18).max(45),
  sound: z.number().int().min(0).max(16),
});
export type FilterRuleStyle = z.infer<typeof filterRuleStyleSchema>;
const stylesSchema = z.object({
  currency: filterRuleStyleSchema.optional(),
  unique: filterRuleStyleSchema.optional(),
  waystones: filterRuleStyleSchema.optional(),
  gems: filterRuleStyleSchema.optional(),
  rare: filterRuleStyleSchema.optional(),
  magic: filterRuleStyleSchema.optional(),
  normal: filterRuleStyleSchema.optional(),
});
export const filterSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  fontSize: z.number().int().min(18).max(45),
  rareColor: colorSchema,
  showNormal: z.boolean(),
  showMagic: z.boolean(),
  sounds: z.boolean(),
  strictness: strictnessSchema.optional(),
  styles: stylesSchema.optional(),
});
export type FilterSettings = z.infer<typeof filterSettingsSchema>;
type Strictness = z.infer<typeof strictnessSchema>;
type FilterTheme = "atlas" | "classic" | "contrast";

export const filterCategories: {
  id: FilterCategory;
  label: string;
  description: string;
  example: string;
}[] = [
  {
    id: "currency",
    label: "Currency",
    description: "Stackable currency and crafting orbs.",
    example: "Exalted Orb",
  },
  {
    id: "unique",
    label: "Unique items",
    description: "Unique drops across all equipment classes.",
    example: "Goldrim",
  },
  {
    id: "waystones",
    label: "Waystones",
    description: "Waystones at every tier and rarity.",
    example: "Waystone (Tier 15)",
  },
  {
    id: "gems",
    label: "Uncut gems",
    description: "Uncut skill, support and spirit gems.",
    example: "Uncut Skill Gem",
  },
  {
    id: "rare",
    label: "Rare equipment",
    description: "Rare weapons, armour and jewellery; strict presets filter by item level.",
    example: "Expert Dualstring Bow",
  },
  {
    id: "magic",
    label: "Magic equipment",
    description: "Magic weapons, armour and jewellery.",
    example: "Attuned Wand",
  },
  {
    id: "normal",
    label: "Normal equipment",
    description: "Normal weapons, armour and jewellery.",
    example: "Iron Greathelm",
  },
];
export const strictnessPresets: { id: Strictness; label: string; description: string }[] = [
  {
    id: "soft",
    label: "Soft",
    description: "Show all equipment. A starting point for the campaign.",
  },
  {
    id: "regular",
    label: "Regular",
    description: "Hide normal equipment; keep magic and rare drops.",
  },
  { id: "semi-strict", label: "Semi-strict", description: "Hide normal and magic equipment." },
  { id: "strict", label: "Strict", description: "Show rare equipment from item level 65." },
  {
    id: "very-strict",
    label: "Very strict",
    description: "Show rare equipment from item level 80.",
  },
];
export const filterThemes: { id: FilterTheme; label: string; colors: string[] }[] = [
  {
    id: "atlas",
    label: "Atlas",
    colors: ["#e2cf9b", "#e79254", "#9bc7e9", "#69cbbb", "#e9b56c", "#a39bff", "#c8ceca"],
  },
  {
    id: "classic",
    label: "Classic",
    colors: ["#aa9e82", "#af6025", "#ffffff", "#1ba29b", "#ffff77", "#8888ff", "#c8c8c8"],
  },
  {
    id: "contrast",
    label: "High contrast",
    colors: ["#fff5ac", "#ffac65", "#b8e5ff", "#7dffdb", "#ffff65", "#c9bdff", "#ffffff"],
  },
];
export const defaultFilterSettings: FilterSettings = {
  name: "My PoE2 filter",
  fontSize: 40,
  rareColor: "#e9b56c",
  showNormal: false,
  showMagic: true,
  sounds: true,
  strictness: "regular",
};

/** Repair browser drafts field by field so old or damaged settings remain editable. */
export function normalizeFilterSettings(input: unknown): FilterSettings {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fields = filterSettingsSchema.shape;
  const settings: FilterSettings = {
    name: fields.name.safeParse(source.name).data ?? defaultFilterSettings.name,
    fontSize: fields.fontSize.safeParse(source.fontSize).data ?? defaultFilterSettings.fontSize,
    rareColor: fields.rareColor.safeParse(source.rareColor).data ?? defaultFilterSettings.rareColor,
    showNormal:
      fields.showNormal.safeParse(source.showNormal).data ?? defaultFilterSettings.showNormal,
    showMagic: fields.showMagic.safeParse(source.showMagic).data ?? defaultFilterSettings.showMagic,
    sounds: fields.sounds.safeParse(source.sounds).data ?? defaultFilterSettings.sounds,
    strictness: strictnessSchema.safeParse(source.strictness).data ?? "regular",
  };
  if (source.styles && typeof source.styles === "object") {
    const styles: NonNullable<FilterSettings["styles"]> = {};
    for (const { id } of filterCategories) {
      const result = filterRuleStyleSchema.safeParse(
        (source.styles as Record<string, unknown>)[id],
      );
      if (result.success) styles[id] = result.data;
    }
    if (Object.keys(styles).length) settings.styles = styles;
  }
  return settings;
}

export function getFilterStyle(input: FilterSettings, category: FilterCategory): FilterRuleStyle {
  const s = normalizeFilterSettings(input);
  const colors: Record<FilterCategory, string> = {
    currency: "#aa9e82",
    unique: "#af6025",
    waystones: "#9bc7e9",
    gems: "#69cbbb",
    rare: s.rareColor,
    magic: "#8888ff",
    normal: "#c8c8c8",
  };
  const sizes: Record<FilterCategory, number> = {
    currency: s.fontSize,
    unique: 45,
    waystones: 40,
    gems: 38,
    rare: s.fontSize,
    magic: 32,
    normal: 28,
  };
  return {
    visible: category === "normal" ? s.showNormal : category === "magic" ? s.showMagic : true,
    textColor: colors[category],
    borderColor: colors[category],
    backgroundColor: "#101513",
    fontSize: sizes[category],
    sound: category === "unique" && s.sounds ? 6 : 0,
    ...s.styles?.[category],
  };
}

export function applyFilterPreset(input: FilterSettings, id: Strictness): FilterSettings {
  const settings = normalizeFilterSettings(input);
  const strictness = strictnessSchema.parse(id);
  const styles: NonNullable<FilterSettings["styles"]> = {};
  for (const { id: category } of filterCategories) {
    const visible =
      category === "normal"
        ? strictness === "soft"
        : category === "magic"
          ? strictness === "soft" || strictness === "regular"
          : true;
    styles[category] = { ...getFilterStyle(settings, category), visible };
  }
  return {
    ...settings,
    strictness,
    showNormal: strictness === "soft",
    showMagic: strictness === "soft" || strictness === "regular",
    styles,
  };
}

export function applyFilterTheme(input: FilterSettings, id: FilterTheme): FilterSettings {
  const settings = normalizeFilterSettings(input);
  const theme = filterThemes.find((entry) => entry.id === id);
  if (!theme) throw new Error("Choose an available filter theme");
  const styles: NonNullable<FilterSettings["styles"]> = {};
  filterCategories.forEach(({ id: category }, index) => {
    styles[category] = {
      ...getFilterStyle(settings, category),
      textColor: theme.colors[index],
      borderColor: theme.colors[index],
      backgroundColor: id === "contrast" ? "#000000" : "#101513",
    };
  });
  return { ...settings, rareColor: styles.rare!.textColor, styles };
}

function rareItemLevel(settings: FilterSettings): number {
  return settings.strictness === "strict" ? 65 : settings.strictness === "very-strict" ? 80 : 0;
}

// Exact class names from GGG's PoE2 item-filter announcements and NeverSink's PoE2 filter.
// Restrict equipment hiding to known classes; new or uncategorized drops reach the final Show.
const equipmentClasses = [
  "Body Armours",
  "Helmets",
  "Boots",
  "Gloves",
  "Shields",
  "Bucklers",
  "Foci",
  "Bows",
  "Crossbows",
  "One Hand Maces",
  "Two Hand Maces",
  "Quarterstaves",
  "Quivers",
  "Sceptres",
  "Spears",
  "Staves",
  "Talismans",
  "Wands",
  "Rings",
  "Amulets",
  "Belts",
];
const equipmentCondition = "Class == " + equipmentClasses.map((name) => `"${name}"`).join(" ");
function rgb(color: string): string {
  return color
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16))
    .join(" ");
}
function ruleBlock(conditions: string[], style: FilterRuleStyle): string {
  return [
    style.visible ? "Show" : "Hide",
    ...conditions.map((line) => "    " + line),
    `    SetTextColor ${rgb(style.textColor)}`,
    `    SetBorderColor ${rgb(style.borderColor)}`,
    `    SetBackgroundColor ${rgb(style.backgroundColor)}`,
    `    SetFontSize ${style.fontSize}`,
    ...(style.visible && style.sound ? [`    PlayAlertSound ${style.sound} 200`] : []),
  ].join("\n");
}

export function generateFilter(input: FilterSettings): string {
  const s = filterSettingsSchema.parse(input);
  const rare = getFilterStyle(s, "rare"),
    threshold = rareItemLevel(s);
  const blocks = [
    `# ${s.name.replace(/[\r\n]/g, " ")} — generated by Exile Atlas\n# Path of Exile 2\n# Strictness: ${s.strictness ?? "regular"}`,
    ruleBlock(['Class == "Stackable Currency"'], getFilterStyle(s, "currency")),
    ruleBlock(["Rarity == Unique"], getFilterStyle(s, "unique")),
    ruleBlock(['Class == "Waystones"'], getFilterStyle(s, "waystones")),
    ruleBlock(
      ['Class == "Uncut Skill Gems" "Uncut Support Gems" "Uncut Spirit Gems"'],
      getFilterStyle(s, "gems"),
    ),
    ruleBlock(
      [
        "Rarity == Rare",
        equipmentCondition,
        ...(rare.visible && threshold ? [`ItemLevel >= ${threshold}`] : []),
      ],
      rare,
    ),
    ...(rare.visible && threshold
      ? [ruleBlock(["Rarity == Rare", equipmentCondition], { ...rare, visible: false })]
      : []),
    ruleBlock(["Rarity == Magic", equipmentCondition], getFilterStyle(s, "magic")),
    ruleBlock(["Rarity == Normal", equipmentCondition], getFilterStyle(s, "normal")),
    "# Keep uncategorized drops visible.\nShow",
  ];
  return blocks.join("\n\n") + "\n";
}

export type FilterSampleItem = {
  id: string;
  name: string;
  category: FilterCategory;
  itemLevel: number;
};
export const sampleFilterLoot: FilterSampleItem[] = [
  { id: "exalted", name: "Exalted Orb", category: "currency", itemLevel: 80 },
  { id: "divine", name: "Divine Orb", category: "currency", itemLevel: 83 },
  { id: "chaos", name: "Chaos Orb", category: "currency", itemLevel: 65 },
  { id: "goldrim", name: "Goldrim", category: "unique", itemLevel: 12 },
  { id: "wanderlust", name: "Wanderlust", category: "unique", itemLevel: 80 },
  { id: "waystone-15", name: "Waystone (Tier 15)", category: "waystones", itemLevel: 79 },
  { id: "waystone-1", name: "Waystone (Tier 1)", category: "waystones", itemLevel: 65 },
  { id: "skill-gem", name: "Uncut Skill Gem", category: "gems", itemLevel: 75 },
  { id: "support-gem", name: "Uncut Support Gem", category: "gems", itemLevel: 35 },
  { id: "spirit-gem", name: "Uncut Spirit Gem", category: "gems", itemLevel: 60 },
  { id: "expert-bow", name: "Expert Dualstring Bow", category: "rare", itemLevel: 80 },
  { id: "rare-plate", name: "Steel Plate", category: "rare", itemLevel: 65 },
  { id: "rare-boots", name: "Ringmail Boots", category: "rare", itemLevel: 42 },
  { id: "magic-wand", name: "Attuned Wand", category: "magic", itemLevel: 72 },
  { id: "magic-ring", name: "Ruby Ring", category: "magic", itemLevel: 30 },
  { id: "normal-helm", name: "Iron Greathelm", category: "normal", itemLevel: 18 },
  { id: "normal-bow", name: "Shortbow", category: "normal", itemLevel: 8 },
];

/** Evaluate generated settings only. This does not parse or simulate arbitrary .filter source. */
export function evaluateFilterSample(
  input: FilterSettings,
  item: FilterSampleItem,
): {
  visible: boolean;
  style: FilterRuleStyle;
  reason: string;
} {
  const settings = normalizeFilterSettings(input),
    style = getFilterStyle(settings, item.category);
  const label = filterCategories.find((entry) => entry.id === item.category)!.label;
  if (!style.visible)
    return { visible: false, style, reason: `${label} are hidden by your settings.` };
  const threshold = item.category === "rare" ? rareItemLevel(settings) : 0;
  if (threshold && item.itemLevel < threshold)
    return {
      visible: false,
      style,
      reason: `Item level ${item.itemLevel} is below the rare equipment minimum of ${threshold}.`,
    };
  return {
    visible: true,
    style,
    reason: threshold
      ? `Item level ${item.itemLevel} meets the rare equipment minimum of ${threshold}.`
      : `${label} are shown by your settings.`,
  };
}

export function validateFilter(text: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  let block = false;
  if (!text.trim()) issues.push("The filter is empty");
  if (text.length > 1_000_000) issues.push("Filter must be smaller than 1 MB");
  text.split(/\r?\n/).forEach((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    if (/^(Show|Hide|Minimal)(\s|$)/.test(clean)) {
      block = true;
      return;
    }
    if (!block) issues.push(`Line ${index + 1}: add a Show or Hide block first`);
    const size = clean.match(/^SetFontSize\s+(\d+)/);
    if (size && (Number(size[1]) < 18 || Number(size[1]) > 45))
      issues.push(`Line ${index + 1}: font size must be 18–45`);
    if ((clean.match(/(?<!\\)"/g)?.length ?? 0) % 2)
      issues.push(`Line ${index + 1}: unclosed quotation mark`);
  });
  if (!block && text.trim()) issues.push("Add at least one Show, Hide or Minimal block");
  return { valid: issues.length === 0, issues };
}

export type TradeRange = { min: string; max: string };
export type TradeOption = { value: string; label: string; localOnly?: boolean };
export type TradeStatFilter = {
  id: string;
  label: string;
  min: string;
  max: string;
  weight?: string;
  disabled: boolean;
};
export type TradeStatGroup = {
  id: string;
  type: "and" | "or" | "not" | "count" | "weight" | "if";
  min: string;
  max: string;
  disabled: boolean;
  filters: TradeStatFilter[];
};
export type TradeDraft = {
  league: string;
  name: string;
  type: string;
  status: string;
  fields: Record<string, string | TradeRange>;
  statGroups: TradeStatGroup[];
};
export type TradeFieldDefinition = {
  key: string;
  label: string;
  kind: "range" | "select" | "text";
  options?: TradeOption[];
  localOnly?: boolean;
};
export type TradeFilterSection = { key: string; label: string; fields: TradeFieldDefinition[] };

export const TRADE_STATUS_OPTIONS: TradeOption[] = [
  { value: "any", label: "Any" },
  { value: "online", label: "Online" },
  { value: "available", label: "Available" },
  { value: "securable", label: "Securable" },
];
export const TRADE_STAT_GROUP_TYPES: TradeOption[] = [
  { value: "and", label: "And" },
  { value: "or", label: "Or" },
  { value: "not", label: "Not" },
  { value: "count", label: "Count" },
  { value: "weight", label: "Weighted Sum" },
  { value: "if", label: "If" },
];
// Current category, property, sale-type and price-currency values verified through
// the official signed-in PoE2 search UI and its generated URLs on 2026-10-06.
export const TRADE_CATEGORIES: TradeOption[] = [
  { value: "", label: "Any" },
  { value: "weapon", label: "Any Weapon" },
  { value: "weapon.onemelee", label: "Any One-Handed Melee Weapon" },
  { value: "weapon.unarmed", label: "Unarmed" },
  { value: "weapon.claw", label: "Claw" },
  { value: "weapon.dagger", label: "Dagger" },
  { value: "weapon.onesword", label: "One-Handed Sword" },
  { value: "weapon.oneaxe", label: "One-Handed Axe" },
  { value: "weapon.onemace", label: "One-Handed Mace" },
  { value: "weapon.spear", label: "Spear" },
  { value: "weapon.flail", label: "Flail" },
  { value: "weapon.twomelee", label: "Any Two-Handed Melee Weapon" },
  { value: "weapon.twosword", label: "Two-Handed Sword" },
  { value: "weapon.twoaxe", label: "Two-Handed Axe" },
  { value: "weapon.twomace", label: "Two-Handed Mace" },
  { value: "weapon.warstaff", label: "Quarterstaff" },
  { value: "weapon.talisman", label: "Talisman" },
  { value: "weapon.ranged", label: "Any Ranged Weapon" },
  { value: "weapon.bow", label: "Bow" },
  { value: "weapon.crossbow", label: "Crossbow" },
  { value: "weapon.caster", label: "Any Caster Weapon" },
  { value: "weapon.wand", label: "Wand" },
  { value: "weapon.sceptre", label: "Sceptre" },
  { value: "weapon.staff", label: "Staff" },
  { value: "weapon.rod", label: "Fishing Rod" },
  { value: "armour", label: "Any Armour" },
  { value: "armour.helmet", label: "Helmet" },
  { value: "armour.chest", label: "Body Armour" },
  { value: "armour.gloves", label: "Gloves" },
  { value: "armour.boots", label: "Boots" },
  { value: "armour.quiver", label: "Quiver" },
  { value: "armour.shield", label: "Shield" },
  { value: "armour.focus", label: "Focus" },
  { value: "armour.buckler", label: "Buckler" },
  { value: "accessory", label: "Any Accessory" },
  { value: "accessory.amulet", label: "Amulet" },
  { value: "accessory.belt", label: "Belt" },
  { value: "accessory.ring", label: "Ring" },
  { value: "gem", label: "Any Gem" },
  { value: "gem.activegem", label: "Skill Gem" },
  { value: "gem.supportgem", label: "Support Gem" },
  { value: "gem.metagem", label: "Meta Gem" },
  { value: "jewel", label: "Any Jewel" },
  { value: "flask", label: "Any Flask" },
  { value: "flask.life", label: "Life Flask" },
  { value: "flask.mana", label: "Mana Flask" },
  { value: "flask.charm", label: "Charm" },
  { value: "map", label: "Any Endgame Item" },
  { value: "map.waystone", label: "Waystone" },
  { value: "map.fragment", label: "Map Fragment" },
  { value: "map.logbook", label: "Logbook" },
  { value: "map.breachstone", label: "Breachstone" },
  { value: "map.barya", label: "Barya" },
  { value: "map.bosskey", label: "Pinnacle Key" },
  { value: "map.ultimatum", label: "Ultimatum Key" },
  { value: "map.tablet", label: "Tablet" },
  { value: "card", label: "Divination Card" },
  { value: "sanctum.relic", label: "Relic" },
  { value: "currency", label: "Any Currency" },
  { value: "currency.omen", label: "Omen" },
  { value: "currency.socketable", label: "Any Augment" },
  { value: "currency.rune", label: "Rune" },
  { value: "currency.soulcore", label: "Soul Core" },
  { value: "currency.idol", label: "Idol" },
];

const yesNo: TradeOption[] = [
  { value: "", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];
const range = (key: string, label: string, localOnly = false): TradeFieldDefinition => ({
  key,
  label,
  kind: "range",
  ...(localOnly ? { localOnly } : {}),
});
const select = (
  key: string,
  label: string,
  options = yesNo,
  localOnly = false,
): TradeFieldDefinition => ({
  key,
  label,
  kind: "select",
  options,
  ...(localOnly ? { localOnly } : {}),
});

// Field names verified from Exiled Exchange 2's PoE2 TradeRequest model at cca30662b
// and the current signed-in official PoE2 search UI. Unverified choices stay local.
export const TRADE_FILTER_SECTIONS: TradeFilterSection[] = [
  {
    key: "type_filters",
    label: "Type Filters",
    fields: [
      select("type_filters.category", "Item Category", TRADE_CATEGORIES),
      select("type_filters.rarity", "Item Rarity", [
        { value: "", label: "Any" },
        { value: "normal", label: "Normal" },
        { value: "magic", label: "Magic" },
        { value: "rare", label: "Rare" },
        { value: "unique", label: "Unique" },
        { value: "nonunique", label: "Any Non-Unique" },
        { value: "uniquefoil", label: "Unique (Foil)" },
      ]),
      range("type_filters.ilvl", "Item Level"),
      range("type_filters.quality", "Item Quality"),
    ],
  },
  {
    key: "equipment_filters",
    label: "Equipment Filters",
    fields: [
      range("equipment_filters.damage", "Damage"),
      range("equipment_filters.aps", "Attacks per Second"),
      range("equipment_filters.crit", "Critical Chance"),
      range("equipment_filters.dps", "Damage per Second"),
      range("equipment_filters.pdps", "Physical DPS"),
      range("equipment_filters.edps", "Elemental DPS"),
      range("equipment_filters.reload_time", "Reload Time"),
      range("equipment_filters.ar", "Armour"),
      range("equipment_filters.ev", "Evasion"),
      range("equipment_filters.es", "Energy Shield"),
      range("equipment_filters.ward", "Runic Ward"),
      range("equipment_filters.block", "Block"),
      range("equipment_filters.spirit", "Spirit"),
      range("equipment_filters.rune_sockets", "Augmentable Sockets"),
      range("equipment_filters.total_augment_sockets", "Total Augment Sockets"),
    ],
  },
  {
    key: "req_filters",
    label: "Requirements",
    fields: [
      range("req_filters.lvl", "Level"),
      range("req_filters.str", "Strength"),
      range("req_filters.dex", "Dexterity"),
      range("req_filters.int", "Intelligence"),
    ],
  },
  {
    key: "map_filters",
    label: "Endgame Filters",
    fields: [
      range("map_filters.map_tier", "Waystone Tier"),
      range("map_filters.map_packsize", "Waystone Packsize"),
      range("map_filters.map_magic_monsters", "Monster Effectiveness"),
      range("map_filters.map_iir", "Waystone IIR"),
      range("map_filters.map_rare_monsters", "Monster Rarity"),
      range("map_filters.map_revives", "Waystone Revives"),
      range("map_filters.map_bonus", "Waystone Drop Chance"),
      range("map_filters.map_gold", "Waystone Gold"),
      range("map_filters.map_experience", "Waystone Experience"),
      select("map_filters.ultimatum_hint", "Ultimatum Trial Hint", [
        { value: "", label: "Any" },
        { value: "Victorious", label: "Victorious" },
        { value: "Cowardly", label: "Cowardly" },
        { value: "Deadly", label: "Deadly" },
      ]),
    ],
  },
  {
    key: "misc_filters",
    label: "Miscellaneous",
    fields: [
      range("misc_filters.gem_level", "Gem Level"),
      range("misc_filters.gem_sockets", "Gem Sockets"),
      range("misc_filters.area_level", "Area Level"),
      range("misc_filters.stack_size", "Stack Size"),
      select("misc_filters.identified", "Identified"),
      select("misc_filters.fractured_item", "Fractured"),
      select("misc_filters.corrupted", "Corrupted"),
      select("misc_filters.sanctified", "Sanctified"),
      select("misc_filters.twice_corrupted", "Twice Corrupted"),
      select("misc_filters.mutated", "Cultivated Vaal Unique"),
      select("misc_filters.veiled", "Unrevealed"),
      select("misc_filters.desecrated", "Desecrated"),
      select("misc_filters.crafted", "Crafted"),
      select("misc_filters.foreseeing", "Foreseeing"),
      select("misc_filters.mirrored", "Mirrored"),
      range("misc_filters.sanctum_gold", "Barya Sacred Water"),
      range("misc_filters.unidentified_tier", "Unidentified Tier"),
    ],
  },
  {
    key: "trade_filters",
    label: "Trade Filters",
    fields: [
      { key: "trade_filters.account", label: "Seller Account", kind: "text" },
      select("trade_filters.collapse", "Collapse Listings by Account"),
      select("trade_filters.indexed", "Listed", [
        { value: "", label: "Any Time" },
        { value: "1hour", label: "Past Hour" },
        { value: "3hours", label: "Past 3 Hours" },
        { value: "12hours", label: "Past 12 Hours" },
        { value: "1day", label: "Past Day" },
        { value: "3days", label: "Past 3 Days" },
        { value: "1week", label: "Past Week" },
        { value: "2weeks", label: "Past 2 Weeks" },
        { value: "1month", label: "Past Month" },
      ]),
      select("trade_filters.sale_type", "Sale Type", [
        { value: "", label: "Buyout or Fixed Price" },
        { value: "any", label: "Any" },
        { value: "priced_with_info", label: "Price with Note" },
        { value: "unpriced", label: "No Listed Price" },
      ]),
      range("trade_filters.fee", "Gold Fee"),
      range("trade_filters.price", "Buyout Price"),
      select("trade_filters.price.option", "Price Currency", [
        { value: "", label: "Exalted Orb Equivalent" },
        { value: "exalted_divine", label: "Exalted or Divine Orbs" },
        { value: "aug", label: "Orb of Augmentation" },
        { value: "transmute", label: "Orb of Transmutation" },
        { value: "exalted", label: "Exalted Orb" },
        { value: "regal", label: "Regal Orb" },
        { value: "chaos", label: "Chaos Orb" },
        { value: "vaal", label: "Vaal Orb" },
        { value: "alch", label: "Orb of Alchemy" },
        { value: "divine", label: "Divine Orb" },
        { value: "annul", label: "Orb of Annulment" },
        { value: "mirror", label: "Mirror of Kalandra" },
      ]),
    ],
  },
];

export function createTradeDraft(): TradeDraft {
  return {
    league: "Standard",
    name: "",
    type: "",
    status: "any",
    fields: {},
    statGroups: [{ id: "initial", type: "and", min: "", max: "", disabled: false, filters: [] }],
  };
}

const fieldDefinitions = new Map(
  TRADE_FILTER_SECTIONS.flatMap((section) =>
    section.fields.map((field) => [field.key, field] as const),
  ),
);
type QueryRange = { min?: number; max?: number };
type QueryField = QueryRange & { option?: string; input?: string };
export type TradeQuery = {
  status: { option: string };
  name?: string;
  type?: string;
  stats: {
    type: TradeStatGroup["type"];
    value?: QueryRange;
    filters: { id: string; value?: QueryRange & { weight?: number } }[];
  }[];
  filters?: Record<string, { filters: Record<string, QueryField> }>;
};

function isRange(value: unknown): value is TradeRange {
  return (
    typeof value === "object" &&
    value !== null &&
    "min" in value &&
    "max" in value &&
    typeof value.min === "string" &&
    typeof value.max === "string"
  );
}

function hasValue(value: string | TradeRange): boolean {
  return typeof value === "string"
    ? value.trim() !== ""
    : !isRange(value) || value.min.trim() !== "" || value.max.trim() !== "";
}

function numeric(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return NaN;
  const result = Number(trimmed);
  return Number.isFinite(result) ? result : NaN;
}

function rangeError(
  value: TradeRange,
  label: string,
  allowNegative = false,
  wholeNumbers = false,
): string | undefined {
  const min = numeric(value.min);
  const max = numeric(value.max);
  if ((min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max)))
    return `${label}: enter valid finite numbers.`;
  if (!allowNegative && ((min !== undefined && min < 0) || (max !== undefined && max < 0)))
    return `${label}: use zero or positive numbers.`;
  if (
    wholeNumbers &&
    ((min !== undefined && !Number.isInteger(min)) || (max !== undefined && !Number.isInteger(max)))
  )
    return `${label}: use whole numbers.`;
  if (min !== undefined && max !== undefined && min > max)
    return `${label}: minimum must not exceed maximum.`;
}

function queryRange(value: TradeRange): QueryRange | undefined {
  const min = numeric(value.min);
  const max = numeric(value.max);
  if (min === undefined && max === undefined) return undefined;
  return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

export function validateTradeDraft(draft: TradeDraft): string[] {
  const errors: string[] = [];
  if (!draft.league.trim()) errors.push("Select a PoE2 league.");
  if (!TRADE_STATUS_OPTIONS.some((option) => option.value === draft.status))
    errors.push("Select a valid availability status.");
  for (const [key, value] of Object.entries(draft.fields)) {
    const field = fieldDefinitions.get(key);
    if (!field) {
      errors.push(`Unknown filter: ${key}.`);
      continue;
    }
    if (!hasValue(value)) continue;
    if (field.localOnly) {
      errors.push(
        `${field.label}: apply this filter on the official site; a browser handoff is not yet verified.`,
      );
      continue;
    }
    if (field.kind === "range") {
      if (!isRange(value)) {
        errors.push(`${field.label}: enter a minimum and maximum range.`);
        continue;
      }
      const error = rangeError(value, field.label);
      if (error) errors.push(error);
    } else {
      if (typeof value !== "string") {
        errors.push(`${field.label}: select one value.`);
        continue;
      }
      if (field.kind === "select") {
        const option = field.options?.find((option) => option.value === value.trim());
        if (!option) errors.push(`${field.label}: select a valid option.`);
        else if (option.localOnly)
          errors.push(
            `${field.label} — ${option.label}: apply this choice on the official site; a browser handoff is not yet verified.`,
          );
      }
    }
  }
  for (const [index, group] of draft.statGroups.entries()) {
    if (group.disabled) continue;
    const label = `Stat group ${index + 1}`;
    if (!TRADE_STAT_GROUP_TYPES.some((option) => option.value === group.type)) {
      errors.push(`${label}: select a valid group type.`);
      continue;
    }
    if (group.type === "count" || group.type === "weight") {
      const error = rangeError(group, label, group.type === "weight", group.type === "count");
      if (error) errors.push(error);
      if (
        (group.min.trim() || group.max.trim()) &&
        !group.filters.some((filter) => !filter.disabled && filter.id.trim())
      )
        errors.push(`${label}: select an active stat before setting group bounds.`);
    } else if (group.min.trim() || group.max.trim())
      errors.push(`${label}: only Count and Weighted Sum groups accept group bounds.`);
    for (const [filterIndex, filter] of group.filters.entries()) {
      if (filter.disabled) continue;
      if (!filter.id.trim() && !filter.min.trim() && !filter.max.trim() && !filter.weight?.trim())
        continue;
      const filterLabel = filter.label.trim() || `${label}, filter ${filterIndex + 1}`;
      // PoB and Exiled Exchange preserve selectable-stat suffixes in id, e.g. stat_448592698|98.
      if (!/^[a-z][a-z0-9_]*\.[a-zA-Z0-9_]+(?:\|\d+)?$/.test(filter.id.trim())) {
        errors.push(`${filterLabel}: select a stat from the list.`);
        continue;
      }
      const error = rangeError(filter, filterLabel, true);
      if (error) errors.push(error);
      if (group.type === "weight") {
        const weight = numeric(filter.weight ?? "");
        if (weight !== undefined && !Number.isFinite(weight))
          errors.push(`${filterLabel}: enter a valid finite weight.`);
      } else if (filter.weight?.trim())
        errors.push(`${filterLabel}: only Weighted Sum groups accept a stat weight.`);
    }
  }
  return errors;
}

export function toTradeQuery(draft: TradeDraft): TradeQuery {
  const errors = validateTradeDraft(draft);
  if (errors.length) throw new Error(errors.join("\n"));
  const query: TradeQuery = { status: { option: draft.status }, stats: [] };
  if (draft.name.trim()) query.name = draft.name.trim();
  if (draft.type.trim()) query.type = draft.type.trim();
  const sections: NonNullable<TradeQuery["filters"]> = {};
  for (const [key, value] of Object.entries(draft.fields)) {
    if (!hasValue(value)) continue;
    const field = fieldDefinitions.get(key)!;
    const [sectionKey, filterKey] = key.split(".");
    const section = (sections[sectionKey] ??= { filters: {} });
    if (field.kind === "range") {
      section.filters[filterKey] = {
        ...section.filters[filterKey],
        ...queryRange(value as TradeRange),
      };
    } else if (field.kind === "text") {
      section.filters[filterKey] = { input: (value as string).trim() };
    } else {
      section.filters[filterKey] = {
        ...section.filters[filterKey],
        option: (value as string).trim(),
      };
    }
  }
  if (Object.keys(sections).length) query.filters = sections;
  for (const group of draft.statGroups) {
    if (group.disabled) continue;
    const filters = group.filters
      .filter((filter) => !filter.disabled && filter.id.trim())
      .map((filter) => {
        const range = queryRange(filter);
        const weight = group.type === "weight" ? numeric(filter.weight ?? "") : undefined;
        const value =
          range || weight !== undefined
            ? { ...range, ...(weight !== undefined ? { weight } : {}) }
            : undefined;
        return { id: filter.id.trim(), ...(value ? { value } : {}) };
      });
    if (!filters.length) continue;
    const value = group.type === "count" || group.type === "weight" ? queryRange(group) : undefined;
    query.stats.push({ type: group.type, ...(value ? { value } : {}), filters });
  }
  return query;
}

export async function buildTradeUrl(draft: TradeDraft): Promise<string> {
  const query = toTradeQuery(draft);
  const bytes = new TextEncoder().encode(JSON.stringify(query));
  const compressed = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const result = new Uint8Array(await new Response(compressed).arrayBuffer());
  const binary = Array.from(result, (byte) => String.fromCharCode(byte)).join("");
  const token = btoa(binary).replaceAll("+", "-").replaceAll("/", "_");
  return `https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(draft.league.trim())}/${token}`;
}

function rangeSummary(value: TradeRange): string {
  const min = value.min.trim();
  const max = value.max.trim();
  return min && max ? `${min}–${max}` : min ? `≥ ${min}` : max ? `≤ ${max}` : "Any";
}

export function tradeSummary(draft: TradeDraft): string {
  const status =
    TRADE_STATUS_OPTIONS.find((option) => option.value === draft.status)?.label ?? draft.status;
  const lines = [
    `${[draft.name.trim(), draft.type.trim()].filter(Boolean).join(" · ") || "Any item"} · ${draft.status === "any" ? "Any status" : status}`,
    `League: ${draft.league.trim() || "Unselected"}`,
  ];
  for (const [key, value] of Object.entries(draft.fields)) {
    if (!hasValue(value)) continue;
    const field = fieldDefinitions.get(key);
    const text =
      typeof value === "string"
        ? (field?.options?.find((option) => option.value === value)?.label ?? value)
        : isRange(value)
          ? rangeSummary(value)
          : String(value);
    const optionLocalOnly =
      typeof value === "string" &&
      field?.options?.find((option) => option.value === value)?.localOnly;
    lines.push(
      `${field?.label ?? key}: ${text}${field?.localOnly || optionLocalOnly ? " (apply on official site)" : ""}`,
    );
  }
  if (
    draft.fields["trade_filters.price"] &&
    hasValue(draft.fields["trade_filters.price"]) &&
    !draft.fields["trade_filters.price.option"]
  )
    lines.push("Price Currency: Exalted Orb Equivalent");
  for (const group of draft.statGroups) {
    if (group.disabled) continue;
    const filters = group.filters.filter(
      (filter) =>
        !filter.disabled &&
        (filter.id.trim() || filter.min.trim() || filter.max.trim() || filter.weight?.trim()),
    );
    if (!filters.length) continue;
    const label =
      TRADE_STAT_GROUP_TYPES.find((option) => option.value === group.type)?.label ?? group.type;
    const bounds = group.min.trim() || group.max.trim() ? ` (${rangeSummary(group)})` : "";
    lines.push(
      `${label}${bounds}: ${filters.map((filter) => `${filter.label || filter.id || "Unselected stat"}${filter.min.trim() || filter.max.trim() ? ` ${rangeSummary(filter)}` : ""}${filter.weight?.trim() ? ` (weight ${filter.weight.trim()})` : ""}`).join("; ")}`,
    );
  }
  return lines.join("\n");
}

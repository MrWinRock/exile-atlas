import { readFileSync, writeFileSync } from "node:fs";

// Original catalogue: labels/stat IDs from our pinned PoB export, roll intervals
// checked against poe2.re revision 4ae8978f28eb025aa14ba46fc2920c9358285f93.
// Short fragments are derived below; no reference application/dataset is bundled.
const definitions: [string, number, number?, number?][] = [
  ["critical-damage-reduction", 337935900, 15, 30],
  ["ignited-ground", 133340941],
  ["life-recovery", 4181072906, 20, 40],
  ["enfeeble", 2029171424],
  ["flask-charges", 2549889921, 20, 35],
  ["extra-cold", 211727, 5, 24],
  ["extra-fire", 92381065, 5, 24],
  ["extra-chaos", 2200661314, 5, 24],
  ["stun-buildup", 115425161, 50, 110],
  ["elemental-weakness", 554690751],
  ["monster-accuracy", 1588049749, 10, 50],
  ["armour-break", 1879340377, 15, 45],
  ["resistance-penetration", 1898978455, 6, 16],
  ["monster-armour", 2539290279],
  ["poison", 95221307, 13, 40],
  ["temporal-chains", 1629357380],
  ["extra-lightning", 512071314, 5, 24],
  ["monster-elemental-resistances", 1054098949, 20, 40],
  ["monster-speed", 3909654181, 10, 15],
  ["monster-evasion", 2570249991],
  ["maximum-resistances", 3376488707, -10, -3],
  ["stun-threshold", 4101943684, 30, 79],
  ["ailment-threshold", 1994551050, 30, 79],
  ["monster-damage", 1890519597, 5, 24],
  ["bleeding", 2506820610, 5, 25],
  ["cooldown-recovery", 941368244, 15, 30],
  ["extra-energy-shield", 2887760183, 12, 25],
  ["critical-hit-chance", 2753083623, 80, 300],
  ["critical-damage", 57326096, 11, 30],
  ["chilled-ground", 349586058],
  ["ailment-application", 3877264671, 60, 130],
  ["monster-life", 95249895, 10, 30],
  ["curse-effect", 3796523155, 20, 50],
  ["shocked-ground", 3477720557],
];
const snapshot = JSON.parse(readFileSync("public/data/poe2-trade-stats.json", "utf8"));
const stats = new Map<string, string>(
  snapshot.groups.flatMap((g: { entries: { id: string; text: string }[] }) =>
    g.entries.map((e) => [e.id, e.text] as const),
  ),
);
const rows = definitions.map(([id, stat, min, max]) => {
  const tradeStatId = `explicit.stat_${stat}`;
  const template = stats.get(tradeStatId);
  if (!template) throw new Error(`Missing verified stat ${tradeStatId}`);
  return {
    id,
    template,
    label: template,
    tradeStatId,
    ...(min !== undefined
      ? { numericDomain: min < 0 ? [-100, 0] : [0, 1000], numericSlot: 0, rollRange: [min, max!] }
      : {}),
  };
});
const explicitFragments: Record<string, string> = {
  "ignited-ground": "gn",
  "shocked-ground": "cke",
  "chilled-ground": "chi",
  "monster-evasion": "siv",
  "monster-armour": "oure",
  "monster-life": "fe$",
  "monster-elemental-resistances": "r el",
};
const headers = [
  "Item Class: Waystones",
  "Rarity: Normal",
  "Rarity: Magic",
  "Rarity: Rare",
  "Rarity: Unique",
  "Corrupted",
  "Players in area are 40% Delirious",
  "Waystone (Tier 16)",
  "Waystone Tier: 16",
  "Revives Available: 6",
  "Item Rarity: +40%",
  "Waystone Drop Chance: +40%",
  "Monster Effectiveness: +40%",
  "Monster Rarity: +40%",
  "Pack Size: +40%",
];
const texts = [
  ...rows.map((r) => r.template.toLowerCase()),
  ...headers.map((t) => t.toLowerCase()),
];
const deriveFragment = (text: string, index: number) => {
  for (let length = 2; length <= text.length; length++) {
    for (let start = 0; start + length <= text.length; start++) {
      const fragment = text.slice(start, start + length);
      if (!/^[a-z][a-z ,]*[a-z,]$/.test(fragment)) continue;
      if (texts.every((other, i) => i === index || !other.includes(fragment))) return fragment;
    }
    const suffix = text.slice(-(length - 1));
    if (
      /^[a-z][a-z ]*[a-z]$/.test(suffix) &&
      texts.every((other, i) => i === index || !other.endsWith(suffix))
    )
      return suffix + "$";
  }
  throw new Error(`No distinct compact fragment for ${text}`);
};
const catalogue = rows.map((r, i) => ({
  ...r,
  presencePattern: explicitFragments[r.id] ?? deriveFragment(texts[i], i),
}));
for (const row of catalogue) {
  const re = new RegExp(row.presencePattern, "i");
  for (const other of catalogue)
    if (re.test(other.template) !== (row.id === other.id))
      throw new Error(`Ambiguous fragment ${row.presencePattern}`);
  if (headers.some((t) => re.test(t))) throw new Error(`Header collision ${row.presencePattern}`);
}
writeFileSync("public/data/poe2-waystone-regex.json", JSON.stringify(catalogue, null, 2) + "\n");
console.log(`Prepared ${catalogue.length} verified Waystone definitions with distinct fragments.`);

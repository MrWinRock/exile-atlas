import { currencyMarketCategory } from "./currency-market";

export type CurrencyPickerItem = { id: string; name: string; icon?: string; itemClass?: string };

export const currencyPickerCategories = [
  "All",
  "Currency",
  "Essences",
  "Delirium",
  "Breach",
  "Abyss",
  "Atziri's Temple",
  "Fragments",
  "Runes",
  "Ritual",
  "Soul Cores",
  "Idols",
  "Uncut Gems",
  "Expedition",
  "Gems",
  "Other",
] as const;

const currencySections = [
  "Currency",
  "Jewellers' Currency",
  "Currency Shards",
  "Quality Currency",
  "Identification Currency",
];
const sectionOrder = [...currencySections, ...currencyPickerCategories.slice(2)];

function categoryOf(item: CurrencyPickerItem) {
  return currencyMarketCategory(item.id, item.name, item.itemClass);
}

export function currencyPickerSection(item: CurrencyPickerItem): string {
  const category = categoryOf(item);
  if (category !== "Currency") return category;
  const value = `${item.id} ${item.name}`.toLowerCase();
  if (/jewell?er/.test(value)) return "Jewellers' Currency";
  if (/shard/.test(value)) return "Currency Shards";
  if (
    /quality|armourer's scrap|blacksmith's whetstone|arcanist's etcher|glassblower's bauble|gemcutter's prism/.test(
      value,
    )
  )
    return "Quality Currency";
  if (/identification|identify|scroll of wisdom/.test(value)) return "Identification Currency";
  return category;
}

export function currencyPickerCategoryCounts(items: CurrencyPickerItem[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    currencyPickerCategories.map((category) => [category, 0]),
  );
  counts.All = items.length;
  for (const item of items) counts[categoryOf(item)]++;
  return counts;
}

function itemOrder(a: CurrencyPickerItem, b: CurrencyPickerItem) {
  const family = (name: string) => name.replace(/^(?:Lesser|Greater|Perfect) /, "");
  const tier = (name: string) =>
    name.startsWith("Perfect ")
      ? 3
      : name.startsWith("Greater ")
        ? 2
        : name.startsWith("Lesser ")
          ? 0
          : 1;
  return (
    family(a.name).localeCompare(family(b.name)) ||
    tier(a.name) - tier(b.name) ||
    a.name.localeCompare(b.name)
  );
}

export function buildCurrencyPickerGroups(
  items: CurrencyPickerItem[],
  category: string,
  search: string,
): { title: string; items: CurrencyPickerItem[] }[] {
  const query = search.trim().toLowerCase();
  const groups = new Map<string, CurrencyPickerItem[]>();
  for (const item of items) {
    if (category !== "All" && categoryOf(item) !== category) continue;
    if (!`${item.name} ${item.id}`.toLowerCase().includes(query)) continue;
    const section = currencyPickerSection(item);
    const group = groups.get(section) ?? [];
    group.push(item);
    groups.set(section, group);
  }
  return sectionOrder.flatMap((title) => {
    const group = groups.get(title);
    return group ? [{ title, items: group.sort(itemOrder) }] : [];
  });
}

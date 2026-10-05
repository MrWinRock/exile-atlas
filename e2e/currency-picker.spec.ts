import { expect, test } from "@playwright/test";
import { normalizeMarket } from "../src/lib/currency";

const divine = "Metadata/Items/Currency/CurrencyModValues";
const chaos = "Metadata/Items/Currency/CurrencyRerollRare";
const catalogue = [
  { id: divine, name: "Divine Orb", itemClass: "StackableCurrency" },
  { id: chaos, name: "Chaos Orb", itemClass: "StackableCurrency" },
  {
    id: "Metadata/Items/Currency/CurrencyJeweller",
    name: "Lesser Jeweller's Orb",
    itemClass: "StackableCurrency",
  },
  {
    id: "Metadata/Items/Currency/CurrencyJewellerGreater",
    name: "Greater Jeweller's Orb",
    itemClass: "StackableCurrency",
  },
  {
    id: "Metadata/Items/Currency/CurrencyUpgradeToMagicShard",
    name: "Transmutation Shard",
    itemClass: "StackableCurrency",
  },
  {
    id: "Metadata/Items/Currency/CurrencyGemQuality",
    name: "Gemcutter's Prism",
    itemClass: "StackableCurrency",
  },
  {
    id: "Metadata/Items/Currency/CurrencyIdentification",
    name: "Scroll of Wisdom",
    itemClass: "StackableCurrency",
  },
  {
    id: "Metadata/Items/Currency/CurrencyEssenceAttack",
    name: "Essence of Battle",
    itemClass: "StackableCurrency",
  },
  {
    id: "Metadata/Items/Gems/SkillGemEssenceDrain",
    name: "Essence Drain",
    itemClass: "Active Skill Gem",
  },
  {
    id: "Metadata/Items/Currency/OmenOnChaosLowestLevelMod",
    name: "Omen of Whittling",
    itemClass: "Omen",
  },
  { id: "Metadata/Items/SoulCores/RuneFire", name: "Desert Rune", itemClass: "SoulCore" },
];

test("both exchange pickers filter categorized item groups and restore trigger focus", async ({
  page,
}) => {
  const hour = Math.floor(Date.now() / 3600000) * 3600 - 3600;
  const markets = catalogue
    .filter((item) => item.id !== divine)
    .map((item) =>
      normalizeMarket({
        league: "Standard",
        market_pair: [item.id, divine],
        volume_traded: { [item.id]: item.id === chaos ? 10000 : 100, [divine]: 20 },
        lowest_ratio: { [item.id]: 10, [divine]: 1 },
        highest_ratio: { [item.id]: 10, [divine]: 1 },
        lowest_stock: { [item.id]: 30, [divine]: 2 },
        highest_stock: { [item.id]: 50, [divine]: 5 },
      }),
    );
  await page.route("**/api/currency?*", (route) =>
    route.fulfill({
      json: {
        hour,
        nextChangeId: hour + 3600,
        markets,
        source: "GGG",
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.route("**/api/history", (route) =>
    route.fulfill({ json: { snapshots: [], configured: false } }),
  );
  await page.route("**/api/items", (route) =>
    route.fulfill({
      json: {
        items: [
          ...catalogue,
          { id: "Metadata/Items/Currency/NotInDigest", name: "Hidden Catalogue Orb" },
        ],
        withImages: 0,
        revision: "test",
        source: "RePoE",
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/currency");
  const comparison = page.getByRole("region", { name: "Compare an exchange" });
  const buy = comparison.getByRole("button", { name: "Item to buy: Divine Orb", exact: true });
  await buy.click();
  const picker = page.getByRole("dialog");
  const categories = picker.getByRole("navigation", { name: "Item categories" });
  await expect(categories.getByRole("button", { name: "All", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(categories.getByRole("button", { name: "Currency", exact: true })).toContainText(
    "7",
  );
  await expect(picker.getByRole("button", { name: "Chaos Orb", exact: true })).toBeDisabled();
  await expect(
    picker.getByRole("button", { name: "Hidden Catalogue Orb", exact: true }),
  ).toHaveCount(0);
  await expect(categories.getByRole("button", { name: "Owned", exact: true })).toHaveCount(0);
  await categories.getByRole("button", { name: "Currency", exact: true }).click();
  for (const title of [
    "Currency",
    "Jewellers' Currency",
    "Currency Shards",
    "Quality Currency",
    "Identification Currency",
  ]) {
    await expect(picker.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(picker.getByRole("button", { name: "Essence of Battle", exact: true })).toHaveCount(
    0,
  );
  await picker.getByLabel("Search items to buy").fill(" gemcutter ");
  await expect(
    picker.getByRole("button", { name: "Gemcutter's Prism", exact: true }),
  ).toBeVisible();
  await expect(picker.getByRole("heading", { name: "Currency Shards", exact: true })).toHaveCount(
    0,
  );
  await picker.getByLabel("Search items to buy").fill("essence");
  await expect(picker.getByText("No items match your search.")).toBeVisible();
  await categories.getByRole("button", { name: "Essences", exact: true }).click();
  await expect(
    picker.getByRole("button", { name: "Essence of Battle", exact: true }),
  ).toBeVisible();
  await expect(picker.getByRole("button", { name: "Essence Drain", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(buy).toBeFocused();
  await buy.click();
  await picker
    .getByRole("navigation", { name: "Item categories" })
    .getByRole("button", { name: "Essences", exact: true })
    .click();
  await picker.getByRole("button", { name: "Essence of Battle", exact: true }).click();
  await expect(
    comparison.getByRole("button", { name: "Item to buy: Essence of Battle", exact: true }),
  ).toBeFocused();
  const sell = comparison.getByRole("button", { name: "Item to sell: Chaos Orb", exact: true });
  await sell.click();
  await expect(
    picker
      .getByRole("navigation", { name: "Item categories" })
      .getByRole("button", { name: "All", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await picker
    .getByRole("navigation", { name: "Item categories" })
    .getByRole("button", { name: "Ritual", exact: true })
    .click();
  await picker.getByRole("button", { name: "Omen of Whittling", exact: true }).click();
  await expect(
    comparison.getByRole("button", { name: "Item to sell: Omen of Whittling", exact: true }),
  ).toBeFocused();
  await comparison.getByRole("button", { name: /^Item to sell:/ }).click();
  const bounds = await picker.evaluate((dialog) => {
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: innerWidth,
      scroll: dialog.scrollWidth,
      client: dialog.clientWidth,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
});

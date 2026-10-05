import { expect, test } from "@playwright/test";
import { normalizeMarket } from "../src/lib/currency";

const divine = "Metadata/Items/Currency/CurrencyModValues";
const chaos = "Metadata/Items/Currency/CurrencyRerollRare";
const exalted = "Metadata/Items/Currency/CurrencyAddModToRare";
const annulment = "Metadata/Items/Currency/CurrencyRemoveMod";
const essence = "Metadata/Items/Currency/Essence/EssenceAttack1";
const hour = Math.floor(Date.now() / 3600000) * 3600 - 3600;

function market(item: string, price: number, league = "Standard") {
  return normalizeMarket({
    league,
    market_pair: [divine, item],
    volume_traded: { [divine]: 40, [item]: 1000 },
    lowest_ratio: { [divine]: price, [item]: 1 },
    highest_ratio: { [divine]: price, [item]: 1 },
    lowest_stock: { [divine]: 5, [item]: 50 },
    highest_stock: { [divine]: 10, [item]: 1200 },
  });
}

test("item market prices, history and favorites follow league and quote filters", async ({
  page,
}) => {
  const current = [
    market(chaos, 0.1),
    market(exalted, 0.01),
    market(essence, 2),
    market(chaos, 0.5, "Hardcore"),
    normalizeMarket({
      league: "Standard",
      market_pair: [exalted, annulment],
      volume_traded: { [exalted]: 20, [annulment]: 1000 },
      lowest_ratio: { [exalted]: 1, [annulment]: 50 },
      highest_ratio: { [exalted]: 1, [annulment]: 50 },
      lowest_stock: {},
      highest_stock: {},
    }),
  ];
  await page.route("**/api/currency?*", (route) =>
    route.fulfill({
      json: {
        hour,
        markets: current,
        nextChangeId: hour + 3600,
        source: "GGG",
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.route("**/api/history", (route) =>
    route.fulfill({
      json: {
        configured: true,
        snapshots: [
          { hour: hour - 3600, markets: [market(chaos, 0.05), market(exalted, 0.01)] },
          { hour: hour + 3600, markets: [market(chaos, 100)] },
        ],
      },
    }),
  );
  await page.route("**/api/items", (route) =>
    route.fulfill({
      json: {
        items: [
          { id: divine, name: "Divine Orb", itemClass: "StackableCurrency" },
          { id: chaos, name: "Chaos Orb", itemClass: "StackableCurrency" },
          { id: exalted, name: "Exalted Orb", itemClass: "StackableCurrency" },
          { id: annulment, name: "Orb of Annulment", itemClass: "StackableCurrency" },
          { id: essence, name: "Essence of Battle", itemClass: "StackableCurrency" },
        ],
        withImages: 0,
        revision: "test",
        source: "RePoE",
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/currency");
  const list = page.getByRole("region", { name: "Item markets" });
  await expect(list).toBeVisible();
  await list.getByLabel("Market league").selectOption("Standard");
  // Automatic prices can use different currencies, so rank their direct Divine values.
  await expect(
    list.getByRole("row").nth(1).getByRole("button", { name: "Favorite Divine Orb", exact: true }),
  ).toBeVisible();
  await list.getByRole("button", { name: "Price in Divine Orb", exact: true }).click();
  const chaosRow = list
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: /^(?:Favorite|Unfavorite) Chaos Orb$/ }) });
  await expect(chaosRow.getByTestId("market-price")).toHaveText("0.1");
  await expect(chaosRow.getByTestId("market-stock")).toHaveText("1.2K");
  await expect(chaosRow.getByTestId("market-change")).toHaveText("+100%");
  await expect(chaosRow.getByRole("img", { name: /Collected price history/ })).toBeVisible();
  await chaosRow.getByRole("button", { name: "Favorite Chaos Orb", exact: true }).click();
  await list.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(list.getByRole("row")).toHaveCount(2);
  await expect(
    list.getByRole("button", { name: "Unfavorite Chaos Orb", exact: true }),
  ).toBeVisible();
  // Stored favorites stay readable when browser storage becomes write-disabled.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Write disabled", "QuotaExceededError");
    };
  });
  await list.getByRole("button", { name: "Unfavorite Chaos Orb", exact: true }).click();
  await expect(list.getByText("No items match these filters.")).toBeVisible();
  await list.getByRole("button", { name: "Currency", exact: true }).click();
  await list.getByRole("button", { name: "Favorite Chaos Orb", exact: true }).click();
  await expect(
    list.getByRole("button", { name: "Unfavorite Chaos Orb", exact: true }),
  ).toBeVisible();
  await page.reload();
  await list.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(
    list.getByRole("button", { name: "Unfavorite Chaos Orb", exact: true }),
  ).toBeVisible();
  await list.getByRole("button", { name: "Essences", exact: true }).click();
  await expect(list.getByRole("row")).toHaveCount(2);
  await expect(
    list.getByRole("button", { name: "Favorite Essence of Battle", exact: true }),
  ).toBeVisible();
  await list.getByRole("button", { name: "Currency", exact: true }).click();
  await list.getByLabel("Market league").selectOption("Hardcore");
  await expect(chaosRow.getByTestId("market-price")).toHaveText("0.5");
  await expect(chaosRow.getByTestId("market-change")).toHaveText("—");
  await list.getByLabel("Search market items").fill("no such item");
  await expect(list.getByText("No items match these filters.")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

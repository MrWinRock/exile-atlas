import { expect, test } from "@playwright/test";
import { normalizeMarket } from "../src/lib/currency";

const divine = "Metadata/Items/Currency/CurrencyModValues";
const chaos = "Metadata/Items/Currency/CurrencyRerollRare";
const omen = "Metadata/Items/Currency/OmenOnChaosLowestLevelMod";

test("currency comparison keeps buy and sell prices in the selected league", async ({ page }) => {
  const markets = [
    normalizeMarket({
      league: "Standard",
      market_pair: [chaos, divine],
      volume_traded: { [chaos]: 1200, [divine]: 100 },
      lowest_ratio: { [chaos]: 10, [divine]: 1 },
      highest_ratio: { [chaos]: 15, [divine]: 1 },
      lowest_stock: { [chaos]: 100, [divine]: 10 },
      highest_stock: { [chaos]: 200, [divine]: 20 },
    }),
    normalizeMarket({
      league: "Hardcore",
      market_pair: [divine, chaos],
      volume_traded: { [chaos]: 500, [divine]: 20 },
      lowest_ratio: { [chaos]: 20, [divine]: 1 },
      highest_ratio: { [chaos]: 30, [divine]: 1 },
      lowest_stock: { [chaos]: 50, [divine]: 2 },
      highest_stock: { [chaos]: 100, [divine]: 5 },
    }),
    normalizeMarket({
      league: "Standard",
      market_pair: [omen, chaos],
      volume_traded: { [chaos]: 40, [omen]: 2 },
      lowest_ratio: { [chaos]: 20, [omen]: 1 },
      highest_ratio: { [chaos]: 20, [omen]: 1 },
      lowest_stock: {},
      highest_stock: {},
    }),
  ];
  let digestMarkets = markets;
  await page.route("**/api/currency?*", (route) =>
    route.fulfill({
      json: {
        hour: 1791154800,
        nextChangeId: 1791158400,
        markets: digestMarkets,
        source: "GGG",
        fetchedAt: "2026-10-05T00:00:00Z",
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
          { id: divine, name: "Divine Orb" },
          { id: chaos, name: "Chaos Orb" },
          { id: omen, name: "Omen of Whittling" },
        ],
        withImages: 0,
        revision: "test",
        source: "RePoE",
        fetchedAt: "2026-10-05T00:00:00Z",
      },
    }),
  );

  await page.goto("/currency");
  const comparison = page.getByRole("region", { name: "Compare an exchange" });
  await expect(comparison).toBeVisible();
  await comparison.getByLabel("Comparison league").selectOption("Standard");
  await comparison.getByRole("button", { name: /^Item to buy:/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Divine Orb", exact: true }).click();
  await comparison.getByRole("button", { name: /^Item to sell:/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Chaos Orb", exact: true }).click();
  await expect(comparison.getByTestId("exchange-price")).toHaveText("1 : 10 – 15");
  await expect(comparison.getByLabel("Amount to buy")).toHaveValue("1");
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("10 – 15");
  await comparison.getByLabel("Amount to buy").fill("2");
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("20 – 30");
  await expect(comparison.getByTestId("exchange-price")).toHaveText("1 : 10 – 15");
  await comparison.getByLabel("Amount to buy").fill("0");
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("—");
  await comparison.getByLabel("Amount to buy").fill("");
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("—");
  await comparison.getByLabel("Amount to buy").fill("1");
  await comparison.getByRole("button", { name: /^Item to buy:/ }).click();
  await page.getByRole("dialog").getByLabel("Search items to buy").fill("no matching item");
  await expect(page.getByRole("dialog").getByText("No items match your search.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(comparison.getByRole("button", { name: /^Item to buy:/ })).toBeFocused();

  await comparison.getByRole("button", { name: "Swap buy and sell items" }).click();
  await expect(comparison.getByTestId("exchange-price")).toHaveText("1 : 0.0666667 – 0.1");
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("0.0666667 – 0.1");
  await comparison.getByRole("button", { name: "Swap buy and sell items" }).click();
  await comparison.getByLabel("Comparison league").selectOption("Hardcore");
  await expect(comparison.getByTestId("exchange-price")).toHaveText("1 : 20 – 30");
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("20 – 30");

  await comparison.getByLabel("Comparison league").selectOption("Standard");
  await comparison.getByRole("button", { name: /^Item to sell:/ }).click();
  await page.getByRole("dialog").getByLabel("Search items to sell").fill("whittling");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Omen of Whittling", exact: true })
    .click();
  await expect(
    comparison.getByText("No trades reported for this pair in Standard during this hour."),
  ).toBeVisible();
  await expect(comparison.getByTestId("exchange-sell-amount")).toHaveText("—");
  await comparison.getByRole("button", { name: /^Item to sell:/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Chaos Orb", exact: true }).click();
  digestMarkets = [markets[1]];
  await page.getByRole("button", { name: "Refresh digest" }).click();
  await expect(
    comparison.getByText("No trades reported for this pair in Standard during this hour."),
  ).toBeVisible();
  await expect(comparison.getByLabel("Comparison league")).toHaveValue("Standard");
  digestMarkets = [markets[2]];
  await expect(page.getByRole("button", { name: "Refresh digest" })).toBeEnabled();
  await page.getByRole("button", { name: "Refresh digest" }).click();
  await expect(
    comparison
      .getByLabel("Comparison league")
      .getByRole("option", { name: "Hardcore", exact: true }),
  ).toHaveCount(0);
  await expect(
    comparison.getByRole("button", { name: "Item to buy: Divine Orb", exact: true }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

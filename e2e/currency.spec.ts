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
      lowest_ratio: { [chaos]: 1, [divine]: 5 },
      highest_ratio: { [chaos]: 2, [divine]: 10 },
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
  const buyAmount = comparison.getByLabel("Amount to buy");
  const sellAmount = comparison.getByLabel("Amount to sell");
  await expect(comparison.getByTestId("exchange-price")).toHaveText("1 Divine Orb = 0.2 Chaos Orb");
  await expect(buyAmount).toHaveValue("1");
  await expect(sellAmount).toHaveValue("0.2");
  await buyAmount.fill("10");
  await expect(sellAmount).toHaveValue("2");
  await sellAmount.fill("3");
  await expect(buyAmount).toHaveValue("15");
  await sellAmount.fill("");
  await expect(buyAmount).toHaveValue("");
  await expect(buyAmount).toHaveAccessibleDescription("Enter a positive amount to convert.");
  await buyAmount.fill("0");
  await expect(sellAmount).toHaveValue("");
  await expect(sellAmount).toHaveAccessibleDescription("Enter a positive amount to convert.");
  await buyAmount.fill("1");
  await buyAmount.fill("");
  await expect(sellAmount).toHaveValue("");
  await buyAmount.fill("1");
  await expect(sellAmount).toHaveAccessibleDescription("");
  await comparison.getByRole("button", { name: /^Item to buy:/ }).click();
  await page.getByRole("dialog").getByLabel("Search items to buy").fill("no matching item");
  await expect(page.getByRole("dialog").getByText("No items match your search.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(comparison.getByRole("button", { name: /^Item to buy:/ })).toBeFocused();

  await comparison.getByRole("button", { name: "Swap buy and sell items" }).click();
  await expect(comparison.getByTestId("exchange-price")).toHaveText("1 Chaos Orb = 5 Divine Orb");
  await expect(buyAmount).toHaveValue("0.2");
  await expect(sellAmount).toHaveValue("1");
  await comparison.getByRole("button", { name: "Swap buy and sell items" }).click();
  await comparison.getByLabel("Comparison league").selectOption("Hardcore");
  await expect(comparison.getByTestId("exchange-price")).toHaveText("—");
  await expect(
    comparison.getByText("A single rate is unavailable for this pair during this hour."),
  ).toBeVisible();
  await expect(sellAmount).toHaveValue("");

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
  await expect(sellAmount).toHaveValue("");
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

  digestMarkets = [markets[1]];
  await page.getByLabel("Completed hour (UTC)").fill("2026-10-05T01:00");
  await page.getByRole("button", { name: "Load digest", exact: true }).click();
  await expect(comparison.getByLabel("Comparison league")).toHaveValue("Hardcore");
  await expect(comparison.getByTestId("exchange-price")).toHaveText("—");
  await expect(sellAmount).toHaveValue("");

  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

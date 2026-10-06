import { expect, test } from "@playwright/test";
import { gunzipSync } from "node:zlib";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/items", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "astramentis",
            name: "Astramentis",
            itemClass: "Amulet",
            kind: "unique",
            width: 1,
            height: 1,
          },
          {
            id: "amber",
            name: "Amber Amulet",
            itemClass: "Amulet",
            kind: "base",
            width: 1,
            height: 1,
          },
        ],
        withImages: 0,
        revision: "fixture",
        source: "fixture",
        fetchedAt: "2026-10-06T00:00:00Z",
      },
    }),
  );
  await page.route("**/api/currency*", (route) =>
    route.fulfill({
      json: {
        next_change_id: 1791244800,
        markets: [],
      },
    }),
  );
  await page.goto("/trade");
});

test("trade page provides grouped filters and an official PoE2 search link", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Find your next upgrade." })).toBeVisible({
    timeout: 5000,
  });
  const navigationToggle = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await navigationToggle.isVisible()) await navigationToggle.click();
  await expect(page.getByRole("link", { name: "Item trade", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  if (await navigationToggle.isVisible())
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Item trade", exact: true })
      .click();
  for (const group of [
    "Type Filters",
    "Equipment Filters",
    "Requirements",
    "Endgame Filters",
    "Miscellaneous",
    "Trade Filters",
  ]) {
    await expect(page.getByText(group, { exact: true })).toBeVisible();
  }
  await page.getByLabel("Item name", { exact: true }).fill("Astramentis");
  await page.getByLabel("League", { exact: true }).fill("Forbidden Rites");
  await page.getByLabel("Item Level minimum", { exact: true }).fill("30");
  await expect(
    page.getByRole("link", { name: "Search on official trade", exact: true }),
  ).toHaveAttribute(
    "href",
    /^https:\/\/www\.pathofexile\.com\/trade2\/search\/poe2\/Forbidden%20Rites\//,
  );
  await expect(
    page.getByRole("link", { name: "Search on official trade", exact: true }),
  ).toHaveAttribute("target", "_blank");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("trade draft and saved searches preserve all filters across reload", async ({ page }) => {
  await page.getByLabel("Item name", { exact: true }).fill("Astramentis");
  await page.getByLabel("Base type", { exact: true }).fill("Amber Amulet");
  await page.getByLabel("Item Level minimum", { exact: true }).fill("20");
  await page.getByLabel("Search name", { exact: true }).fill("Levelling amulet");
  await page.getByRole("button", { name: "Save search", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Item name", { exact: true })).toHaveValue("Astramentis");
  await expect(page.getByLabel("Base type", { exact: true })).toHaveValue("Amber Amulet");
  await expect(page.getByLabel("Item Level minimum", { exact: true })).toHaveValue("20");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByLabel("Item name", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Load Levelling amulet", exact: true }).click();
  await expect(page.getByLabel("Item name", { exact: true })).toHaveValue("Astramentis");
  await expect(page.getByLabel("Item Level minimum", { exact: true })).toHaveValue("20");
});

test("invalid ranges cannot be handed off as a different search", async ({ page }) => {
  await page.getByLabel("Item Level minimum", { exact: true }).fill("80");
  await page.getByLabel("Item Level maximum", { exact: true }).fill("20");
  await expect(
    page.getByRole("link", { name: "Search on official trade", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Your search" }).getByRole("alert")).toContainText(
    "Item Level",
  );
  await page.getByLabel("Item Level maximum", { exact: true }).fill("90");
  await expect(
    page.getByRole("link", { name: "Search on official trade", exact: true }),
  ).toBeVisible();
});

test("current categories and selectable stats survive weighted and count-group changes", async ({
  page,
}) => {
  const statLabel = "+# to Level of all Arc Skills";
  await page.route("**/data/poe2-trade-stats.json", (route) =>
    route.fulfill({
      json: {
        revision: "fixture",
        source: "fixture",
        groups: [
          {
            id: "explicit",
            label: "Explicit",
            entries: [{ id: "explicit.stat_448592698|98", text: statLabel, type: "explicit" }],
          },
        ],
      },
    }),
  );
  await page.getByLabel("Item Category", { exact: true }).selectOption("weapon.unarmed");
  await page.getByLabel("Sale Type", { exact: true }).selectOption("unpriced");
  await page.getByLabel("Price Currency", { exact: true }).selectOption("exalted_divine");
  await page.getByRole("button", { name: "Add stat filter", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: `Select stat: ${statLabel} (explicit)`, exact: true })
    .click();
  await page.getByLabel(`${statLabel} minimum`, { exact: true }).fill("2");
  const groupType = page.getByLabel("Stat group 1 match", { exact: true });
  await groupType.selectOption("count");
  await page.getByLabel("Stat group 1 minimum", { exact: true }).fill("1");
  await groupType.selectOption("weight");
  await expect(page.getByLabel("Stat group 1 minimum", { exact: true })).toHaveValue("1");
  await page.getByLabel(`${statLabel} weight`, { exact: true }).fill("1.5");
  const link = page.getByRole("link", { name: "Search on official trade", exact: true });
  await expect(link).toBeVisible();
  await groupType.selectOption("count");
  await expect(page.getByLabel("Stat group 1 minimum", { exact: true })).toHaveValue("1");
  await expect(link).toBeVisible();
  await expect
    .poll(async () => {
      const url = await link.getAttribute("href");
      if (!url) return null;
      return JSON.parse(
        gunzipSync(
          Buffer.from(url.split("/").at(-1)!.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
        ).toString(),
      );
    })
    .toEqual({
      status: { option: "any" },
      filters: {
        type_filters: { filters: { category: { option: "weapon.unarmed" } } },
        trade_filters: {
          filters: { sale_type: { option: "unpriced" }, price: { option: "exalted_divine" } },
        },
      },
      stats: [
        {
          type: "count",
          value: { min: 1 },
          filters: [{ id: "explicit.stat_448592698|98", value: { min: 2 } }],
        },
      ],
    });
  await page.getByLabel(`Enable ${statLabel}`, { exact: true }).uncheck();
  await expect(link).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Your search" }).getByRole("alert")).toContainText(
    "select an active stat",
  );
});

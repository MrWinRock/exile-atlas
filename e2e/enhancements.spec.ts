import { expect, test } from "@playwright/test";

test("shortcuts persist and trade filters can be removed", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Choose shortcuts", { exact: true }).click();
  await page.getByLabel("Plan your crafting budget", { exact: true }).check();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Plan your crafting budget", exact: true }),
  ).toBeVisible();
  await page.goto("/trade");
  await page.getByLabel("Item Level minimum", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Remove Item Level filter" }).click();
  await expect(page.getByLabel("Item Level minimum", { exact: true })).toHaveValue("");
});

test("gallery opens an item in the trade draft", async ({ page }) => {
  await page.route("**/api/items", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "item:test",
            name: "Test Armour",
            itemClass: "Body Armour",
            kind: "base",
            width: 2,
            height: 3,
          },
        ],
        withImages: 0,
        revision: "12345678",
        source: "test",
        fetchedAt: "2026-01-01",
      },
    }),
  );
  await page.goto("/items");
  await page.getByText("Item details", { exact: true }).click();
  await page.getByRole("button", { name: "Search in trade" }).click();
  await expect(page.getByLabel("Base type", { exact: true })).toHaveValue("Test Armour");
});

test("map safety starter rules are editable", async ({ page }) => {
  await page.goto("/safety");
  await page.getByText("Add a starter risk rule", { exact: true }).click();
  await page.getByRole("button", { name: "Add Reduced recovery", exact: true }).click();
  await expect(page.getByLabel("Rule 1 name")).toHaveValue("Reduced recovery");
  await expect(page.getByLabel("Rule 1 severity")).toHaveValue("caution");
});

test("build tags can be saved and searched", async ({ page }) => {
  await page.goto("/builds");
  await page.getByLabel("Build name", { exact: true }).fill("Fire starter");
  await page.getByRole("button", { name: "Save build", exact: true }).click();
  const tags = page.getByLabel("Tags for Fire starter");
  await tags.fill("mapping, caster");
  await tags.blur();
  await page.reload();
  await page.getByLabel("Search builds").fill("mapping");
  await expect(page.getByLabel("Tags for Fire starter")).toHaveValue("mapping, caster");
});

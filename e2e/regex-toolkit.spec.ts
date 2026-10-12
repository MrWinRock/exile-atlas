import { expect, test } from "@playwright/test";

test("floating search stays below the mobile navigation drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/regex");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.locator(".sidebar")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const link = page.getByRole("link", { name: "Passive planner", exact: true });
  const box = await link.boundingBox();
  expect(box).not.toBeNull();
  expect(
    await link.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return el.contains(
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
      );
    }),
  ).toBe(true);
  await link.click();
  await expect(page).toHaveURL(/\/planner$/);
});

test("compact waystone output floats while scrolling and can reveal saved-search controls", async ({
  page,
}, testInfo) => {
  await page.goto("/regex");
  await page.getByLabel("Item rarity yield minimum", { exact: true }).fill("40");
  await page
    .getByLabel("Action for Area has patches of Chilled Ground", { exact: true })
    .selectOption("exclude");
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveValue(/^"!chi" /);
  for (const top of [0, 10000, 0]) {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await expect(page.getByLabel("Generated search", { exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeInViewport({
      ratio: 1,
    });
  }
  await page.screenshot({ path: `data/regex-floating-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByLabel("Preset name", { exact: true }).fill("Safe maps");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preset saved" })).toBeVisible();
  await page.getByRole("button", { name: "Hide search options", exact: true }).click();
  await page.getByRole("tab", { name: /Presets/ }).click();
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Safe maps", { exact: true })).toBeVisible();
});
test("five generators compile, test items, and retain complete over-budget output", async ({
  page,
}) => {
  await page.goto("/regex");
  await expect(page.getByRole("heading", { name: "Find what’s worth keeping." })).toBeVisible();
  for (const name of ["Waystones", "Tablets", "Relics", "Vendor", "Equipment"])
    await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  await page.getByLabel("Action for # to maximum Life", { exact: true }).selectOption("want");
  await page.getByLabel("# to maximum Life minimum", { exact: true }).fill("50");
  await page
    .getByLabel("Pasted item text", { exact: true })
    .fill("Rarity: Rare\nUseful Boots\n+60 to maximum Life");
  await page.getByRole("button", { name: "Test item", exact: true }).click();
  await expect(page.getByTestId("item-test-result")).toContainText("Match");
  await page.getByLabel("Additional text", { exact: true }).fill("x".repeat(300));
  await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveValue(/x{300}/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("clipboard failures retain a selectable result and show recovery", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
      configurable: true,
    }),
  );
  await page.goto("/regex");
  await page.getByLabel("Additional text", { exact: true }).fill("boots");
  await page.getByRole("button", { name: "Copy search", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copy failed" })).toBeVisible();
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveValue('"boots"');
});

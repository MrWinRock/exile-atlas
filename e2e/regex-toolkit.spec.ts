import { expect, test } from "@playwright/test";
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

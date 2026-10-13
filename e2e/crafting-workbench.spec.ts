import { expect, test } from "@playwright/test";
test("crafting recipe saves targets, steps and exact budgets across reload", async ({ page }) => {
  await page.goto("/crafting");
  await page.getByLabel("Recipe name", { exact: true }).fill("Ring budget");
  await page.getByLabel("Starting base", { exact: true }).selectOption("Gold Ring");
  await page.getByLabel("Item level", { exact: true }).fill("82");
  await page.getByRole("button", { name: "Add crafting step", exact: true }).click();
  await page.getByLabel("Step 1 quantity", { exact: true }).fill("2");
  await page.getByLabel("Step 1 unit cost", { exact: true }).fill("1.25");
  await expect(page.getByTestId("craft-subtotal")).toHaveText("2.5 Divine Orb");
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await page.reload();
  await page.getByLabel("Saved recipe", { exact: true }).selectOption({ label: "Ring budget" });
  await expect(page.getByLabel("Step 1 quantity", { exact: true })).toHaveValue("2");
  await expect(page.getByTestId("craft-subtotal")).toHaveText("2.5 Divine Orb");
});

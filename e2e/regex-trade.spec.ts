import { expect, test } from "@playwright/test";
test("trade preview preserves existing draft until an explicit complete transfer", async ({
  page,
}) => {
  await page.goto("/regex");
  await page.getByLabel("Waystone tier minimum", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Prepare trade", exact: true }).click();
  await page.getByLabel("Trade league", { exact: true }).fill("Test League");
  await page.getByRole("button", { name: "Use these filters", exact: true }).click();
  await expect(page).toHaveURL(/\/trade$/);
  await expect(page.getByLabel("League", { exact: true })).toHaveValue("Test League");
  await expect(page.getByLabel("Waystone Tier minimum", { exact: true })).toHaveValue("15");
  await page.goto("/regex");
  await page.getByLabel("Additional text", { exact: true }).fill("unmapped text");
  await page.getByRole("button", { name: "Prepare trade", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use these filters", exact: true })).toBeDisabled();
  await expect(page.getByText("Additional text", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Cancel preview", exact: true }).click();
  await page.goto("/trade");
  await expect(page.getByLabel("League", { exact: true })).toHaveValue("Test League");
});

import { expect, test } from "@playwright/test";

test("workspace backup restores a saved search after confirmation", async ({ page }) => {
  await page.goto("/regex");
  await page.getByLabel("Additional text").fill("backup test");
  await page.getByRole("button", { name: "Show search options" }).click();
  await page.getByLabel("Preset name").fill("My backup preset");
  await page.getByRole("button", { name: "Save preset" }).click();
  await page.goto("/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download workspace backup" }).click()]);
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Clear browser drafts" }).click();
  await page.getByRole("button", { name: "Clear all drafts" }).click();
  await page.getByLabel("Choose workspace backup").setInputFiles(path!);
  await page.getByRole("button", { name: "Restore and reload" }).click();
  await page.waitForURL("**/settings");
  await page.goto("/regex");
  await page.getByRole("tab", { name: /Presets/ }).click();
  await expect(page.getByText("My backup preset", { exact: true })).toBeVisible();
});

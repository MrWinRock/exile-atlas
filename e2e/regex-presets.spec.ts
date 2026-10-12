import { expect, test } from "@playwright/test";
test("unknown imported properties can be removed without losing valid criteria", async ({
  page,
}) => {
  await page.goto("/regex");
  await page.getByRole("tab", { name: /Presets/ }).click();
  const file = {
    format: "exile-atlas-regex",
    version: 1,
    presets: [
      {
        id: "old",
        name: "Older properties",
        draft: {
          category: "equipment",
          match: "any",
          wanted: [],
          unwanted: [],
          properties: { obsolete: { min: "10", max: "" }, rarity: "rare" },
          text: "",
        },
        favorite: false,
        createdAt: "2026-10-12T00:00:00Z",
        updatedAt: "2026-10-12T00:00:00Z",
      },
    ],
  };
  await page.getByLabel("Import preset file", { exact: true }).setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await page.getByRole("button", { name: "Load Older properties", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Remove property obsolete", exact: true }).click();
  await expect(page.getByLabel("Rarity", { exact: true })).toHaveValue("rare");
  await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeEnabled();
});
test("presets survive reload and support update, favorites, duplicates and portable files", async ({
  page,
}) => {
  await page.goto("/regex");
  await page.getByLabel("Additional text", { exact: true }).fill("boots");
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByLabel("Preset name", { exact: true }).fill("Vendor boots");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.reload();
  await page.getByRole("tab", { name: /Presets/ }).click();
  await expect(page.getByText("Vendor boots", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Favorite Vendor boots", exact: true }).click();
  await page.getByRole("button", { name: "Duplicate Vendor boots", exact: true }).click();
  await expect(page.getByText("Vendor boots (copy)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load Vendor boots", exact: true }).click();
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByLabel("Additional text", { exact: true }).fill("helmet");
  await page.getByRole("button", { name: "Update preset", exact: true }).click();
  await page.getByRole("tab", { name: /Presets/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all presets", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("exile-atlas-presets.json");
  await page.getByLabel("Import preset file", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("bad json"),
  });
  await expect(page.getByRole("status").filter({ hasText: "valid JSON" })).toBeVisible();
  await expect(page.getByText("Vendor boots (copy)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete Vendor boots (copy)", exact: true }).click();
  await expect(page.getByText("Vendor boots (copy)", { exact: true })).toHaveCount(0);
});
test("local settings remain available on account status failure and clear includes presets", async ({
  page,
}) => {
  await page.goto("/regex");
  await page.getByLabel("Additional text", { exact: true }).fill("boots");
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByLabel("Preset name", { exact: true }).fill("Boots");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.route("**/api/status", (route) =>
    route.fulfill({ status: 500, json: { error: "Offline" } }),
  );
  await page.goto("/settings");
  await expect(page.getByText(/1 search preset/)).toBeVisible();
  await page.getByRole("button", { name: "Clear browser drafts", exact: true }).click();
  await page.getByRole("button", { name: "Clear all drafts", exact: true }).click();
  await page.goto("/regex");
  await page.getByRole("tab", { name: /Presets/ }).click();
  await expect(page.getByText("No presets yet.", { exact: true })).toBeVisible();
});

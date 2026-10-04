import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("build drafts survive reload and export the documented object", async ({ page }) => {
  await page.goto("/builds");
  await expect(page.getByLabel("Build name", { exact: true })).toHaveValue("Untitled build");
  await page.getByLabel("Build name", { exact: true }).fill("My Titan guide");
  await page.getByLabel("Author", { exact: true }).fill("An exile");
  await page
    .getByLabel("Skill metadata ID", { exact: true })
    .fill("Metadata/Items/Gems/SkillGemEarthquake");
  await page.getByRole("button", { name: "Add skill", exact: true }).click();
  await expect(page.getByText("SkillGemEarthquake", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save build", exact: true }).click();
  await expect(page.getByText("Build saved to your library in this browser.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^My Titan guide/ }).click();
  await expect(page.getByLabel("Build name", { exact: true })).toHaveValue("My Titan guide");
  await expect(page.getByText("SkillGemEarthquake", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .build", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("My_Titan_guide.build");
  const file = await download.path();
  expect(file).not.toBeNull();
  expect(JSON.parse(await readFile(file!, "utf8"))).toMatchObject({
    name: "My Titan guide",
    author: "An exile",
    skills: [{ id: "Metadata/Items/Gems/SkillGemEarthquake" }],
  });
});
test("filter generation, persistence and disconnected sync state", async ({ page }) => {
  await page.goto("/filters");
  await page.getByLabel("Filter name", { exact: true }).fill("My leveling filter");
  await page.getByRole("button", { name: "Apply settings to rules" }).click();
  await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(/My leveling filter/);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "My leveling filter", exact: true }).click();
  await expect(page.getByLabel("Filter name", { exact: true })).toHaveValue("My leveling filter");
  await expect(page.getByRole("button", { name: "Sync to GGG", exact: true })).toBeDisabled();
});
test("unauthenticated account tools explain setup and do not display fabricated data", async ({
  page,
}) => {
  await page.goto("/characters");
  await expect(page.getByRole("heading", { name: "Bring your exile along." })).toBeVisible();
  await page.getByRole("link", { name: "Set up account connection" }).click();
  await expect(page.getByRole("heading", { name: "Application configuration" })).toBeVisible();
  await expect(page.getByText("Bun", { exact: false }).first()).toBeVisible();
});
test("layout stays within the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to your Atlas." })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

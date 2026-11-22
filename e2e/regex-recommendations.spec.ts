import { expect, test } from "@playwright/test";

test("Tablet and Relic recommendations apply to separate editable searches", async ({ page }) => {
  await page.goto("/regex");
  const result = page.getByLabel("Generated search", { exact: true });
  const tabletTab = page.getByRole("tab", { name: "Tablets", exact: true });
  const relicTab = page.getByRole("tab", { name: "Relics", exact: true });

  await tabletTab.click();
  const tablets = page.getByRole("region", { name: "Tablet recommendations" });
  await expect(tablets.getByRole("button")).toHaveCount(3);
  await tablets.getByRole("button", { name: "Apply Pack density" }).click();
  await expect(result).toHaveValue(/Pack Size in Map/);
  const tabletModifier = "#% increased Pack Size in Map";
  await expect(page.getByLabel(`Action for ${tabletModifier}`, { exact: true })).toHaveValue(
    "want",
  );
  await page.getByLabel(`${tabletModifier} minimum`, { exact: true }).fill("20");
  const editedTabletSearch = await result.inputValue();
  await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeEnabled();

  await relicTab.click();
  const relics = page.getByRole("region", { name: "Relic recommendations" });
  await expect(relics.getByRole("button")).toHaveCount(3);
  await expect(result).toHaveValue("");
  await relics.getByRole("button", { name: "Apply Honour protection" }).click();
  await expect(result).toHaveValue(/Honour Resistance/);
  await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeEnabled();

  await tabletTab.click();
  await expect(result).toHaveValue(editedTabletSearch);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

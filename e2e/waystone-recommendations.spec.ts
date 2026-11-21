import { expect, test } from "@playwright/test";

test("choosing a T15 strategy updates exact Waystone inputs and sliders immediately", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/regex");

  const recommendations = page.getByRole("region", { name: "T15 Waystone recommendations" });
  const strategy = recommendations.getByLabel("Farming strategy");
  const recommendedSearch = recommendations.getByLabel("Recommended search");
  const generatedSearch = page.getByLabel("Generated search", { exact: true });
  await expect(strategy.locator("option:not(:disabled)")).toHaveCount(11);

  const avoid = page.getByLabel("Action for Area has patches of Chilled Ground", { exact: true });
  await avoid.selectOption("exclude");
  await page.getByLabel("Item rarity yield maximum").fill("99");
  const rounding = page.getByRole("checkbox", { name: /Round minimums/ });
  await rounding.check();
  await strategy.selectOption({ label: "Abyss farming" });
  await expect(recommendations.getByText("Pack Size ≥15%")).toBeVisible();
  await expect(recommendedSearch).toHaveValue(/"er 15\\\)"/);
  await expect(page.getByLabel("Waystone tier minimum")).toHaveValue("15");
  await expect(page.getByLabel("Waystone tier maximum")).toHaveValue("15");
  await expect(page.getByLabel("Pack size minimum")).toHaveValue("15");
  await expect(page.getByLabel("Pack size slider")).toHaveValue("15");
  await expect(page.getByLabel("Monster rarity slider")).toHaveValue("50");
  await expect(page.getByLabel("Item rarity yield maximum")).toHaveValue("");
  await expect(rounding).not.toBeChecked();
  await expect(avoid).toHaveValue("exclude");
  await expect(generatedSearch).toHaveValue(/"!chi"/);
  const appliedSearch = await generatedSearch.inputValue();

  await recommendations.getByRole("button", { name: "Copy recommended search" }).click();
  await expect(recommendations.getByRole("status")).toHaveText("Recommended search copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await recommendedSearch.inputValue(),
  );
  await expect(generatedSearch).toHaveValue(appliedSearch);

  await strategy.selectOption({ label: "Waystone sustain / tablet farming" });
  await expect(recommendations.getByText("Waystone Drop Chance ≥120%")).toBeVisible();
  await expect(page.getByLabel("Waystone drop chance minimum")).toHaveValue("120");
  const dropChanceSlider = page.getByLabel("Waystone drop chance slider");
  await expect(dropChanceSlider).toHaveValue("120");
  await expect(dropChanceSlider).toHaveAttribute("max", "140");
  await dropChanceSlider.press("End");
  await expect(page.getByLabel("Waystone drop chance minimum")).toHaveValue("140");
  await expect(page.getByLabel("Pack size minimum")).toHaveValue("");
  await expect(page.getByLabel("Monster rarity minimum")).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(strategy).toHaveValue("");
  await strategy.selectOption({ label: "Normal mapping — balanced" });
  await expect(page.getByLabel("Item rarity yield slider")).toHaveValue("30");
  await expect(page.getByLabel("Monster rarity slider")).toHaveValue("40");

  await page.getByRole("tab", { name: "Tablets", exact: true }).click();
  await expect(recommendations).toHaveCount(0);
});

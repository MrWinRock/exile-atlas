import { expect, test } from "@playwright/test";

test("the complete poe2.re Waystone example is configurable, copyable and saved", async ({
  page,
}) => {
  await page.goto("/regex");
  for (const label of [
    "Item rarity yield",
    "Waystone drop chance",
    "Monster effectiveness",
    "Monster rarity",
    "Pack size",
  ])
    await page.getByLabel(`${label} minimum`, { exact: true }).fill("40");
  const wanted = [
    "Area has patches of Ignited Ground",
    "Area has patches of Shocked Ground",
    "#% more Monster Life",
    "+#% Monster Elemental Resistances",
  ];
  for (const label of wanted)
    await page.getByLabel(`Action for ${label}`, { exact: true }).selectOption("want");
  for (const [label, max] of [
    ["#% more Monster Life", "30"],
    ["+#% Monster Elemental Resistances", "40"],
  ]) {
    await page.getByLabel(`${label} minimum`, { exact: true }).fill("20");
    await page.getByLabel(`${label} maximum`, { exact: true }).fill(max);
  }
  for (const label of [
    "Area has patches of Chilled Ground",
    "Monsters are Evasive",
    "Monsters are Armoured",
  ])
    await page.getByLabel(`Action for ${label}`, { exact: true }).selectOption("exclude");
  const expected =
    '"gn|cke|(2\\d|30)\\(.*fe$|([23]\\d|40)\\(.*r el" "!chi|siv|oure" "m rar.*([4-9].|\\d..)%" "p c.*([4-9].|\\d..)%" "r ef.*([4-9].|\\d..)%" "r rar.*([4-9].|\\d..)%" "k s.*([4-9].|\\d..)%"';
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveValue(expected);
  await expect(page.getByRole("button", { name: "Copy search", exact: true })).toBeEnabled();
  for (const [label, min, max] of [
    ["Waystone tier", "1", "16"],
    ["Revives", "0", "6"],
  ]) {
    await page.getByLabel(`${label} minimum`, { exact: true }).fill(min);
    await page.getByLabel(`${label} maximum`, { exact: true }).fill(max);
  }
  await page.getByLabel("Rarity", { exact: true }).selectOption("normal,magic,rare");
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveValue(expected);
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByLabel("Preset name", { exact: true }).fill("Reference Waystones");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Generated search", { exact: true })).toHaveValue(expected);
  await page.getByRole("tab", { name: /Presets/ }).click();
  await expect(page.getByText("Reference Waystones", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

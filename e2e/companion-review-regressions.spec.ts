import { expect, test } from "@playwright/test";
import { normalizeMarket } from "../src/lib/currency";
import { readFileSync } from "node:fs";
const snapshot = JSON.parse(readFileSync("public/data/poe2-game-data.json", "utf8"));
test("new sourced presets record snapshots through ordinary first-roll editing", async ({
  page,
}) => {
  await page.goto("/regex");
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  await page.getByLabel("Search modifiers", { exact: true }).fill("+# to Strength");
  await page.getByLabel("Action for +# to Strength", { exact: true }).selectOption("want");
  await page.getByLabel("+# to Strength minimum", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByLabel("Preset name", { exact: true }).fill("Source ring");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  const preset = await page.evaluate(
    () => JSON.parse(localStorage.getItem("exile-atlas-regex-v1")!).state.presets[0],
  );
  expect(preset.draft.snapshotId).toBe(snapshot.id);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("exile-atlas-regex-v1")!);
    data.state.presets[0].draft.snapshotId = "b".repeat(64);
    localStorage.setItem("exile-atlas-regex-v1", JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole("tab", { name: /Presets/ }).click();
  await page.getByRole("button", { name: "Load Source ring", exact: true }).click();
  await page.getByLabel("Search modifiers", { exact: true }).fill("+# to Strength");
  await page.getByLabel("+# to Strength minimum", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Show search options", exact: true }).click();
  await page.getByRole("button", { name: "Update preset", exact: true }).click();
  const updated = await page.evaluate(
    () => JSON.parse(localStorage.getItem("exile-atlas-regex-v1")!).state.presets[0],
  );
  expect(updated.draft.snapshotId).toBe("b".repeat(64));
});
test("changing crafting currency invalidates market and manual costs for plans and spend", async ({
  page,
}) => {
  const exalt = "Metadata/Items/Currency/CurrencyAddModToRare",
    divine = "Metadata/Items/Currency/CurrencyModValues";
  const market = normalizeMarket({
    league: "Standard",
    market_pair: [exalt, divine],
    volume_traded: { [exalt]: 100, [divine]: 10 },
    lowest_stock: {},
    highest_stock: {},
    lowest_ratio: { [exalt]: 10, [divine]: 1 },
    highest_ratio: { [exalt]: 12, [divine]: 1 },
  });
  await page.route("**/api/currency*", (r) =>
    r.fulfill({ json: { hour: 1791846000, markets: [market] } }),
  );
  await page.goto("/crafting");
  await page.getByLabel("Quote league").fill("Standard");
  await page.getByRole("button", { name: "Add crafting step", exact: true }).click();
  await page
    .getByRole("button", { name: "Fill missing completed-hour costs", exact: true })
    .click();
  await expect(page.getByLabel("Step 1 unit cost", { exact: true })).not.toHaveValue("");
  await page
    .getByLabel("Step 1 action")
    .selectOption("Metadata/Items/Currency/CurrencyUpgradeToRare");
  await expect(page.getByLabel("Step 1 unit cost", { exact: true })).toHaveValue("");
  await expect(page.getByText(/Historical midpoint estimate/)).toHaveCount(0);
  await page.getByRole("button", { name: "Add actual spend", exact: true }).click();
  await page.getByLabel("Spend 1 unit cost", { exact: true }).fill("2");
  await page
    .getByLabel("Spend 1 action")
    .selectOption("Metadata/Items/Currency/CurrencyUpgradeToRare");
  await expect(page.getByLabel("Spend 1 unit cost", { exact: true })).toHaveValue("");
});
test("comparison displays changed support levels and notes", async ({ page }) => {
  await page.route("**/api/tree", (r) =>
    r.fulfill({ json: { nodes: [], edges: [], classes: [] } }),
  );
  await page.goto("/compare");
  const build = (name: string, level: number[], note: string) => ({
    name,
    skills: [
      {
        id: "fire",
        support_skills: [{ id: "support", level_interval: level, additional_text: note }],
      },
    ],
  });
  await page.getByLabel("Import left build", { exact: true }).setInputFiles({
    name: "l.build",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(build("Left", [2, 5], "Before support note"))),
  });
  await page.getByLabel("Import right build", { exact: true }).setInputFiles({
    name: "r.build",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(build("Right", [3, 7], "After support note"))),
  });
  await expect(page.getByText("Support level: 2–5", { exact: true })).toBeVisible();
  await expect(page.getByText("Support level: 3–7", { exact: true })).toBeVisible();
  await expect(page.getByText("Before support note", { exact: true })).toBeVisible();
  await expect(page.getByText("After support note", { exact: true })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const fixture = {
  identity: "atlas-browser-test",
  source: "https://example.com/atlas",
  captured: "2026-09-15",
  patch: "test",
  nodes: [
    {
      id: "root",
      name: "Core start",
      branch: "Core",
      root: true,
      decorative: false,
      kind: "normal",
      x: 0,
      y: 0,
      effects: [],
    },
    {
      id: "a",
      name: "Bridge",
      branch: "Core",
      root: false,
      decorative: false,
      kind: "normal",
      x: 200,
      y: 0,
      effects: ["Map reward"],
    },
    {
      id: "b",
      name: "Reward",
      branch: "Core",
      root: false,
      decorative: false,
      kind: "notable",
      x: 400,
      y: 0,
      effects: ["More items"],
    },
    {
      id: "art",
      name: "Illustration",
      branch: "Core",
      root: false,
      decorative: true,
      kind: "normal",
      x: 200,
      y: 200,
      effects: [],
    },
    {
      id: "ritual",
      name: "Ritual start",
      branch: "Ritual",
      root: true,
      decorative: false,
      kind: "normal",
      x: 0,
      y: 0,
      effects: [],
    },
    {
      id: "c",
      name: "Ritual reward",
      branch: "Ritual",
      root: false,
      decorative: false,
      kind: "notable",
      x: 200,
      y: 0,
      effects: ["More Tribute"],
    },
  ],
  edges: [
    ["root", "a"],
    ["a", "b"],
    ["ritual", "c"],
  ],
};
async function select(page: import("@playwright/test").Page, name: string, id: string) {
  await page.getByLabel("Search Atlas nodes", { exact: true }).fill(name);
  await page.getByRole("button", { name: `Select Atlas ${name} (${id})`, exact: true }).click();
}

test("Atlas plans allocate, refund, undo, save, reload and back up separately", async ({
  page,
}) => {
  await page.route("**/data/poe2-atlas.json", (r) => r.fulfill({ json: fixture }));
  await page.goto("/atlas");
  await expect(page.getByRole("heading", { name: "Shape your endgame." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo Atlas change", exact: true })).toBeDisabled();
  await select(page, "Reward", "b");
  await page.getByRole("button", { name: "Allocate Atlas path", exact: true }).click();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("2");
  await page.getByRole("button", { name: "Undo Atlas change", exact: true }).click();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("0");
  await page.getByRole("button", { name: "Allocate Atlas path", exact: true }).click();
  await page.getByRole("tab", { name: /^Ritual / }).click();
  await select(page, "Ritual reward", "c");
  await page.getByRole("button", { name: "Allocate Atlas path", exact: true }).click();
  await page.getByRole("tab", { name: /^Core / }).click();
  await select(page, "Bridge", "a");
  await page.getByRole("button", { name: "Refund Atlas node", exact: true }).click();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("0");
  await expect(page.getByTestId("atlas-Ritual-count")).toHaveText("1");
  await page.getByRole("button", { name: "Undo Atlas change", exact: true }).click();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("2");
  await page.getByRole("button", { name: "Reset Atlas plan", exact: true }).click();
  await expect(page.getByTestId("atlas-Ritual-count")).toHaveText("0");
  await page.getByRole("button", { name: "Undo Atlas change", exact: true }).click();
  await expect(page.getByTestId("atlas-Ritual-count")).toHaveText("1");
  await page.getByLabel("Atlas plan name", { exact: true }).fill("Endgame route");
  await page.getByRole("button", { name: "Save Atlas plan", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("2");
  await expect(page.getByRole("button", { name: "Load Endgame route", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Atlas plans", exact: true }).click();
  const file = await (await download).path();
  const exported = JSON.parse(await readFile(file!, "utf8"));
  expect(exported.format).toBe("exile-atlas-atlas");
  expect(exported.records[0].plan.allocated).toEqual(["a", "b", "c"]);
  await page
    .getByLabel("Import Atlas plans", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await expect(page.getByRole("button", { name: "Load Endgame route", exact: true })).toHaveCount(
    2,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Atlas budgets and source guards prevent unsafe allocation while preserving imports", async ({
  page,
}) => {
  await page.route("**/data/poe2-atlas.json", (r) => r.fulfill({ json: fixture }));
  await page.goto("/atlas");
  await page.getByLabel("Core planning budget", { exact: true }).fill("1");
  await select(page, "Reward", "b");
  await expect(
    page.getByRole("button", { name: "Allocate Atlas path", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/path exceeds the branch planning budget/)).toBeVisible();
  await select(page, "Illustration", "art");
  await expect(page.getByRole("button", { name: "Allocate Atlas path", exact: true })).toHaveCount(
    0,
  );
  const old = {
    format: "exile-atlas-atlas",
    version: 1,
    records: [
      {
        id: "old",
        name: "Old Atlas",
        plan: { dataset: "older-atlas", allocated: ["unknown"], budgets: {} },
      },
    ],
  };
  await page
    .getByLabel("Import Atlas plans", { exact: true })
    .setInputFiles({
      name: "old.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(old)),
    });
  await page.getByRole("button", { name: "Load Old Atlas", exact: true }).click();
  await expect(page.getByText(/different Atlas dataset/)).toBeVisible();
  await expect(page.getByText("Unknown node: unknown", { exact: true })).toBeVisible();
  await select(page, "Reward", "b");
  await expect(
    page.getByRole("button", { name: "Allocate Atlas path", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save Atlas plan", exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export current Atlas plan", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Reset Atlas plan", exact: true }).click();
  await expect(page.getByText("Unknown node: unknown", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo Atlas change", exact: true }).click();
  await expect(page.getByText("Unknown node: unknown", { exact: true })).toBeVisible();
});

test("bundled Atlas displays real sourced node images and independent branch views", async ({
  page,
}) => {
  await page.goto("/atlas");
  const svg = page.getByRole("img", { name: /Core Atlas tree/ });
  await expect(svg).toBeVisible();
  expect(await svg.locator("image").count()).toBeGreaterThan(300);
  await page.getByLabel("Search Atlas nodes", { exact: true }).fill("Shrine Chance");
  await page
    .getByRole("button", { name: "Select Atlas Shrine Chance (48942)", exact: true })
    .click();
  await expect(page.getByTestId("atlas-selected-art")).toBeVisible();
  await page.getByRole("button", { name: "Allocate Atlas path", exact: true }).click();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("1");
  await page.getByRole("tab", { name: /^Breach / }).click();
  await expect(page.getByRole("img", { name: /Breach Atlas tree/ })).toBeVisible();
  await expect(page.getByTestId("atlas-Core-count")).toHaveText("1");
  expect((await page.request.get("/art/planning/atlas-icons.webp")).ok()).toBe(true);
});

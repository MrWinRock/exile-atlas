import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { normalizeTree } from "../src/lib/tree";

const tree = normalizeTree({
  nodes: {
    root: {
      id: "warrior-start",
      name: "Class start",
      x: 0,
      y: 0,
      classStartIndex: 6,
      out: ["a", "p1"],
    },
    a: { id: "shared-a", name: "Shared bridge", x: 500, y: 0, out: ["l1", "r1"] },
    l1: { id: "left-1", name: "Left path", x: 1000, y: 0, out: ["l2"] },
    l2: { id: "left-2", name: "Left terminal", x: 1500, y: 0 },
    r1: { id: "right-1", name: "Right path", x: 500, y: 500, out: ["r2"] },
    r2: { id: "right-2", name: "Right terminal", x: 500, y: 1000 },
    ...Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [
        `p${i + 1}`,
        {
          id: `chain-${i + 1}`,
          name: `Chain ${i + 1}`,
          x: -500 * (i + 1),
          y: 0,
          out: i < 24 ? [`p${i + 2}`] : [],
        },
      ]),
    ),
    asc: {
      id: "asc-start",
      name: "Titan start",
      x: 0,
      y: -5000,
      isAscendancyStart: true,
      ascendancyId: "Warrior1",
      out: ["asc1"],
    },
    asc1: {
      id: "asc-one",
      name: "Ascendancy strength",
      x: 500,
      y: -5000,
      ascendancyId: "Warrior1",
    },
  },
  classes: Array.from({ length: 7 }, (_, i) => ({
    name: i === 6 ? "Warrior" : `Class ${i}`,
    ascendancies: i === 6 ? [{ id: "Warrior1", name: "Titan" }] : [],
  })),
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/tree", (route) => route.fulfill({ json: tree }));
  await page.goto("/planner");
  await expect(page.getByRole("tab", { name: /^Shared/ })).toBeVisible();
});

test("planner saves independent weapon trees, restores them, and refunds disconnected paths", async ({
  page,
}) => {
  const search = page.getByLabel("Search passive nodes");
  async function select(name: string) {
    await search.fill(name);
    await page.getByRole("button", { name: `Select passive: ${name}`, exact: true }).click();
  }
  await select("Shared bridge");
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await page.getByRole("tab", { name: /^Weapon set I / }).click();
  await select("Left terminal");
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("2 / 24");
  await page.getByRole("tab", { name: /^Weapon set II / }).click();
  await select("Right terminal");
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("2 / 24");
  await expect(page.getByTestId("regular-points-count")).toHaveText("3");
  await page.reload();
  await expect(page.getByRole("tab", { name: /^Weapon set II / })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("2 / 24");
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("2 / 24");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .build", exact: true }).click();
  const file = await (await downloadPromise).path();
  expect(JSON.parse(await readFile(file!, "utf8")).passives).toEqual([
    "shared-a",
    { id: "left-1", weapon_set: 1 },
    { id: "left-2", weapon_set: 1 },
    { id: "right-1", weapon_set: 2 },
    { id: "right-2", weapon_set: 2 },
  ]);
  await page.getByRole("button", { name: "Save to library", exact: true }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("exile-atlas-workspace-v1")!).state.builds[0].build,
  );
  expect(saved.passives).toHaveLength(5);
  await page.getByRole("tab", { name: /^Weapon set I / }).click();
  await select("Left path");
  await page.getByRole("button", { name: "Unallocate node", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("0 / 24");
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("2 / 24");
  await select("Shared bridge");
  await page.getByRole("button", { name: "Unallocate node", exact: true }).click();
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("0 / 24");
  await expect(page.getByTestId("regular-points-count")).toHaveText("0");
});

test("weapon limits reject whole paths and ascendancy remains shared on reload", async ({
  page,
}) => {
  await page.getByRole("tab", { name: /^Weapon set I / }).click();
  await page.getByLabel("Search passive nodes").fill("Chain 25");
  await page.getByRole("button", { name: "Select passive: Chain 25", exact: true }).click();
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "24-point limit" })).toBeVisible();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("0 / 24");
  await page.getByLabel("Search passive nodes").fill("Chain 24");
  await page.getByRole("button", { name: "Select passive: Chain 24", exact: true }).click();
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("24 / 24");
  await page.getByRole("combobox", { name: "Ascendancy", exact: true }).click();
  await page.getByRole("option", { name: "Titan", exact: true }).click();
  await page.getByLabel("Search passive nodes").fill("Ascendancy strength");
  await page
    .getByRole("button", { name: "Select passive: Ascendancy strength", exact: true })
    .click();
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("24 / 24");
  await expect(page.getByTestId("ascendancy-points-count")).toHaveText("1");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Ascendancy", exact: true })).toHaveText(/Titan/);
  await expect(page.getByTestId("ascendancy-points-count")).toHaveText("1");
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

test("existing browser drafts retain shared nodes when weapon sets are introduced", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "exile-atlas-workspace-v1",
      JSON.stringify({
        state: { allocations: ["a", "l1"], classIndex: 6, builds: [], filters: [] },
        version: 0,
      }),
    ),
  );
  await page.reload();
  await expect(page.getByTestId("regular-points-count")).toHaveText("2");
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("0 / 24");
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("0 / 24");
  await page.getByLabel("Search passive nodes").fill("Left path");
  await page.getByRole("button", { name: "Select passive: Left path", exact: true }).click();
  await page.getByRole("button", { name: "Unallocate node", exact: true }).click();
  await expect(page.getByTestId("regular-points-count")).toHaveText("1");
});

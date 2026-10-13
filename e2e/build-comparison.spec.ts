import { expect, test } from "@playwright/test";
import { normalizeTree } from "../src/lib/tree";
test("comparison imports stay in memory until explicit save; invalid files retain selections", async ({
  page,
}) => {
  const tree = normalizeTree({
    nodes: { a: { id: "a", name: "A", x: 0, y: 0 }, b: { id: "b", name: "B", x: 200, y: 0 } },
  });
  await page.route("**/api/tree", (r) =>
    r.fulfill({ json: { ...tree, source: "Fixture", revision: "fixture" } }),
  );
  await page.goto("/compare");
  await expect(page.getByLabel("Import left build", { exact: true })).toBeEnabled();
  const before = await page.evaluate(() => localStorage.getItem("exile-atlas-workspace-v1"));
  const build = {
    name: "Imported left",
    passives: [{ id: "a", weapon_set: 1 }],
    skills: [{ id: "fire", support_skills: ["support-a"], additional_text: "Keep note" }],
  };
  await page.getByLabel("Import left build", { exact: true }).setInputFiles({
    name: "left.build",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(build)),
  });
  await page.getByLabel("Import right build", { exact: true }).setInputFiles({
    name: "right.build",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...build,
        name: "Imported right",
        passives: [{ id: "a", weapon_set: 2 }],
        skills: [{ id: "fire", support_skills: ["support-b"], additional_text: "New note" }],
      }),
    ),
  });
  await expect(page.getByText(/support-a/)).toBeVisible();
  await expect(page.getByText(/support-b/)).toBeVisible();
  const left = await page.getByLabel("Left build", { exact: true }).inputValue();
  await page.getByLabel("Import left build", { exact: true }).setInputFiles({
    name: "bad.build",
    mimeType: "application/json",
    buffer: Buffer.from("broken"),
  });
  await expect(page.getByLabel("Left build", { exact: true })).toHaveValue(left);
  await page.getByLabel("Import left build", { exact: true }).setInputFiles({
    name: "huge.build",
    mimeType: "application/json",
    buffer: Buffer.alloc(1048577, 65),
  });
  await expect(
    page.getByText("Build imports must be at most 1 MiB", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View weapon set I", exact: true }).first().click();
  await page.getByRole("button", { name: "View weapon set II", exact: true }).last().click();
  expect(await page.evaluate(() => localStorage.getItem("exile-atlas-workspace-v1"))).toBe(before);
  await page
    .getByRole("button", { name: "Save imported copy to library", exact: true })
    .first()
    .click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("exile-atlas-workspace-v1")!).state,
  );
  expect(saved.builds).toHaveLength(1);
  expect(saved.builds[0].build).toEqual(build);
  expect(saved.allocations).toEqual([]);
});
test("comparison preserves weapon membership and never changes working plan or saved sources", async ({
  page,
}) => {
  const tree = normalizeTree({
    nodes: { a: { id: "a", name: "A", x: 0, y: 0 }, b: { id: "b", name: "B", x: 300, y: 0 } },
  });
  await page.route("**/api/tree", (r) =>
    r.fulfill({ json: { ...tree, source: "Fixture", revision: "fixture" } }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "exile-atlas-workspace-v1",
      JSON.stringify({
        state: {
          builds: [
            {
              id: "l",
              updatedAt: "2026-10-13",
              build: { name: "Left build", passives: [{ id: "a", weapon_set: 1 }] },
            },
            {
              id: "r",
              updatedAt: "2026-10-13",
              build: { name: "Right build", passives: [{ id: "a", weapon_set: 2 }, "unknown"] },
            },
          ],
          filters: [],
          allocations: ["working"],
          weaponSet1Allocations: ["other"],
          weaponSet2Allocations: [],
          weaponSet: 1,
          classIndex: 6,
          ascendancy: "",
        },
        version: 0,
      }),
    ),
  );
  await page.goto("/compare");
  await page.getByLabel("Left build", { exact: true }).selectOption("l");
  await page.getByLabel("Right build", { exact: true }).selectOption("r");
  await expect(page.getByText("right: unknown", { exact: true })).toBeVisible();
  await expect(page.getByTestId("comparison-passive-added").first()).toContainText("Weapon set II");
  await expect(page.getByTestId("comparison-passive-removed").first()).toContainText(
    "Weapon set I",
  );
  const before = await page.evaluate(() => localStorage.getItem("exile-atlas-workspace-v1"));
  await page.getByLabel("Differences only").uncheck();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download comparison report", exact: true }).click();
  await download;
  expect(await page.evaluate(() => localStorage.getItem("exile-atlas-workspace-v1"))).toBe(before);
});

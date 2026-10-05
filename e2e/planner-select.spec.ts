import { expect, test } from "@playwright/test";
import type { Tree } from "../src/lib/tree";

const tree: Tree = {
  nodes: [
    ...[6, 7, 8].map((index) => ({
      hash: `start-${index}`,
      id: `start-${index}`,
      name: "Class start",
      kind: "start" as const,
      x: 2000 * (index - 7),
      y: -1600,
      out: [],
      stats: [],
      classStarts: [index],
    })),
    ...["shared", "weapon1", "weapon2"].map((hash, index) => ({
      hash,
      id: hash,
      name: `Planned passive ${index + 1}`,
      kind: "normal" as const,
      x: -2500 - index * 500,
      y: -1600,
      out: [],
      stats: [],
      classStarts: [],
    })),
  ],
  edges: [
    ["start-6", "shared"],
    ["shared", "weapon1"],
    ["shared", "weapon2"],
  ],
  classes: [
    {
      index: 6,
      name: "Warrior",
      ascendancies: [
        { id: "Titan", name: "Titan" },
        { id: "Warbringer", name: "Warbringer" },
      ],
    },
    {
      index: 7,
      name: "Witch",
      ascendancies: [
        { id: "Infernalist", name: "Infernalist" },
        { id: "BloodMage", name: "Blood Mage" },
      ],
    },
    { index: 8, name: "Ranger", ascendancies: [{ id: "Deadeye", name: "Deadeye" }] },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/tree", (route) => route.fulfill({ json: tree }));
  await page.goto("/planner");
});

test("planner class and ascendancy menus support keyboard choice and cancellation", async ({
  page,
}) => {
  const classSelect = page.getByRole("combobox", { name: "Class", exact: true });
  const ascendancySelect = page.getByRole("combobox", { name: "Ascendancy", exact: true });
  await classSelect.focus();
  await classSelect.press("ArrowDown");
  const classList = page.getByRole("listbox", { name: "Class", exact: true });
  await expect(classList).toBeVisible({ timeout: 5000 });
  await expect(classList.getByRole("option", { name: "Warrior", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await classSelect.press("End");
  await classSelect.press("Enter");
  await expect(classSelect).toHaveText(/Ranger/);
  await expect(classSelect).toBeFocused();
  await classSelect.press("Home");
  await classSelect.press("w");
  await classSelect.press("Enter");
  await expect(classSelect).toHaveText(/Witch/);
  await ascendancySelect.press("Space");
  const ascendancyList = page.getByRole("listbox", { name: "Ascendancy", exact: true });
  await expect(
    ascendancyList.getByRole("option", { name: "Blood Mage", exact: true }),
  ).toBeVisible();
  await ascendancySelect.press("b");
  await ascendancySelect.press("Enter");
  await expect(ascendancySelect).toHaveText(/Blood Mage/);
  await ascendancySelect.press("ArrowDown");
  await ascendancySelect.press("Home");
  await ascendancySelect.press("Escape");
  await expect(ascendancyList).toHaveCount(0);
  await expect(ascendancySelect).toHaveText(/Blood Mage/);
  await expect(ascendancySelect).toBeFocused();
});

test("planner custom menus close outside and remain within the viewport", async ({ page }) => {
  const classSelect = page.getByRole("combobox", { name: "Class", exact: true });
  await classSelect.click();
  const list = page.getByRole("listbox", { name: "Class", exact: true });
  await expect(list).toBeVisible({ timeout: 5000 });
  const box = await list.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await list.getByRole("option", { name: "Ranger", exact: true }).click();
  await expect(classSelect).toHaveText(/Ranger/);
  await expect(classSelect).toBeFocused();
  await classSelect.click();
  await expect(list).toBeVisible();
  await page.getByRole("heading", { name: "The path is yours.", exact: true }).click();
  await expect(list).toHaveCount(0);
  await expect(classSelect).toHaveText(/Ranger/);
  await classSelect.click();
  await classSelect.press("Tab");
  await expect(list).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Ascendancy", exact: true })).toBeFocused();
});

test("reselecting the current planner class preserves shared and both weapon drafts", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "exile-atlas-workspace-v1",
      JSON.stringify({
        state: {
          allocations: ["shared"],
          weaponSet1Allocations: ["weapon1"],
          weaponSet2Allocations: ["weapon2"],
          weaponSet: 2,
          ascendancy: "",
          classIndex: 6,
          builds: [],
          filters: [],
        },
        version: 0,
      }),
    ),
  );
  await page.reload();
  const classSelect = page.getByRole("combobox", { name: "Class", exact: true });
  const list = page.getByRole("listbox", { name: "Class", exact: true });
  await expect(classSelect).toHaveText(/Warrior/);
  await expect(page.getByTestId("regular-points-count")).toHaveText("2");
  for (const method of ["pointer", "keyboard"]) {
    await classSelect.click();
    if (method === "pointer") {
      await list.getByRole("option", { name: "Warrior", exact: true }).click();
    } else {
      await classSelect.press("Enter");
    }
    await expect(list).toHaveCount(0);
    await expect(classSelect).toBeFocused();
    await expect(page.getByTestId("regular-points-count")).toHaveText("2");
    await expect(page.getByTestId("weapon-set-1-count")).toHaveText("1 / 24");
    await expect(page.getByTestId("weapon-set-2-count")).toHaveText("1 / 24");
    await expect(page.getByRole("tab", { name: /^Weapon set II / })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
  await page.reload();
  await expect(page.getByTestId("regular-points-count")).toHaveText("2");
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("1 / 24");
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("1 / 24");
});

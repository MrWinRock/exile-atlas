import { expect, test } from "@playwright/test";
import type { Tree } from "../src/lib/tree";

const tree: Tree = {
  nodes: [6, 7, 8].map((index) => ({
    hash: `start-${index}`,
    id: `start-${index}`,
    name: "Class start",
    kind: "start",
    x: 2000 * (index - 7),
    y: -1600,
    out: [],
    stats: [],
    classStarts: [index],
  })),
  edges: [],
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

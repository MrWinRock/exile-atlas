import { expect, test } from "@playwright/test";
import { normalizeTree } from "../src/lib/tree";
const tree = normalizeTree({
  nodes: {
    root: { id: "root", name: "Start", classStartIndex: 6, x: 0, y: 0, out: ["a"] },
    a: { id: "a", name: "Shared bridge", x: 250, y: 0, out: ["b", "c"] },
    b: { id: "b", name: "Red branch", x: 500, y: 0 },
    c: { id: "c", name: "Green branch", x: 250, y: 250 },
  },
  classes: Array.from({ length: 7 }, (_, i) => ({ name: `Class ${i}`, ascendancies: [] })),
});
test("class and ascendancy changes undo as one complete planning action", async ({ page }) => {
  const contextTree = normalizeTree({
    nodes: {
      root: { id: "root", name: "Start", classStartIndex: 6, x: 0, y: 0, out: ["a"] },
      a: { id: "a", name: "Shared bridge", x: 250, y: 0, out: ["b", "c"] },
      b: { id: "b", name: "Red branch", x: 500, y: 0 },
      c: { id: "c", name: "Green branch", x: 250, y: 250 },
      asc: {
        id: "asc",
        name: "Ascendancy start",
        isAscendancyStart: true,
        ascendancyId: "Test1",
        x: 0,
        y: -300,
        out: ["asc1"],
      },
      asc1: { id: "asc1", name: "Ascendancy passive", ascendancyId: "Test1", x: 0, y: -600 },
    },
    classes: Array.from({ length: 7 }, (_, i) => ({
      name: `Class ${i}`,
      ascendancies:
        i === 6
          ? [{ id: "Test1", name: "Test ascendancy" }]
          : i === 0
            ? [{ id: "Test0", name: "Other ascendancy" }]
            : [],
    })),
  });
  await page.route("**/api/tree", (r) => r.fulfill({ json: contextTree }));
  await page.addInitScript(() =>
    localStorage.setItem(
      "exile-atlas-workspace-v1",
      JSON.stringify({
        state: {
          builds: [],
          filters: [],
          classIndex: 6,
          ascendancy: "Test1",
          allocations: ["a", "asc1"],
          weaponSet1Allocations: ["b"],
          weaponSet2Allocations: ["c"],
          weaponSet: 2,
        },
        version: 0,
      }),
    ),
  );
  await page.goto("/planner");
  await expect(page.getByTestId("ascendancy-points-count")).toHaveText("1");
  await page.getByRole("combobox", { name: "Ascendancy", exact: true }).click();
  await page.getByRole("option", { name: "Base tree", exact: true }).click();
  await expect(page.getByTestId("ascendancy-points-count")).toHaveText("0");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Ascendancy", exact: true })).toContainText(
    "Test ascendancy",
  );
  await expect(page.getByTestId("ascendancy-points-count")).toHaveText("1");
  await page.getByRole("combobox", { name: "Class", exact: true }).click();
  await page.getByRole("option", { name: "Class 0", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("0 / 24");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Class", exact: true })).toContainText("Class 6");
  await expect(page.getByTestId("ascendancy-points-count")).toHaveText("1");
  await expect(page.getByTestId("editing-set")).toHaveText("Editing: Weapon set II");
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("exile-atlas-workspace-v1")!).state,
  );
  expect(state.allocations).toEqual(["a", "asc1"]);
  expect(state.weaponSet1Allocations).toEqual(["b"]);
  expect(state.weaponSet2Allocations).toEqual(["c"]);
  expect(state.ascendancy).toBe("Test1");
});
test("both sets remain visible, exclusive nodes cannot overlap, and mutations undo", async ({
  page,
}) => {
  await page.route("**/api/tree", (r) => r.fulfill({ json: tree }));
  await page.addInitScript(() =>
    localStorage.setItem(
      "exile-atlas-workspace-v1",
      JSON.stringify({
        state: {
          builds: [],
          filters: [],
          classIndex: 6,
          ascendancy: "",
          allocations: ["a"],
          weaponSet1Allocations: ["b"],
          weaponSet2Allocations: [],
          weaponSet: 1,
          showBothWeaponSets: false,
        },
        version: 0,
      }),
    ),
  );
  await page.goto("/planner");
  await expect(page.locator(".tree-canvas")).toHaveAttribute("data-renderer-builds", "1");
  await expect(page.locator(".tree-legend [data-set='1']")).toBeVisible();
  await expect(page.locator(".tree-legend [data-set='2']")).toBeVisible();
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  await expect(undo).toBeDisabled();
  await page.getByRole("button", { name: "View weapon set II", exact: true }).click();
  await page.getByLabel("Search passive nodes").fill("Red branch");
  await page.getByRole("button", { name: "Select passive: Red branch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Allocate connected path", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Allocated to Weapon set I/)).toBeVisible();
  await page.getByLabel("Search passive nodes").fill("Green branch");
  await page.getByRole("button", { name: "Select passive: Green branch", exact: true }).click();
  await page.getByRole("button", { name: "Allocate connected path", exact: true }).click();
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("1 / 24");
  await page.getByRole("button", { name: "Undo last passive change", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("1 / 24");
  await expect(page.getByTestId("weapon-set-2-count")).toHaveText("0 / 24");
  await expect(undo).toBeDisabled();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByTestId("shared-points-count")).toHaveText("0 points");
  await undo.click();
  await expect(page.getByTestId("shared-points-count")).toHaveText("1 points");
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("1 / 24");
  await page.getByRole("button", { name: "View weapon set I", exact: true }).click();
  await page.getByLabel("Search passive nodes").fill("Red branch");
  await page.getByRole("button", { name: "Select passive: Red branch", exact: true }).click();
  await page.getByRole("button", { name: "Unallocate node", exact: true }).click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("0 / 24");
  await undo.click();
  await expect(page.getByTestId("weapon-set-1-count")).toHaveText("1 / 24");
});
test("legacy overlaps are visible for repair and undo preserves the original draft", async ({
  page,
}) => {
  await page.route("**/api/tree", (r) => r.fulfill({ json: tree }));
  await page.addInitScript(() =>
    localStorage.setItem(
      "exile-atlas-workspace-v1",
      JSON.stringify({
        state: {
          builds: [],
          filters: [],
          classIndex: 6,
          ascendancy: "",
          allocations: ["a"],
          weaponSet1Allocations: ["b"],
          weaponSet2Allocations: ["b", "c"],
          weaponSet: 1,
        },
        version: 0,
      }),
    ),
  );
  await page.goto("/planner");
  await expect(page.getByText(/Weapon sets share 1 exclusive node/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Export .build", exact: true })).toBeDisabled();
  await page.getByLabel("Search passive nodes").fill("Red branch");
  await page.getByRole("button", { name: "Select passive: Red branch", exact: true }).click();
  await page.getByRole("button", { name: "Unallocate node", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export .build", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText(/Weapon sets share 1 exclusive node/)).toBeVisible();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("exile-atlas-workspace-v1")!).state,
  );
  expect(state.weaponSet1Allocations).toEqual(["b"]);
  expect(state.weaponSet2Allocations).toEqual(["b", "c"]);
});

import { expect, test } from "@playwright/test";

const lifeStat = "+# to total Maximum Life";
const catalog = {
  revision: "pinned-fixture",
  source: "Community trade catalogue",
  groups: [
    {
      id: "pseudo",
      label: "Pseudo",
      entries: [{ id: "pseudo.total_life", text: lifeStat, type: "pseudo" }],
    },
    {
      id: "explicit",
      label: "Explicit",
      entries: [
        ...Array.from({ length: 120 }, (_, index) => ({
          id: `explicit.test-${index}`,
          text: `#% increased Test Damage ${index}`,
          type: "explicit",
        })),
        { id: "explicit.test-119", text: "#% increased Alternate Damage", type: "explicit" },
      ],
    },
    {
      id: "crafted",
      label: "Crafted",
      entries: [{ id: "crafted.test", text: "+# to Test Strength", type: "crafted" }],
    },
    ...["Implicit", "Fractured", "Enchant", "Augment", "Desecrated", "Sanctum", "Skill"].map(
      (label) => ({ id: label.toLowerCase(), label, entries: [] }),
    ),
  ],
};

test("stat picker limits rows and selects the real stat after category and ID search", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/data/poe2-trade-stats.json", (route) => {
    requests++;
    return route.fulfill({ json: catalog });
  });
  await page.goto("/trade");
  const trigger = page.getByRole("button", { name: "Add stat filter", exact: true }).first();
  await expect(trigger).toBeVisible({ timeout: 5000 });
  expect(requests).toBe(0);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Choose a stat filter", exact: true });
  const search = dialog.getByRole("textbox", { name: "Search stat filters", exact: true });
  await expect(search).toBeFocused();
  await expect(dialog.getByTestId("trade-stat-results")).toHaveText(
    "Showing 100 of 123 matching stats.",
  );
  await expect(dialog.getByRole("button", { name: /^Select stat:/ })).toHaveCount(100);
  await dialog.getByLabel("Stat category", { exact: true }).selectOption("pseudo");
  await expect(dialog.getByTestId("trade-stat-results")).toHaveText(
    "Showing 1 of 1 matching stats.",
  );
  await search.fill("explicit.test-117");
  await expect(dialog.getByText("No stats match your search.", { exact: true })).toBeVisible();
  await dialog.getByLabel("Stat category", { exact: true }).selectOption("all");
  await expect(
    dialog.getByRole("button", {
      name: "Select stat: #% increased Test Damage 117 (explicit)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByTestId("trade-stat-results")).toHaveText(
    "Showing 1 of 1 matching stats.",
  );
  await search.fill("explicit.test-119");
  await expect(dialog.getByRole("button", { name: /^Select stat:/ })).toHaveCount(2);
  await expect(
    dialog.getByRole("button", {
      name: "Select stat: #% increased Alternate Damage (explicit)",
      exact: true,
    }),
  ).toBeVisible();
  await search.fill("maximum LIFE");
  await dialog
    .getByRole("button", { name: `Select stat: ${lifeStat} (pseudo)`, exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole("checkbox", { name: `Enable ${lifeStat}`, exact: true }),
  ).toBeChecked();
  expect(requests).toBe(1);
});

test("stat picker retries local catalogue failures and returns focus on close", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/data/poe2-trade-stats.json", (route) => {
    requests++;
    return requests === 1
      ? route.fulfill({ status: 503, body: "Temporarily unavailable" })
      : route.fulfill({ json: catalog });
  });
  await page.goto("/trade");
  const trigger = page.getByRole("button", { name: "Add stat filter", exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Choose a stat filter", exact: true });
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Retry stat catalogue", exact: true }).click();
  await expect(dialog.getByTestId("trade-stat-results")).toHaveText(
    "Showing 100 of 123 matching stats.",
  );
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    dialog.getByRole("textbox", { name: "Search stat filters", exact: true }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Close stat selector", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(requests).toBe(2);
});

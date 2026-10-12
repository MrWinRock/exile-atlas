import { expect, test } from "@playwright/test";
test("wheel zoom does not cause passive-listener errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/genesis");
  const svg = page.getByRole("img", { name: /Currency Genesis tree/ });
  await expect(svg).toBeVisible();
  const original = await svg.getAttribute("viewBox");
  await svg.hover();
  await page.mouse.wheel(0, 120);
  await expect(svg).not.toHaveAttribute("viewBox", original!);
  expect(errors.filter((e) => e.includes("preventDefault"))).toEqual([]);
});
test("Genesis supports historical data, connected planning, budgets and saved plans", async ({
  page,
}) => {
  await page.goto("/genesis");
  await expect(page.getByRole("heading", { name: "Grow a plan worth keeping." })).toBeVisible();
  await expect(page.getByText(/Historical snapshot.*2026-07-04/)).toBeVisible();
  await page.getByLabel("Search Genesis nodes", { exact: true }).fill("Nurture Divinity");
  await page.getByRole("button", { name: /Select Nurture Divinity/ }).click();
  await expect(page.getByRole("heading", { name: "Nurture Divinity", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview allocation", exact: true }).click();
  await expect(page.getByText(/points to allocate/)).toBeVisible();
  await page.getByRole("button", { name: "Allocate path", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refund node", exact: true })).toBeVisible();
  await page.getByLabel("Genesis plan name", { exact: true }).fill("Divine growth");
  await page.getByRole("button", { name: "Save Genesis plan", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Divine growth", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Duplicate Divine growth", exact: true }).click();
  await expect(page.getByText("Divine growth (copy)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load Divine growth", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Genesis plans", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("exile-atlas-genesis.json");
  await page.getByRole("button", { name: "Reset current plan", exact: true }).click();
  await expect(page.getByText("Divine growth", { exact: true })).toBeVisible();
  await page.getByLabel("Currency planning budget", { exact: true }).fill("0");
  await page.getByLabel("Search Genesis nodes", { exact: true }).fill("Nurture Divinity");
  await page.getByRole("button", { name: /Select Nurture Divinity/ }).click();
  await page.getByRole("button", { name: "Preview allocation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Allocate path", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Breachstones", exact: true }).click();
  await expect(page.getByText(/only the Breachstone Womb/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("unresolved imported plans remain visible and cannot allocate", async ({ page }) => {
  await page.goto("/genesis");
  const file = {
    format: "exile-atlas-genesis",
    version: 1,
    plans: [
      {
        id: "import",
        name: "Old version",
        plan: { dataset: "older", allocated: ["obsolete"], budgets: {} },
        createdAt: "2026-10-12T00:00:00Z",
        updatedAt: "2026-10-12T00:00:00Z",
      },
    ],
  };
  await page.getByLabel("Import Genesis plans", { exact: true }).setInputFiles({
    name: "plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await page.getByRole("button", { name: "Load Old version", exact: true }).click();
  await expect(page.getByText(/Unknown node: obsolete/)).toBeVisible();
  await page.getByLabel("Search Genesis nodes", { exact: true }).fill("Nurture Divinity");
  await page.getByRole("button", { name: /Select Nurture Divinity/ }).click();
  await expect(
    page.getByRole("button", { name: "Preview allocation", exact: true }),
  ).toBeDisabled();
});

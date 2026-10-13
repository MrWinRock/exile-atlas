import { expect, test } from "@playwright/test";

test("Umami uses runtime configuration and remains a single script across navigation", async ({
  page,
}) => {
  // Block real analytics during regression tests; assertions exercise the app's script wiring.
  await page.route("https://analytics.nonglabs.cloud/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "/* analytics disabled in tests */",
    }),
  );
  await page.goto("/regex");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const script = page.locator('script[src="https://analytics.nonglabs.cloud/script.js"]');
  const expectedId = process.env.E2E_UMAMI_WEBSITE_ID;
  if (!expectedId) {
    await expect(script).toHaveCount(0);
    return;
  }
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute("data-website-id", expectedId);
  await expect(script).toHaveAttribute("data-exclude-search", "true");
  await expect(script).toHaveAttribute("data-exclude-hash", "true");
  const original = await script.elementHandle();
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Atlas planner", exact: true })
    .click();
  await expect(page).toHaveURL(/\/atlas$/);
  await expect(script).toHaveCount(1);
  expect(await original?.evaluate((el) => el.isConnected)).toBe(true);
});

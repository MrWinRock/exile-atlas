import { expect, test } from "@playwright/test";

test("short-height sidebar scrolls independently and mobile can close after scrolling", async ({
  page,
}) => {
  const width = test.info().project.name === "mobile" ? 390 : 1440;
  await page.setViewportSize({ width, height: 500 });
  await page.goto("/planner");
  if (width < 760) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  const sidebar = page.locator(".sidebar");
  await expect(sidebar).toBeVisible();
  const bodyScroll = await page.evaluate(() => scrollY);
  await sidebar.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await sidebar.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const settings = sidebar.getByRole("link", { name: "Settings", exact: true });
  await expect(settings).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(bodyScroll);
  if (width < 760) {
    const close = sidebar.getByRole("button", { name: "Close navigation", exact: true });
    await expect(close).toBeInViewport();
    await close.click();
    await expect(sidebar).not.toBeVisible();
  }
});

test("Genesis renders sourced artwork for all graph nodes and the selected detail", async ({
  page,
}) => {
  await page.goto("/genesis");
  const svg = page.getByRole("img", { name: /Currency Genesis tree/ });
  await expect(svg).toBeVisible();
  const nodes = svg.locator("[data-node]");
  expect(await nodes.count()).toBeGreaterThan(1);
  expect(await nodes.locator("image").count()).toBe(await nodes.count());
  const response = await page.request.get("/art/planning/genesis-icons.webp");
  expect(response.ok()).toBe(true);
  await page.getByLabel("Search Genesis nodes", { exact: true }).fill("Nurture Divinity");
  const select = page.getByRole("button", { name: /Select Nurture Divinity/ });
  await expect(select.getByRole("img")).toBeVisible();
  await select.click();
  await expect(page.getByTestId("genesis-selected-art")).toBeVisible();
});

import { expect, test } from "@playwright/test";
test("comparison file imports wait for client initialization", async ({ page }) => {
  let releaseScripts!: () => void;
  const ready = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await ready;
    await route.continue();
  });
  await page.route("**/api/tree", (route) =>
    route.fulfill({ json: { nodes: [], edges: [], classes: [] } }),
  );
  await page.goto("/compare", { waitUntil: "commit" });
  const input = page.getByLabel("Import left build", { exact: true });
  try {
    await expect(input).toBeDisabled();
  } finally {
    releaseScripts();
  }
  await expect(input).toBeEnabled();
  await input.setInputFiles({
    name: "ready.build",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ name: "Ready import" })),
  });
  await expect(page.getByLabel("Left build", { exact: true })).toHaveValue(/^import:/);
});

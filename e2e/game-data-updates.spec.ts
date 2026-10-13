import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const bundle = JSON.parse(readFileSync("public/data/poe2-game-data.json", "utf8"));
const updated = { ...bundle, bases: bundle.bases.slice(0, -1), verifiedAt: "2026-10-13" };
updated.id = createHash("sha256")
  .update(JSON.stringify({ ...updated, id: undefined, verifiedAt: undefined }))
  .digest("hex");
test("checking and staging do not activate; explicit selection survives reload and rolls back", async ({
  page,
}) => {
  await page.route("**/api/game-data/check", (r) =>
    r.fulfill({
      json: {
        installedRevision: bundle.sourceRefs[0].revision,
        upstreamRevision: "a".repeat(40),
        sources: [{ source: "PoE2DB Relics", installed: "b".repeat(40), upstream: "c".repeat(40) }],
        state: "available",
        checkedAt: "2026-10-13T00:00:00Z",
        counts: { modifiers: 9071, bases: 1440 },
      },
    }),
  );
  await page.route("**/api/game-data/stage", (r) => r.fulfill({ json: updated }));
  await page.goto("/settings");
  const panel = page.locator("section").filter({ hasText: "Game data & source updates" });
  await expect(panel.getByText("9,071 modifiers · 1,440 bases", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Check for updates", exact: true }).click();
  await expect(panel.getByText(/PoE2DB Relics.*Update available/)).toBeVisible();
  await panel.getByRole("button", { name: "Stage and validate update", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Select staged snapshot", exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("9,071 modifiers · 1,440 bases", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Select staged snapshot", exact: true }).click();
  await expect(panel.getByText("9,071 modifiers · 1,439 bases", { exact: true })).toBeVisible();
  await page.reload();
  await expect(panel.getByText("9,071 modifiers · 1,439 bases", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Roll back snapshot", exact: true }).click();
  await expect(panel.getByText("9,071 modifiers · 1,440 bases", { exact: true })).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const customRules = `# Imported rules: preserve every line
Show
    BaseType == "Exalted Orb"
    SetTextColor 13 17 23
    SetFontSize 39

Hide
    Rarity == Normal
`;

// Chromium's native color picker has no fill action. Dispatch the same events
// that committing a color in the picker sends to the real React control.
async function setColor(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("presets and category styling update the exported rules through the visual workflow", async ({
  page,
}) => {
  await page.goto("/filters");
  await expect(page.getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Strict", exact: true }).click();
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(/ItemLevel\s*>=\s*65/);

  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Exalted Orb", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Customize", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("checkbox", { name: "Show Currency", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Rare equipment", exact: true }).click();
  await setColor(page, "Text color", "#22cc99");
  await setColor(page, "Border color", "#8844ff");
  await setColor(page, "Background color", "#112233");
  await page.getByRole("slider", { name: "Label size", exact: true }).press("End");

  await page.getByRole("tab", { name: "Export", exact: true }).click();
  const source = page.getByLabel("Filter rules", { exact: true });
  await expect(source).toHaveValue(/SetTextColor 34 204 153/);
  await expect(source).toHaveValue(/SetBorderColor 136 68 255/);
  await expect(source).toHaveValue(/SetBackgroundColor 17 34 51/);
  const rareRule = (await source.inputValue())
    .split(/\n(?=(?:Show|Hide)\r?\n)/)
    .find((block) => /Rarity\s*==\s*Rare/.test(block));
  expect(rareRule).toContain("SetFontSize 45");

  await page.getByRole("tab", { name: "Simulate", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iron Greathelm", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Show hidden items", exact: true }).check();
  await page.getByRole("button", { name: "Iron Greathelm", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Customize", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("checkbox", { name: "Show Normal equipment", exact: true }),
  ).not.toBeChecked();
});

test("changing the rare label size leaves the currency label size unchanged", async ({ page }) => {
  await page.goto("/filters");
  await page.getByRole("tab", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Rare equipment", exact: true }).click();
  await page.getByRole("slider", { name: "Label size", exact: true }).press("End");
  await page.getByRole("tab", { name: "Export", exact: true }).click();

  const blocks = (await page.getByLabel("Filter rules", { exact: true }).inputValue()).split(
    /\n\s*\n/,
  );
  const currencyRule = blocks.find((block) => block.includes('Class == "Stackable Currency"'));
  const rareRule = blocks.find((block) => /Rarity\s*==\s*Rare/.test(block));
  expect(currencyRule).toContain("SetFontSize 40");
  expect(rareRule).toContain("SetFontSize 45");
});

test("saved drafts restore category settings and generated rules after a reload", async ({
  page,
}) => {
  await page.goto("/filters");
  await page.getByLabel("Filter name", { exact: true }).fill("Atlas mapping draft");
  await page.getByRole("button", { name: "Very strict", exact: true }).click();
  await page.getByRole("tab", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Rare equipment", exact: true }).click();
  await setColor(page, "Text color", "#22cc99");
  await page.getByRole("checkbox", { name: "Show Rare equipment", exact: true }).uncheck();
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  const savedSource = await page.getByLabel("Filter rules", { exact: true }).inputValue();
  expect(savedSource).toContain("Atlas mapping draft");
  expect(savedSource).toContain("SetTextColor 34 204 153");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();

  await page.reload();
  await page.getByLabel("Saved filters", { exact: true }).selectOption({
    label: "Atlas mapping draft",
  });
  await expect(page.getByLabel("Filter name", { exact: true })).toHaveValue("Atlas mapping draft");
  await page.getByRole("tab", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Rare equipment", exact: true }).click();
  await expect(page.getByLabel("Text color", { exact: true })).toHaveValue("#22cc99");
  await expect(
    page.getByRole("checkbox", { name: "Show Rare equipment", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(savedSource);
});

test("imported rules survive tab navigation until the user explicitly returns to the builder", async ({
  page,
}) => {
  await page.goto("/filters");
  await page.getByLabel("Import .filter", { exact: true }).setInputFiles({
    name: "atlas-custom.filter",
    mimeType: "text/plain",
    buffer: Buffer.from(customRules),
  });
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(customRules);
  await expect(page.getByText(/Custom rules/).first()).toBeVisible();

  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Strict", exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: "Customize", exact: true }).click();
  await expect(page.getByLabel("Text color", { exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: "Simulate", exact: true }).click();
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(customRules);

  await page
    .getByRole("button", { name: "Replace custom rules with builder", exact: true })
    .click();
  await expect(page.getByLabel("Filter rules", { exact: true })).not.toHaveValue(customRules);
  await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(
    /generated by Exile Atlas/,
  );
  await page.getByRole("tab", { name: "Customize", exact: true }).click();
  await expect(page.getByLabel("Text color", { exact: true })).toBeEnabled();
});

test("downloads the exact edited source and keeps account sync disabled for visitors", async ({
  page,
}) => {
  await page.goto("/filters");
  await page.getByLabel("Filter name", { exact: true }).fill("Download proof");
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await page.getByLabel("Filter rules", { exact: true }).fill(customRules);
  await expect(page.getByText(/Custom rules/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync to GGG", exact: true })).toBeDisabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .filter", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Download_proof.filter");
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(await readFile(path!, "utf8")).toBe(customRules);
});

test("a delayed account sync response cannot attach the previous remote filter to a new filter", async ({
  page,
}) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { connected: true, profile: { name: "Test exile" } } }),
  );
  await page.route("**/api/filters", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { filters: [] } });
      return;
    }
    await responseGate;
    await route.fulfill({
      json: {
        filter: { id: "remote-old", filter_name: "Old filter", validation: { valid: true } },
      },
    });
  });

  try {
    await page.goto("/filters");
    await page.getByLabel("Filter name", { exact: true }).fill("Old filter");
    await page.getByRole("tab", { name: "Export", exact: true }).click();
    const requestPromise = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === "/api/filters" && request.method() === "POST",
    );
    await page.getByRole("button", { name: "Sync to GGG", exact: true }).click();
    const request = await requestPromise;
    expect(request.postDataJSON()).toMatchObject({
      filter_name: "Old filter",
      filter: expect.stringContaining("# Old filter"),
    });
    await expect(page.getByRole("button", { name: "Syncing…", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "New filter", exact: true }).click();
    await expect(page.getByLabel("Filter name", { exact: true })).toHaveValue("My PoE2 filter");
    await page.getByRole("tab", { name: "Export", exact: true }).click();
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/filters" &&
        response.request().method() === "POST",
    );
    releaseResponse();
    await responsePromise;

    await expect(page.getByRole("button", { name: "Sync to GGG", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Update on GGG", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Filter name", { exact: true })).toHaveValue("My PoE2 filter");
    await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(/^# My PoE2 filter/);
  } finally {
    releaseResponse();
  }
});

test("account sync reports GGG validation failure while retaining the saved remote filter", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { connected: true, profile: { name: "Test exile" } } }),
  );
  await page.route("**/api/filters", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? { filters: [] }
          : {
              filter: {
                id: "remote-invalid",
                filter_name: "Validation draft",
                validation: { valid: false },
              },
            },
    }),
  );
  await page.goto("/filters");
  await page.getByLabel("Filter name", { exact: true }).fill("Validation draft");
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Sync to GGG", exact: true }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "GGG saved the filter but its validation failed" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Update on GGG", exact: true })).toBeEnabled();
});

test("finishing account sync preserves newer edits saved to the same draft while it was pending", async ({
  page,
}) => {
  const latestRules = customRules.replace(
    "# Imported rules: preserve every line",
    "# Draft A: changes saved while account sync was pending",
  );
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { connected: true, profile: { name: "Test exile" } } }),
  );
  await page.route("**/api/filters", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { filters: [] } });
      return;
    }
    await responseGate;
    await route.fulfill({
      json: {
        filter: { id: "remote-a", filter_name: "Draft A", validation: { valid: true } },
      },
    });
  });

  try {
    await page.goto("/filters");
    await page.getByLabel("Filter name", { exact: true }).fill("Draft A");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.getByRole("tab", { name: "Export", exact: true }).click();
    const requestPromise = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === "/api/filters" && request.method() === "POST",
    );
    await page.getByRole("button", { name: "Sync to GGG", exact: true }).click();
    const request = await requestPromise;
    expect(request.postDataJSON()).toMatchObject({
      filter_name: "Draft A",
      filter: expect.stringContaining("# Draft A"),
    });

    await page.getByLabel("Filter rules", { exact: true }).fill(latestRules);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/filters" &&
        response.request().method() === "POST",
    );
    releaseResponse();
    await responsePromise;
    await expect(page.getByRole("button", { name: "Update on GGG", exact: true })).toBeEnabled();

    await page.reload();
    await page.getByLabel("Saved filters", { exact: true }).selectOption({ label: "Draft A" });
    await page.getByRole("tab", { name: "Export", exact: true }).click();
    await expect(page.getByLabel("Filter rules", { exact: true })).toHaveValue(latestRules);
    await expect(page.getByRole("button", { name: "Update on GGG", exact: true })).toBeEnabled();
  } finally {
    releaseResponse();
  }
});

test("every filter tab fits the viewport and retains the shared draft controls", async ({
  page,
}) => {
  await page.goto("/filters");
  for (const name of ["Overview", "Customize", "Simulate", "Export"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByLabel("Filter name", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll, `${name} must fit the viewport`).toBeLessThanOrEqual(
      dimensions.width,
    );
  }
});

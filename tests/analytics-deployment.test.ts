import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
const python = process.platform === "win32" ? "python" : "python3";
const websiteId = "11111111-1111-4111-8111-111111111111";
function removeStack(stack: string) {
  const target = realpathSync(stack);
  if (
    dirname(target) !== realpathSync(tmpdir()) ||
    !basename(target).startsWith("exile-atlas-analytics-")
  )
    throw new Error("Unexpected analytics test stack path");
  rmSync(target, { recursive: true, force: true });
}
test("analytics configuration replaces only its environment key and preserves unrelated secrets", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-analytics-"));
  try {
    writeFileSync(
      join(stack, ".env"),
      '# keep this\nSECRET="unchanged value"\nUMAMI_WEBSITE_ID=old\nexport UMAMI_WEBSITE_ID=duplicate\nOTHER=keep',
    );
    const result = spawnSync(python, ["deploy/configure-analytics.py", stack], {
      encoding: "utf8",
      env: { ...process.env, UMAMI_WEBSITE_ID: websiteId },
    });
    expect(result.status).toBe(0);
    expect(readFileSync(join(stack, ".env"), "utf8")).toBe(
      `# keep this\nSECRET="unchanged value"\nOTHER=keep\nUMAMI_WEBSITE_ID=${websiteId}\n`,
    );
    if (process.platform !== "win32")
      expect(statSync(join(stack, ".env")).mode & 0o777).toBe(0o600);
  } finally {
    removeStack(stack);
  }
});
test("invalid analytics IDs cannot inject environment keys and absent configuration preserves the server", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-analytics-"));
  const original = "SECRET=untouched\nUMAMI_WEBSITE_ID=existing\n";
  try {
    writeFileSync(join(stack, ".env"), original);
    const invalid = spawnSync(python, ["deploy/configure-analytics.py", stack], {
      encoding: "utf8",
      env: { ...process.env, UMAMI_WEBSITE_ID: "invalid\nOTHER=injected" },
    });
    expect(invalid.status).toBe(1);
    expect(readFileSync(join(stack, ".env"), "utf8")).toBe(original);
    const unset = spawnSync(python, ["deploy/configure-analytics.py", stack], {
      encoding: "utf8",
      env: { ...process.env, UMAMI_WEBSITE_ID: "" },
    });
    expect(unset.status).toBe(0);
    expect(readFileSync(join(stack, ".env"), "utf8")).toBe(original);
  } finally {
    removeStack(stack);
  }
});

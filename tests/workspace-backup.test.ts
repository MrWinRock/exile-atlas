import { expect, test } from "bun:test";
import { createWorkspaceBackup, restoreWorkspaceBackup } from "../src/lib/workspace-backup";

test("backup restores supported data and rejects invalid data without changing storage", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  data.set("exile-atlas-atlas-draft-v1", JSON.stringify({ version: 1, plan: null }));
  const backup = createWorkspaceBackup(storage);
  data.delete("exile-atlas-atlas-draft-v1");
  restoreWorkspaceBackup(backup, storage);
  expect(JSON.parse(data.get("exile-atlas-atlas-draft-v1")!)).toEqual({ version: 1, plan: null });
  expect(() =>
    restoreWorkspaceBackup(
      '{"format":"exile-atlas-workspace","version":1,"entries":{"exile-atlas-atlas-draft-v1":"{}"}}',
      storage,
    ),
  ).toThrow();
  expect(JSON.parse(data.get("exile-atlas-atlas-draft-v1")!)).toEqual({ version: 1, plan: null });
});

test("a write failure rolls back earlier restored entries", () => {
  const oldDraft = JSON.stringify({ version: 1, plan: null });
  const data = new Map([
    ["exile-atlas-atlas-draft-v1", oldDraft],
    ["exile-atlas:shortcuts", '["/regex"]'],
  ]);
  let fail = false;
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fail && key === "exile-atlas-atlas-draft-v1") {
        fail = false;
        throw new Error("quota");
      }
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  const backup = JSON.stringify({
    format: "exile-atlas-workspace",
    version: 1,
    entries: { "exile-atlas:shortcuts": '["/trade"]', "exile-atlas-atlas-draft-v1": oldDraft },
  });
  fail = true;
  expect(() => restoreWorkspaceBackup(backup, storage)).toThrow();
  expect(data.get("exile-atlas:shortcuts")).toBe('["/regex"]');
});

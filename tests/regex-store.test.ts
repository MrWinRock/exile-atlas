import { expect, test } from "bun:test";
import { createRegexDraft } from "../src/lib/regex-schema";
import { recoverableRegexStorage, useRegexWorkspace } from "../src/lib/regex-store";
test("preset actions preserve identity and current drafts independently", () => {
  const s = useRegexWorkspace.getState();
  s.clearAll();
  s.setDraft({ ...createRegexDraft("vendor"), text: "boots" });
  const saved = s.savePreset(" My boots ", "vendor");
  expect(saved.ok).toBe(true);
  const original = useRegexWorkspace.getState().presets[0];
  expect(original.name).toBe("My boots");
  s.savePreset("Updated", "vendor", original.id);
  expect(useRegexWorkspace.getState().presets[0].createdAt).toBe(original.createdAt);
  s.duplicatePreset(original.id);
  expect(new Set(useRegexWorkspace.getState().presets.map((p) => p.id)).size).toBe(2);
  s.loadPreset(original.id);
  expect(useRegexWorkspace.getState().drafts.vendor.text).toBe("boots");
  s.toggleFavorite(original.id);
  expect(useRegexWorkspace.getState().presets.find((p) => p.id === original.id)?.favorite).toBe(
    true,
  );
  expect(s.importPresets("invalid").ok).toBe(false);
  expect(useRegexWorkspace.getState().presets).toHaveLength(2);
  expect(s.savePreset("", "vendor").ok).toBe(false);
  s.clearAll();
  expect(useRegexWorkspace.getState().presets).toHaveLength(0);
});
test("throwing storage reports failures without losing memory or throwing", () => {
  const reports: string[] = [];
  const storage = recoverableRegexStorage(
    {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    },
    (m) => reports.push(m),
  );
  expect(storage.getItem("draft")).toBeNull();
  expect(() => storage.setItem("draft", "data")).not.toThrow();
  expect(reports).toHaveLength(1);
  const writable = recoverableRegexStorage(
    {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    },
    (m) => reports.push(m),
  );
  expect(() => writable.setItem("draft", "data")).not.toThrow();
  expect(reports).toHaveLength(2);
});
test("a failed storage read never overwrites the existing saved library", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window"),
    writes: string[] = [];
  const original = JSON.stringify({
    state: {
      presets: [
        {
          id: "kept",
          name: "Keep me",
          draft: createRegexDraft("equipment"),
          favorite: false,
          createdAt: "2026-10-12T00:00:00Z",
          updatedAt: "2026-10-12T00:00:00Z",
        },
      ],
    },
    version: 0,
  });
  let stored = original;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => {
          throw new Error("temporarily unreadable");
        },
        setItem: (_key: string, value: string) => {
          writes.push(value);
          stored = value;
        },
        removeItem: () => {},
      },
    },
  });
  try {
    await useRegexWorkspace.persist.rehydrate();
    await Promise.resolve();
    useRegexWorkspace
      .getState()
      .setDraft({ ...createRegexDraft("vendor"), text: "unsaved local change" });
    expect(stored).toBe(original);
    expect(writes).toHaveLength(0);
    expect(useRegexWorkspace.getState().drafts.vendor.text).toBe("unsaved local change");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

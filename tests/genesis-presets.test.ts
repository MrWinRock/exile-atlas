import { expect, test } from "bun:test";
import { parseGenesisImport, exportGenesisPlans } from "../src/lib/genesis-presets";
import { useGenesisWorkspace } from "../src/lib/genesis-store";
test("Genesis portability preserves unknown IDs and dataset identity with new plan IDs", () => {
  const p = {
    id: "original",
    name: "Currency",
    plan: { dataset: "historic", allocated: ["unknown-node"], budgets: { Currency: 0 } },
    createdAt: "2026-10-12T00:00:00Z",
    updatedAt: "2026-10-12T00:00:00Z",
  };
  const text = exportGenesisPlans([p]);
  const imported = parseGenesisImport(text, 0);
  expect(imported[0].id).not.toBe(p.id);
  expect(imported[0].plan).toEqual(p.plan);
  expect(() => parseGenesisImport(text, 100)).toThrow();
  expect(() => parseGenesisImport("x".repeat(1048577), 0)).toThrow();
  expect(() => parseGenesisImport(text.replace('"version": 1', '"version": 2'), 0)).toThrow();
});
test("current reset preserves saved plans and rejected imports leave the library intact", () => {
  const s = useGenesisWorkspace.getState();
  s.clearAll();
  s.setPlan({ dataset: "test", allocated: ["a"], budgets: { Currency: 2 } });
  expect(s.savePlan("My plan").ok).toBe(true);
  const original = useGenesisWorkspace.getState().plans[0];
  expect(s.duplicatePlan(original.id).ok).toBe(true);
  expect(new Set(useGenesisWorkspace.getState().plans.map((p) => p.id)).size).toBe(2);
  expect(s.importPlans("bad").ok).toBe(false);
  expect(useGenesisWorkspace.getState().plans).toHaveLength(2);
  s.loadPlan(original.id);
  expect(useGenesisWorkspace.getState().current?.allocated).toEqual(["a"]);
  s.resetCurrent({ identity: "other" });
  expect(useGenesisWorkspace.getState().current?.allocated).toEqual([]);
  expect(useGenesisWorkspace.getState().plans).toHaveLength(2);
  s.clearAll();
});
test("a failed Genesis storage read never writes empty state over existing plans", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window"),
    writes: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => {
          throw new Error("read denied");
        },
        setItem: (_key: string, value: string) => writes.push(value),
        removeItem: () => {},
      },
    },
  });
  try {
    await useGenesisWorkspace.persist.rehydrate();
    await Promise.resolve();
    useGenesisWorkspace
      .getState()
      .setPlan({ dataset: "memory", allocated: ["retained"], budgets: {} });
    expect(writes).toHaveLength(0);
    expect(useGenesisWorkspace.getState().current?.allocated).toEqual(["retained"]);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

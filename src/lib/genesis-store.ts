"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GenesisPlan } from "./genesis-plan";
import {
  genesisPlanSchema,
  savedGenesisSchema,
  parseGenesisImport,
  type SavedGenesisPlan,
} from "./genesis-presets";
type Result = { ok: boolean; error?: string; id?: string };
type GenesisWorkspace = {
  current: GenesisPlan | null;
  plans: SavedGenesisPlan[];
  warning: string;
  setPlan: (plan: GenesisPlan) => void;
  savePlan: (name: string, id?: string) => Result;
  loadPlan: (id: string) => void;
  renamePlan: (id: string, name: string) => Result;
  duplicatePlan: (id: string) => Result;
  deletePlan: (id: string) => void;
  importPlans: (text: string) => Result;
  resetCurrent: (data: { identity: string }) => void;
  clearAll: () => void;
};
const report = (message: string) =>
  queueMicrotask(() => {
    if (useGenesisWorkspace.getState().warning !== message)
      useGenesisWorkspace.setState({ warning: message });
  });
const storage = createJSONStorage(() => ({
  getItem: (key: string) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    } catch {
      report("Genesis storage could not be read. Keep an exported backup.");
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      report("Genesis storage could not be saved. Export plans before closing.");
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      report("Genesis storage could not be cleared.");
    }
  },
}));
export const useGenesisWorkspace = create<GenesisWorkspace>()(
  persist(
    (set, get) => {
      const attempt = (action: () => string | void): Result => {
        try {
          return { ok: true, id: action() || undefined };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "Could not update Genesis plans.",
          };
        }
      };
      const name = (value: string) => {
        const n = value.trim();
        if (!n || n.length > 120) throw new Error("Use a plan name of 1 to 120 characters.");
        return n;
      };
      const find = (id: string) => {
        const p = get().plans.find((p) => p.id === id);
        if (!p) throw new Error("Plan is no longer available.");
        return p;
      };
      return {
        current: null,
        plans: [],
        warning: "",
        setPlan: (current) => set({ current }),
        savePlan: (value, id) =>
          attempt(() => {
            const title = name(value),
              current = genesisPlanSchema.parse(get().current),
              old = id ? find(id) : undefined;
            if (!old && get().plans.length >= 100)
              throw new Error("The library can hold at most 100 Genesis plans.");
            const now = new Date().toISOString(),
              p = {
                id: old?.id ?? crypto.randomUUID(),
                name: title,
                plan: structuredClone(current),
                createdAt: old?.createdAt ?? now,
                updatedAt: now,
              };
            set((s) => ({ plans: [p, ...s.plans.filter((e) => e.id !== p.id)] }));
            return p.id;
          }),
        loadPlan: (id) => {
          const p = get().plans.find((p) => p.id === id);
          if (p) set({ current: structuredClone(p.plan) });
        },
        renamePlan: (id, value) =>
          attempt(() => {
            const title = name(value);
            find(id);
            set((s) => ({
              plans: s.plans.map((p) =>
                p.id === id ? { ...p, name: title, updatedAt: new Date().toISOString() } : p,
              ),
            }));
          }),
        duplicatePlan: (id) =>
          attempt(() => {
            const p = find(id);
            if (get().plans.length >= 100)
              throw new Error("The library can hold at most 100 Genesis plans.");
            const now = new Date().toISOString(),
              copy = {
                ...structuredClone(p),
                id: crypto.randomUUID(),
                name: p.name.slice(0, 113) + " (copy)",
                createdAt: now,
                updatedAt: now,
              };
            set((s) => ({ plans: [copy, ...s.plans] }));
            return copy.id;
          }),
        deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
        importPlans: (text) =>
          attempt(() => {
            const imported = parseGenesisImport(text, get().plans.length);
            set((s) => ({ plans: [...s.plans, ...imported] }));
          }),
        resetCurrent: (data) =>
          set({ current: { dataset: data.identity, allocated: [], budgets: {} } }),
        clearAll: () => set({ current: null, plans: [], warning: "" }),
      };
    },
    {
      name: "exile-atlas-genesis-v1",
      skipHydration: true,
      storage,
      partialize: (s) => ({ current: s.current, plans: s.plans }),
      merge: (raw, current) => {
        if (!raw || typeof raw !== "object") return current;
        const value = raw as { current?: unknown; plans?: unknown },
          plan = genesisPlanSchema.safeParse(value.current),
          plans: SavedGenesisPlan[] = [],
          ids = new Set<string>();
        let warning = "";
        if (value.current !== null && value.current !== undefined && !plan.success)
          warning = "An invalid current Genesis plan was reset.";
        if (Array.isArray(value.plans))
          for (const entry of value.plans) {
            const p = savedGenesisSchema.safeParse(entry);
            if (p.success && plans.length < 100 && !ids.has(p.data.id)) {
              plans.push(p.data);
              ids.add(p.data.id);
            } else warning = "Invalid or duplicate stored Genesis records were ignored.";
          }
        return { ...current, current: plan.success ? plan.data : null, plans, warning };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error)
          report(
            "Saved Genesis data could not be loaded. Export available plans before resetting.",
          );
      },
    },
  ),
);

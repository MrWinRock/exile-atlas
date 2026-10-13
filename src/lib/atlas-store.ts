"use client";
import { create } from "zustand";
import { z } from "zod";
import { atlasPlanSchema, type AtlasPlan } from "./atlas-plan";
import { createLocalLibrary, localLibraryStorage, type LibraryStorage } from "./local-library";
import { recoverableBrowserStorage } from "./browser-storage";

export const savedAtlasSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    plan: atlasPlanSchema,
  })
  .strict();
export const createAtlasLibrary = (storage?: LibraryStorage) =>
  createLocalLibrary("exile-atlas-atlas-plans-v1", "exile-atlas-atlas", savedAtlasSchema, storage);
export const useAtlasPlans = createAtlasLibrary();
export function createAtlasDraft(storage: LibraryStorage = localLibraryStorage) {
  const envelope = z.object({ version: z.literal(1), plan: atlasPlanSchema.nullable() }).strict(),
    key = "exile-atlas-atlas-draft-v1";
  return create<{
    current: AtlasPlan | null;
    loaded: boolean;
    warning: string;
    load: () => void;
    setPlan: (plan: AtlasPlan) => void;
    clear: () => void;
  }>((set, get) => {
    const safe = recoverableBrowserStorage(storage, (warning) => set({ warning }));
    return {
      current: null,
      loaded: false,
      warning: "",
      load: () => {
        if (get().loaded) return;
        try {
          const text = safe.getItem(key);
          if (typeof text === "string") {
            if (new TextEncoder().encode(text).length > 1048576)
              throw new Error("Draft exceeds 1 MiB.");
            set({ current: envelope.parse(JSON.parse(text)).plan });
          }
        } catch {
          safe.suspend();
          set({
            warning:
              "Unreadable Atlas draft preserved. Export available plans before clearing browser storage.",
          });
        }
        set({ loaded: true });
      },
      setPlan: (value) => {
        if (!get().loaded) get().load();
        const plan = atlasPlanSchema.parse(value),
          text = JSON.stringify(envelope.parse({ version: 1, plan }));
        if (new TextEncoder().encode(text).length > 1048576)
          throw new Error("Draft exceeds 1 MiB.");
        set({ current: structuredClone(plan) });
        safe.setItem(key, text);
      },
      clear: () => {
        safe.removeItem(key);
        set({ current: null, warning: safe.suspended() ? get().warning : "" });
      },
    };
  });
}
export const useAtlasDraft = createAtlasDraft();

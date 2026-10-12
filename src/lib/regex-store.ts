"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { recoverableBrowserStorage } from "./browser-storage";
import { REGEX_CATEGORIES } from "./regex-catalogue";
import {
  createRegexDraft,
  type RegexCategory,
  type RegexDraft,
  type RegexPreset,
} from "./regex-schema";
import { decodeRegexState, parseRegexPresetImport } from "./regex-presets";
import { validateRegexDraft } from "./regex-search";
type Result = { ok: boolean; error?: string; id?: string };
type RegexWorkspace = {
  drafts: Record<RegexCategory, RegexDraft>;
  presets: RegexPreset[];
  activeTab: RegexCategory | "presets";
  warning: string;
  setDraft: (draft: RegexDraft) => void;
  setActiveTab: (tab: RegexCategory | "presets") => void;
  savePreset: (name: string, category: RegexCategory, id?: string) => Result;
  loadPreset: (id: string) => void;
  renamePreset: (id: string, name: string) => Result;
  duplicatePreset: (id: string) => Result;
  toggleFavorite: (id: string) => void;
  deletePreset: (id: string) => void;
  importPresets: (text: string) => Result;
  clearAll: () => void;
};
const freshDrafts = () =>
  Object.fromEntries(REGEX_CATEGORIES.map((c) => [c.id, createRegexDraft(c.id)])) as Record<
    RegexCategory,
    RegexDraft
  >;
export { recoverableBrowserStorage as recoverableRegexStorage } from "./browser-storage";
let warningOnly = false;
const reportStorage = (message: string) =>
  queueMicrotask(() => {
    if (useRegexWorkspace.getState().warning !== message) {
      warningOnly = true;
      try {
        useRegexWorkspace.setState({ warning: message });
      } finally {
        warningOnly = false;
      }
    }
  });
const safeStorage = recoverableBrowserStorage(
  {
    getItem: (k) => (typeof window === "undefined" ? null : window.localStorage.getItem(k)),
    setItem: (k, v) => {
      if (!warningOnly && typeof window !== "undefined") window.localStorage.setItem(k, v);
    },
    removeItem: (k) => {
      if (typeof window !== "undefined") window.localStorage.removeItem(k);
    },
  },
  reportStorage,
);
const storage = createJSONStorage(() => safeStorage);
export const useRegexWorkspace = create<RegexWorkspace>()(
  persist(
    (set, get) => {
      const attempt = (action: () => string | void): Result => {
        try {
          return { ok: true, id: action() || undefined };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : "Could not update presets." };
        }
      };
      const cleanName = (name: string) => {
        const value = name.trim();
        if (!value || value.length > 120)
          throw new Error("Use a preset name of 1 to 120 characters.");
        return value;
      };
      const requirePreset = (id: string) => {
        const p = get().presets.find((p) => p.id === id);
        if (!p) throw new Error("This preset is no longer available.");
        return p;
      };
      return {
        drafts: freshDrafts(),
        presets: [],
        activeTab: "waystone",
        warning: "",
        setDraft: (draft) => set((s) => ({ drafts: { ...s.drafts, [draft.category]: draft } })),
        setActiveTab: (activeTab) => set({ activeTab }),
        savePreset: (name, category, id) =>
          attempt(() => {
            const title = cleanName(name),
              draft = structuredClone(get().drafts[category]);
            const errors = validateRegexDraft(draft, true);
            if (errors.length) throw new Error(errors.join(" "));
            const existing = id ? requirePreset(id) : undefined;
            if (!existing && get().presets.length >= 100)
              throw new Error("The library can hold at most 100 presets.");
            const now = new Date().toISOString();
            const p: RegexPreset = {
              id: existing?.id ?? crypto.randomUUID(),
              name: title,
              draft,
              favorite: existing?.favorite ?? false,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            };
            set((s) => ({ presets: [p, ...s.presets.filter((e) => e.id !== p.id)] }));
            return p.id;
          }),
        loadPreset: (id) => {
          const p = get().presets.find((p) => p.id === id);
          if (p)
            set((s) => ({
              activeTab: p.draft.category,
              drafts: { ...s.drafts, [p.draft.category]: structuredClone(p.draft) },
            }));
        },
        renamePreset: (id, name) =>
          attempt(() => {
            const title = cleanName(name);
            requirePreset(id);
            set((s) => ({
              presets: s.presets.map((p) =>
                p.id === id ? { ...p, name: title, updatedAt: new Date().toISOString() } : p,
              ),
            }));
          }),
        duplicatePreset: (id) =>
          attempt(() => {
            const p = requirePreset(id);
            if (get().presets.length >= 100)
              throw new Error("The library can hold at most 100 presets.");
            const now = new Date().toISOString(),
              copy = {
                ...structuredClone(p),
                id: crypto.randomUUID(),
                name: p.name.slice(0, 113) + " (copy)",
                createdAt: now,
                updatedAt: now,
              };
            set((s) => ({ presets: [copy, ...s.presets] }));
            return copy.id;
          }),
        toggleFavorite: (id) =>
          set((s) => ({
            presets: s.presets.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
          })),
        deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
        importPresets: (text) =>
          attempt(() => {
            const imported = parseRegexPresetImport(text, get().presets.length);
            set((s) => ({ presets: [...s.presets, ...imported] }));
          }),
        clearAll: () => {
          useRegexWorkspace.persist.clearStorage();
          set({ drafts: freshDrafts(), presets: [], activeTab: "waystone", warning: "" });
        },
      };
    },
    {
      name: "exile-atlas-regex-v1",
      storage,
      skipHydration: true,
      partialize: (s) => ({ drafts: s.drafts, presets: s.presets, activeTab: s.activeTab }),
      merge: (raw, current) => {
        if (safeStorage.suspended()) return current;
        const decoded = decodeRegexState(raw);
        return {
          ...current,
          drafts: { ...freshDrafts(), ...decoded.drafts },
          presets: decoded.presets,
          activeTab: decoded.activeTab,
          warning: [...new Set(decoded.warnings)].join(" "),
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          safeStorage.suspend();
          reportStorage(
            "Saved search data could not be loaded. Export any available presets before resetting.",
          );
        }
      },
    },
  ),
);

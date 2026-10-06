"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createTradeDraft, type TradeDraft } from "./trade-search";

const range = z.object({ min: z.string().max(40), max: z.string().max(40) });
const draftSchema = z.object({
  league: z.string().max(200),
  name: z.string().max(200),
  type: z.string().max(200),
  status: z.string().max(40),
  fields: z.record(z.string().max(120), z.union([z.string().max(300), range])),
  statGroups: z
    .array(
      z.object({
        id: z.string().max(100),
        type: z.enum(["and", "or", "not", "count", "weight", "if"]),
        min: z.string().max(40),
        max: z.string().max(40),
        disabled: z.boolean(),
        filters: z
          .array(
            z.object({
              id: z.string().max(200),
              label: z.string().max(1500),
              min: z.string().max(40),
              max: z.string().max(40),
              disabled: z.boolean(),
              weight: z.string().max(40).optional(),
            }),
          )
          .max(100),
      }),
    )
    .max(10),
});
const savedSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(120),
  updatedAt: z.string().max(50),
  draft: draftSchema,
});
export type SavedTradeSearch = z.infer<typeof savedSchema>;
type TradeWorkspace = {
  draft: TradeDraft;
  searches: SavedTradeSearch[];
  setDraft: (draft: TradeDraft) => void;
  saveSearch: (name: string) => void;
  deleteSearch: (id: string) => void;
  clearSearches: () => void;
};

export const useTradeWorkspace = create<TradeWorkspace>()(
  persist(
    (set, get) => ({
      draft: createTradeDraft(),
      searches: [],
      setDraft: (draft) => set({ draft }),
      saveSearch: (name) => {
        const cleanName = name.trim().slice(0, 120);
        if (!cleanName) return;
        const search: SavedTradeSearch = {
          id: crypto.randomUUID(),
          name: cleanName,
          updatedAt: new Date().toISOString(),
          draft: structuredClone(get().draft),
        };
        set((state) => ({ searches: [search, ...state.searches].slice(0, 100) }));
      },
      deleteSearch: (id) =>
        set((state) => ({ searches: state.searches.filter((search) => search.id !== id) })),
      clearSearches: () => set({ draft: createTradeDraft(), searches: [] }),
    }),
    {
      name: "exile-atlas-trade-v1",
      skipHydration: true,
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const data = persisted as { draft?: unknown; searches?: unknown };
        const draft = draftSchema.safeParse(data.draft);
        const searches = z.array(savedSchema).max(100).safeParse(data.searches);
        return {
          ...current,
          draft: draft.success ? draft.data : current.draft,
          searches: searches.success ? searches.data : [],
        };
      },
    },
  ),
);

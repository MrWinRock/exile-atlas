"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Build, SavedBuild } from "./build";
import type { FilterSettings } from "./filter";
import type { AllocationMode, PassivePlan } from "./passive-plan";
type FilterDraft = {
  id: string;
  name: string;
  text: string;
  settings: FilterSettings;
  updatedAt: string;
  remoteId?: string;
};
type WorkspaceStore = {
  builds: SavedBuild[];
  filters: FilterDraft[];
  allocations: string[];
  weaponSet1Allocations: string[];
  weaponSet2Allocations: string[];
  weaponSet: AllocationMode;
  ascendancy: string;
  classIndex: number;
  saveBuild: (build: Build, id?: string) => string;
  deleteBuild: (id: string) => void;
  saveFilter: (draft: Omit<FilterDraft, "id" | "updatedAt">, id?: string) => string;
  deleteFilter: (id: string) => void;
  setAllocations: (ids: string[]) => void;
  setPassivePlan: (plan: PassivePlan) => void;
  setWeaponSet: (mode: AllocationMode) => void;
  setAscendancy: (id: string) => void;
  setClassIndex: (index: number) => void;
  clearDrafts: () => void;
};
export const useWorkspace = create<WorkspaceStore>()(
  persist(
    (set) => ({
      builds: [],
      filters: [],
      allocations: [],
      weaponSet1Allocations: [],
      weaponSet2Allocations: [],
      weaponSet: 0,
      ascendancy: "",
      classIndex: 6,
      saveBuild: (build, id) => {
        const key = id ?? crypto.randomUUID();
        set((state) => ({
          builds: [
            { id: key, build, updatedAt: new Date().toISOString() },
            ...state.builds.filter((b) => b.id !== key),
          ],
        }));
        return key;
      },
      deleteBuild: (id) => set((state) => ({ builds: state.builds.filter((b) => b.id !== id) })),
      saveFilter: (draft, id) => {
        const key = id ?? crypto.randomUUID();
        set((state) => ({
          filters: [
            { ...draft, id: key, updatedAt: new Date().toISOString() },
            ...state.filters.filter((f) => f.id !== key),
          ],
        }));
        return key;
      },
      deleteFilter: (id) => set((state) => ({ filters: state.filters.filter((f) => f.id !== id) })),
      setAllocations: (allocations) => set({ allocations }),
      setPassivePlan: (plan) =>
        set({
          allocations: plan.shared,
          weaponSet1Allocations: plan.weapon1,
          weaponSet2Allocations: plan.weapon2,
        }),
      setWeaponSet: (weaponSet) => set({ weaponSet }),
      setAscendancy: (ascendancy) => set({ ascendancy }),
      setClassIndex: (classIndex) =>
        set({
          classIndex,
          allocations: [],
          weaponSet1Allocations: [],
          weaponSet2Allocations: [],
          ascendancy: "",
          weaponSet: 0,
        }),
      clearDrafts: () =>
        set({
          builds: [],
          filters: [],
          allocations: [],
          weaponSet1Allocations: [],
          weaponSet2Allocations: [],
          ascendancy: "",
          weaponSet: 0,
        }),
    }),
    { name: "exile-atlas-workspace-v1", skipHydration: true },
  ),
);

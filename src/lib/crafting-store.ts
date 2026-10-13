"use client";
import { createLocalLibrary, type LibraryStorage } from "./local-library";
import { craftRecipeSchema } from "./crafting-schema";
export const createCraftingStore = (storage?: LibraryStorage) =>
  createLocalLibrary("exile-atlas-crafting-v1", "exile-atlas-crafting", craftRecipeSchema, storage);
export const useCraftingRecipes = createCraftingStore();

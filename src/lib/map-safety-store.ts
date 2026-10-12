"use client";
import { createLocalLibrary, type LibraryStorage } from "./local-library";
import { safetyProfileSchema } from "./map-safety-schema";
export const createSafetyStore = (storage?: LibraryStorage) =>
  createLocalLibrary(
    "exile-atlas-map-safety-v1",
    "exile-atlas-map-safety",
    safetyProfileSchema,
    storage,
  );
export const useSafetyProfiles = createSafetyStore();

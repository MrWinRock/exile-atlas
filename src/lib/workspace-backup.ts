import { z } from "zod";
import { buildSchema } from "./build";
import { filterSettingsSchema } from "./filter";
import { regexDraftSchema, regexPresetSchema } from "./regex-schema";
import { genesisPlanSchema, savedGenesisSchema } from "./genesis-presets";
import { atlasPlanSchema } from "./atlas-plan";
import { savedAtlasSchema } from "./atlas-store";
import { craftRecipeSchema } from "./crafting-schema";
import { safetyProfileSchema } from "./map-safety-schema";
import { tradeDraftSchema, savedTradeSchema } from "./trade-store";
import type { LibraryStorage } from "./local-library";

const persisted = (state: z.ZodType) => z.object({ state, version: z.number().int().optional() });
const library = (format: string, record: z.ZodType) =>
  z.object({ format: z.literal(format), version: z.literal(1), records: z.array(record).max(100) });
const schemas: Record<string, z.ZodType> = {
  "exile-atlas:currency-favorites": z.array(z.string().max(500)).max(1000),
  "exile-atlas:shortcuts": z.array(z.string().max(100)).max(30),
  "exile-atlas:currency-pairs": z
    .array(
      z.object({
        buyId: z.string().max(500),
        sellId: z.string().max(500),
        league: z.string().max(200),
      }),
    )
    .max(30),
  "exile-atlas-workspace-v1": persisted(
    z.object({
      builds: z
        .array(z.object({ id: z.string(), updatedAt: z.string(), build: buildSchema }))
        .max(1000),
      filters: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            text: z.string(),
            settings: filterSettingsSchema,
            updatedAt: z.string(),
            remoteId: z.string().optional(),
          }),
        )
        .max(1000),
      allocations: z.array(z.string()),
      weaponSet1Allocations: z.array(z.string()),
      weaponSet2Allocations: z.array(z.string()),
      weaponSet: z.number(),
      showBothWeaponSets: z.boolean(),
      ascendancy: z.string(),
      classIndex: z.number(),
    }),
  ),
  "exile-atlas-trade-v1": persisted(
    z.object({ draft: tradeDraftSchema, searches: z.array(savedTradeSchema).max(100) }),
  ),
  "exile-atlas-regex-v1": persisted(
    z.object({
      drafts: z.record(z.string(), regexDraftSchema),
      presets: z.array(regexPresetSchema).max(100),
      activeTab: z.enum(["waystone", "tablet", "relic", "vendor", "equipment", "presets"]),
    }),
  ),
  "exile-atlas-genesis-v1": persisted(
    z.object({
      current: genesisPlanSchema.nullable(),
      plans: z.array(savedGenesisSchema).max(100),
    }),
  ),
  "exile-atlas-atlas-draft-v1": z.object({
    version: z.literal(1),
    plan: atlasPlanSchema.nullable(),
  }),
  "exile-atlas-atlas-plans-v1": library("exile-atlas-atlas", savedAtlasSchema),
  "exile-atlas-crafting-v1": library("exile-atlas-crafting", craftRecipeSchema),
  "exile-atlas-map-safety-v1": library("exile-atlas-map-safety", safetyProfileSchema),
};
const envelope = z
  .object({
    format: z.literal("exile-atlas-workspace"),
    version: z.literal(1),
    entries: z.record(z.string(), z.string()),
  })
  .strict();
function validate(text: string) {
  if (new TextEncoder().encode(text).length > 10 * 1048576)
    throw new Error("Backup exceeds 10 MiB.");
  let backup: z.infer<typeof envelope>;
  try {
    backup = envelope.parse(JSON.parse(text));
  } catch {
    throw new Error("Choose a valid Exile Atlas workspace backup file.");
  }
  for (const [key, value] of Object.entries(backup.entries)) {
    if (!Object.hasOwn(schemas, key)) throw new Error(`Unsupported backup data: ${key}`);
    try {
      if (!schemas[key].safeParse(JSON.parse(value)).success) throw new Error();
    } catch {
      throw new Error(`Invalid backup data: ${key}`);
    }
  }
  return backup;
}
export function createWorkspaceBackup(storage: LibraryStorage) {
  const entries: Record<string, string> = {};
  for (const key of Object.keys(schemas)) {
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  const text = JSON.stringify({ format: "exile-atlas-workspace", version: 1, entries }, null, 2);
  validate(text);
  return text;
}
export function restoreWorkspaceBackup(text: string, storage: LibraryStorage) {
  const backup = validate(text);
  const previous = new Map(Object.keys(backup.entries).map((key) => [key, storage.getItem(key)]));
  const written: string[] = [];
  try {
    for (const [key, value] of Object.entries(backup.entries)) {
      storage.setItem(key, value);
      written.push(key);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of written.reverse()) {
      const value = previous.get(key) ?? null;
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        rollbackFailed = true;
      }
    }
    if (rollbackFailed)
      throw new Error(
        "Restore failed and browser storage could not be fully rolled back. Keep your backup file and check your workspace.",
      );
    throw error;
  }
}

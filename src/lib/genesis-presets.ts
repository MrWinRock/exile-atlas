import { z } from "zod";
import { genesisBranchSchema } from "./genesis-data";
export const genesisPlanSchema = z
  .object({
    dataset: z.string().min(1).max(200),
    allocated: z.array(z.string().min(1).max(200)).max(5000),
    budgets: z.partialRecord(genesisBranchSchema, z.number().int().min(0).max(5000)),
  })
  .strict()
  .refine((p) => new Set(p.allocated).size === p.allocated.length, "Duplicate node IDs");
export const savedGenesisSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    plan: genesisPlanSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type SavedGenesisPlan = z.infer<typeof savedGenesisSchema>;
const envelope = z
  .object({
    format: z.literal("exile-atlas-genesis"),
    version: z.literal(1),
    plans: z.array(savedGenesisSchema).max(100),
  })
  .strict();
export function parseGenesisImport(text: string, currentCount: number): SavedGenesisPlan[] {
  if (new TextEncoder().encode(text).length > 1048576)
    throw new Error("Genesis imports must be at most 1 MiB.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid Genesis JSON file.");
  }
  const parsed = envelope.safeParse(raw);
  if (!parsed.success)
    throw new Error("Invalid Genesis file: check its format, version, names, dates and budgets.");
  if (parsed.data.plans.length + currentCount > 100)
    throw new Error("The library can hold at most 100 Genesis plans.");
  return parsed.data.plans.map((p) => ({ ...p, id: crypto.randomUUID() }));
}
export function exportGenesisPlans(plans: SavedGenesisPlan[]): string {
  return (
    JSON.stringify(envelope.parse({ format: "exile-atlas-genesis", version: 1, plans }), null, 2) +
    "\n"
  );
}

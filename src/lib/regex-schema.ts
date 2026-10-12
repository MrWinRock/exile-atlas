import { z } from "zod";

export const categorySchema = z.enum(["waystone", "tablet", "relic", "vendor", "equipment"]);
export type RegexCategory = z.infer<typeof categorySchema>;
const numericText = z.string().max(16);
export const regexRangeSchema = z.object({ min: numericText, max: numericText }).strict();
export type RegexRange = z.infer<typeof regexRangeSchema>;
export const modifierSelectionSchema = regexRangeSchema.extend({ id: z.string().min(1).max(160) });
export type ModifierSelection = z.infer<typeof modifierSelectionSchema>;
export const regexDraftSchema = z.object({
  category: categorySchema,
  match: z.enum(["any", "all"]),
  wanted: z.array(modifierSelectionSchema).max(100),
  unwanted: z.array(modifierSelectionSchema).max(100),
  properties: z.record(z.string().min(1).max(100), z.union([z.string().max(500), regexRangeSchema])),
  text: z.string().max(1000),
}).strict().refine(d => Object.keys(d.properties).length <= 30, "Too many property conditions");
export type RegexDraft = z.infer<typeof regexDraftSchema>;
export const regexPresetSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().trim().min(1).max(120),
  draft: regexDraftSchema, favorite: z.boolean(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
export type RegexPreset = z.infer<typeof regexPresetSchema>;
export function createRegexDraft(category: RegexCategory): RegexDraft {
  return { category, match: "any", wanted: [], unwanted: [], properties: {}, text: "" };
}

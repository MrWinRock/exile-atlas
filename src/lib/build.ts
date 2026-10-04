import { z } from "zod";

const levels = z.union([
  z.number().int().min(0).max(100),
  z
    .tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)])
    .refine(([a, b]) => a <= b, "Level range must be ascending"),
]);
const support = z.union([
  z.string().min(1),
  z.object({
    id: z.string().min(1),
    level_interval: levels.optional(),
    additional_text: z.string().max(10000).optional(),
  }),
]);
export const buildSchema = z.object({
  name: z.string().trim().min(1, "Give your build a name").max(120),
  author: z.string().max(120).optional(),
  link: z.union([z.url(), z.literal("")]).optional(),
  description: z.string().max(20000).optional(),
  ascendancy: z.string().max(120).optional(),
  passives: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          id: z.string().min(1),
          level_interval: levels.optional(),
          weapon_set: z.number().int().min(0).max(2).optional(),
          additional_text: z.string().max(10000).optional(),
        }),
      ]),
    )
    .max(5000)
    .optional(),
  skills: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          id: z.string().min(1),
          level_interval: levels.optional(),
          additional_text: z.string().max(10000).optional(),
          support_skills: z.array(support).max(20).optional(),
        }),
      ]),
    )
    .max(100)
    .optional(),
  inventory_slots: z
    .array(
      z.object({
        inventory_id: z.string().min(1),
        slot_x: z.number().int().nonnegative().optional(),
        slot_y: z.number().int().nonnegative().optional(),
        level_interval: levels.optional(),
        unique_name: z.string().optional(),
        additional_text: z.string().max(10000).optional(),
      }),
    )
    .max(100)
    .optional(),
});
export type Build = z.infer<typeof buildSchema>;
export type SavedBuild = { id: string; updatedAt: string; build: Build };
export const emptyBuild: Build = {
  name: "Untitled build",
  author: "",
  description: "",
  passives: [],
  skills: [],
  inventory_slots: [],
};
export function parseBuild(text: string): Build {
  if (text.length > 1_000_000) throw new Error("Build files must be smaller than 1 MB");
  return buildSchema.parse(JSON.parse(text));
}
export function exportBuild(build: Build): string {
  return JSON.stringify(buildSchema.parse(build), null, 2) + "\n";
}
export function downloadFile(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.replace(/[^\p{L}\p{N}_.-]/gu, "_");
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

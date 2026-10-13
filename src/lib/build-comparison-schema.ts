import { z } from "zod";
export const buildComparisonReportSchema = z
  .object({
    format: z.literal("exile-atlas-build-comparison"),
    version: z.literal(1),
    inputs: z.array(z.object({ name: z.string(), id: z.string().optional() })).length(2),
    sources: z.record(z.string(), z.string()),
    difference: z.unknown(),
  })
  .strict();

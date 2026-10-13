import { z } from "zod";
import type { PassiveSprite } from "./artwork";

export const planningSpriteSchema = z
  .object({
    sheet: z.string().regex(/^\/art\/planning\/[a-z0-9-]+\.webp$/),
    sheetWidth: z.number().int().positive().max(8192),
    sheetHeight: z.number().int().positive().max(8192),
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  })
  .refine(
    (s) => s.x + s.w <= s.sheetWidth && s.y + s.h <= s.sheetHeight,
    "Sprite crop exceeds image bounds",
  );

export function parsePlanningSprites(raw: unknown, sheet: string): Map<string, PassiveSprite> {
  const source = z.record(z.string(), z.unknown()).parse(raw);
  const atlas = z
    .object({ w: z.number().int().positive(), h: z.number().int().positive() })
    .parse(source._atlas);
  const frames = new Map<string, PassiveSprite>();
  for (const [path, frame] of Object.entries(source)) {
    if (path.startsWith("_")) continue;
    const crop = z
      .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
      .parse(frame);
    frames.set(
      path,
      planningSpriteSchema.parse({ sheet, sheetWidth: atlas.w, sheetHeight: atlas.h, ...crop }),
    );
  }
  return frames;
}

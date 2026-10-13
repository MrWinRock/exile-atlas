import type { PassiveSprite } from "@/lib/artwork";

/** Nested SVG clips a source spritesheet to its exact node-art crop. */
export function PlanningNodeImage({
  sprite,
  x,
  y,
  size,
}: {
  sprite: PassiveSprite;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <svg
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      viewBox={`${sprite.x} ${sprite.y} ${sprite.w} ${sprite.h}`}
      overflow="hidden"
      pointerEvents="none"
    >
      <image href={sprite.sheet} width={sprite.sheetWidth} height={sprite.sheetHeight} />
    </svg>
  );
}

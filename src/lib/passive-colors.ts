export const SHARED_PASSIVE_COLOR = 0xdab077;
export const WEAPON_PASSIVE_COLORS = { 1: 0x74c99a, 2: 0x83b9ed } as const;

export function passiveEdgeColor(
  from: string,
  to: string,
  weaponAllocated: ReadonlySet<string>,
  weaponSet?: 1 | 2,
): number {
  return weaponSet && (weaponAllocated.has(from) || weaponAllocated.has(to))
    ? WEAPON_PASSIVE_COLORS[weaponSet]
    : SHARED_PASSIVE_COLOR;
}

import type { AllocationMode } from "./passive-plan";
export type PassiveDisplay = { shared: string[]; weapon1: string[]; weapon2: string[]; mode: AllocationMode; showBoth: boolean };
export function passiveMembership(display: PassiveDisplay, id: string): AllocationMode[] {
  if (display.shared.includes(id)) return [0];
  return ([1, 2] as const).filter((set) => display[set === 1 ? "weapon1" : "weapon2"].includes(id));
}
export function visiblePassiveIds(display: PassiveDisplay): string[] {
  return [...new Set([...display.shared, ...(display.showBoth || display.mode === 1 ? display.weapon1 : []), ...(display.showBoth || display.mode === 2 ? display.weapon2 : [])])];
}
export function edgeMembership(display: PassiveDisplay, from: string, to: string): AllocationMode[] {
  const shared = new Set(display.shared);
  if (shared.has(from) && shared.has(to)) return [0];
  return ([1, 2] as const).filter((set) => {
    if (!display.showBoth && display.mode !== set) return false;
    const branch = new Set([...shared, ...display[set === 1 ? "weapon1" : "weapon2"]]);
    return branch.has(from) && branch.has(to);
  });
}

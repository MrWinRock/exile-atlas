import { expect, test } from "bun:test";
import { passiveEdgeColor } from "../src/lib/passive-colors";

test("shared paths remain gold while a path entering the active weapon branch uses its set color", () => {
  const weapon = new Set(["weapon-a", "weapon-b"]);
  expect(passiveEdgeColor("shared-a", "shared-b", weapon, 1)).toBe(0xdab077);
  expect(passiveEdgeColor("shared-a", "weapon-a", weapon, 1)).toBe(0x74c99a);
  expect(passiveEdgeColor("weapon-a", "shared-a", weapon, 2)).toBe(0x83b9ed);
  expect(passiveEdgeColor("weapon-a", "weapon-b", weapon, 2)).toBe(0x83b9ed);
  expect(passiveEdgeColor("weapon-a", "weapon-b", weapon)).toBe(0xdab077);
});

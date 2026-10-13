import { expect, test } from "bun:test";
import { numericSlotsPattern } from "../src/lib/regex-numeric-slots";
test("multi-roll ranges retain each selected slot and block longer numeric suffixes", () => {
  const slots = [
    {
      index: 0,
      scale: 1 as const,
      domain: [0, 999] as [number, number],
      unit: "damage",
      sign: "positive" as const,
    },
    {
      index: 1,
      scale: 1 as const,
      domain: [0, 999] as [number, number],
      unit: "damage",
      sign: "positive" as const,
    },
  ];
  const re = new RegExp(
    numericSlotsPattern("Adds # to # Fire Damage", slots, {
      "0": { min: "5", max: "" },
      "1": { min: "", max: "10" },
    }),
    "im",
  );
  expect(re.test("Adds 5 to 10 Fire Damage")).toBe(true);
  expect(re.test("Adds 4 to 10 Fire Damage")).toBe(false);
  expect(re.test("Adds 5 to 11 Fire Damage")).toBe(false);
});
test("declared hundredths permit equivalent precision without rounding or suffix matches", () => {
  const re = new RegExp(
    numericSlotsPattern(
      "Attacks per Second: #",
      [{ index: 0, scale: 100, domain: [0, 100], unit: "rate", sign: "positive" }],
      { "0": { min: "1.20", max: "1.50" } },
    ),
    "im",
  );
  for (const n of ["1.2", "1.20", "1.5", "1.50"])
    expect(re.test(`Attacks per Second: ${n}`)).toBe(true);
  for (const n of ["1.19", "1.51", "11.2", "1.501"])
    expect(re.test(`Attacks per Second: ${n}`)).toBe(false);
});
test("presence selections do not constrain boosted rolls to an unmodified affix range", () => {
  const re = new RegExp(
    numericSlotsPattern(
      "+# to Strength",
      [{ index: 0, scale: 1, domain: [5, 33], unit: "value", sign: "positive" }],
      {},
    ),
    "im",
  );
  expect(re.test("+44 to Strength")).toBe(true);
});

import { expect, test } from "bun:test";
import { createRegexDraft } from "../src/lib/regex-schema";
import { compileRegexSearch, integerRangePattern, templatePattern } from "../src/lib/regex-search";

test("integer ranges are exact across digit and sign boundaries", () => {
  for (const [min, max] of [
    [0, 0],
    [9, 11],
    [19, 21],
    [99, 101],
    [-12, -9],
    [-2, 2],
    [0, 99999],
  ]) {
    const re = new RegExp(`^(${integerRangePattern(min, max)})$`);
    for (let n = min - 2; n <= Math.min(max + 2, 300); n++)
      expect(re.test(String(n))).toBe(n >= min && n <= max);
    expect(re.test(String(max))).toBe(true);
    expect(re.test(String(max + 1))).toBe(false);
  }
});
test("the selected numeric slot is constrained without using an unrelated roll", () => {
  const re = new RegExp("^" + templatePattern("# to # Physical Damage", [10, 20], 1));
  expect(re.test("1 to 15 Physical Damage")).toBe(true);
  expect(re.test("15 to 100 Physical Damage")).toBe(false);
});
test("modifier ranges reject longer numbers and preserve negative sign", () => {
  const d = createRegexDraft("equipment");
  d.wanted = [{ id: "life", min: "10", max: "20" }];
  const c = compileRegexSearch(d);
  expect(c.valid).toBe(true);
  const re = new RegExp(c.groups[0].conditions[0].pattern, "i");
  expect(re.test("+10 to maximum Life")).toBe(true);
  expect(re.test("+20 to maximum Life")).toBe(true);
  expect(re.test("+110 to maximum Life")).toBe(false);
  expect(re.test("-10 to maximum Life")).toBe(false);
});
test("compiler preserves Any/All, exclusions and mandatory properties", () => {
  const d = createRegexDraft("equipment");
  d.wanted = [
    { id: "life", min: "0", max: "" },
    { id: "mana", min: "", max: "" },
  ];
  d.unwanted = [{ id: "fire-resistance", min: "", max: "" }];
  d.properties = { rarity: "rare" };
  expect(compileRegexSearch(d).groups.find((g) => g.conditions.length === 2)?.operator).toBe("any");
  d.match = "all";
  expect(compileRegexSearch(d).groups.every((g) => g.operator === "all")).toBe(true);
  expect(compileRegexSearch(d).text).toContain('"!');
});
test("invalid conditions never disappear, and output is never truncated", () => {
  const d = createRegexDraft("equipment");
  for (const [min, max] of [
    ["20", "10"],
    ["1.5", ""],
    ["Infinity", ""],
    ["-1", ""],
  ]) {
    d.wanted = [{ id: "life", min, max }];
    expect(compileRegexSearch(d).valid).toBe(false);
  }
  d.wanted = [{ id: "missing", min: "", max: "" }];
  expect(compileRegexSearch(d).errors.join()).toContain("missing");
  d.wanted = [];
  d.text = "x".repeat(300);
  const c = compileRegexSearch(d);
  expect(c.text.length).toBeGreaterThan(250);
  expect(c.copyable).toBe(false);
  expect(c.text).toContain(d.text);
  expect(compileRegexSearch(createRegexDraft("equipment")).copyable).toBe(false);
});
test("literals cannot inject tokens, alternatives, or uncontrolled regex", () => {
  const d = createRegexDraft("vendor");
  d.text = 'a+b.(c)|"x"\\';
  const c = compileRegexSearch(d);
  const re = new RegExp(c.groups[0].conditions[0].pattern, "i");
  expect(re.test(d.text)).toBe(true);
  expect(re.test("x")).toBe(false);
  expect(c.text).not.toContain('"x"');
});
test("an exclusion with no bounds excludes the modifier regardless of sign", () => {
  const d = createRegexDraft("equipment");
  d.unwanted = [{ id: "life", min: "", max: "" }];
  const c = compileRegexSearch(d);
  expect(new RegExp(c.groups[0].conditions[0].pattern, "i").test("-10 to maximum Life")).toBe(true);
});

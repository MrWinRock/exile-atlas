import { escapeRegexLiteral, integerRangePattern } from "./regex-search";
import type { ModifierDefinition } from "./game-data";
import type { RegexRange } from "./regex-schema";
export function scaledNumberPattern(min: number, max: number, scale: 1 | 10 | 100): string {
  const digits = scale === 100 ? 2 : scale === 10 ? 1 : 0;
  if (!digits) return integerRangePattern(min, max);
  const fraction = (a: number, b: number) => {
    const parts: string[] = [];
    if (scale === 10) parts.push(integerRangePattern(a, b));
    else {
      if (a < 10) parts.push("0" + integerRangePattern(a, Math.min(b, 9)));
      if (b >= 10) parts.push(integerRangePattern(Math.max(a, 10), b));
      const lo = Math.ceil(a / 10),
        hi = Math.floor(b / 10);
      if (lo <= hi) parts.push(integerRangePattern(lo, hi));
    }
    return "(" + parts.join("|") + ")";
  };
  const positive = (a: number, b: number) => {
    const start = Math.floor(a / scale),
      end = Math.floor(b / scale),
      parts: string[] = [];
    const point = (whole: number, lo: number, hi: number) => {
      if (lo === 0) parts.push(String(whole));
      if (hi > 0 || lo === 0) parts.push(`${whole}\\.${fraction(lo, hi)}`);
    };
    if (start === end) point(start, a % scale, b % scale);
    else {
      point(start, a % scale, scale - 1);
      point(end, 0, b % scale);
      if (end > start + 1)
        parts.push(integerRangePattern(start + 1, end - 1) + `(\\.\\d{1,${digits}})?`);
    }
    return parts.join("|");
  };
  const low = Math.round(min * scale),
    high = Math.round(max * scale),
    parts: string[] = [];
  if (low < 0) parts.push("-(" + positive(Math.max(1, -high), -low) + ")");
  if (high >= 0) parts.push(positive(Math.max(0, low), high));
  return "(" + parts.join("|") + ")";
}
export function numericSlotsPattern(
  template: string,
  slots: ModifierDefinition["numericSlots"],
  ranges: Record<string, RegexRange>,
  advanced = false,
): string {
  const parts = template.split("#");
  let result = escapeRegexLiteral(parts[0]);
  for (let i = 0; i < parts.length - 1; i++) {
    const slot = slots[i],
      range = ranges[String(i)];
    if (range && (range.min || range.max) && !slot)
      throw new Error("Numeric precision is unverified for this slot");
    let number = "[+-]?\\d+(\\.\\d+)?";
    if (slot) {
      const parse = (s: string, fallback: number) => {
        if (!s.trim()) return fallback;
        const digits = slot.scale === 100 ? 2 : slot.scale === 10 ? 1 : 0;
        if (!new RegExp(`^-?\\d+${digits ? `(\\.\\d{1,${digits}})?` : ""}$`).test(s.trim()))
          throw new Error("Use the declared numeric precision");
        const n = Number(s);
        if (n < slot.domain[0] || n > slot.domain[1])
          throw new Error("Value outside verified numeric domain");
        return n;
      };
      const min = parse(range?.min ?? "", slot.domain[0]),
        max = parse(range?.max ?? "", slot.domain[1]);
      if (min > max) throw new Error("Minimum exceeds maximum");
      number =
        (min >= 0 && !parts[i].endsWith("+") ? "\\+?" : "") +
        scaledNumberPattern(min, max, slot.scale);
    }
    result += number + (advanced ? "(\\([^\\r\\n)]*\\))?" : "") + escapeRegexLiteral(parts[i + 1]);
  }
  return "(^|[^\\d.+-])" + result + (template.endsWith("#") ? "($|[^\\d.])" : "");
}

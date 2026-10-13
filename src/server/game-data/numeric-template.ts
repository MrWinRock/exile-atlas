import type { ModifierDefinition } from "../../lib/game-data";

/** Extract signed literal ranges without executing source code. */
export function normalizeNumericTemplate(
  text: string,
  slots: ModifierDefinition["numericSlots"],
): string {
  return text.replace(
    /(-?)\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g,
    (_, minus, a: string, b: string) => {
      const digits = Math.max(a.split(".")[1]?.length ?? 0, b.split(".")[1]?.length ?? 0);
      if (digits > 2) throw new Error("Unsupported numeric precision");
      const low = Number(a) * (minus ? -1 : 1),
        high = Number(b) * (minus ? -1 : 1);
      slots.push({
        index: slots.length,
        scale: digits > 1 ? 100 : digits ? 10 : 1,
        domain: [Math.min(low, high), Math.max(low, high)],
        unit: text.includes("%") ? "%" : "value",
        sign: low < 0 || high < 0 ? "signed" : "positive",
      });
      return "#";
    },
  );
}

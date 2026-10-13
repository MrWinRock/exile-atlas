import { expect, test } from "bun:test";
import { sourceUpdateStatus } from "../src/server/game-data/source-status";
test("independent DB dataset changes are available even when the PoB revision stays unchanged", () => {
  expect(
    sourceUpdateStatus([
      { source: "PoB", installed: "a", upstream: "a" },
      { source: "Relics", installed: "b", upstream: "c" },
    ]),
  ).toBe("available");
  expect(sourceUpdateStatus([{ source: "PoB", installed: "a", upstream: "a" }])).toBe("current");
  expect(sourceUpdateStatus([{ source: "PoB", installed: "a", error: "offline" }])).toBe("offline");
});

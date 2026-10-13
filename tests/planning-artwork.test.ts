import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parsePlanningSprites } from "../src/lib/planning-artwork";
import { parseGenesisData } from "../src/lib/genesis-data";

test("planning sprite crops cannot escape their image bounds", () => {
  const raw = { _atlas: { w: 100, h: 80 }, icon: { x: 20, y: 10, w: 30, h: 40 } };
  expect(parsePlanningSprites(raw, "/art/planning/test.webp").get("icon")).toEqual({
    sheet: "/art/planning/test.webp",
    sheetWidth: 100,
    sheetHeight: 80,
    x: 20,
    y: 10,
    w: 30,
    h: 40,
  });
  expect(() =>
    parsePlanningSprites(
      { ...raw, icon: { x: 80, y: 0, w: 30, h: 30 } },
      "/art/planning/test.webp",
    ),
  ).toThrow();
  expect(() => parsePlanningSprites(raw, "javascript:alert(1)")).toThrow();
});

test("every pinned Genesis source node retains matching artwork", () => {
  const data = parseGenesisData(JSON.parse(readFileSync("public/data/poe2-genesis.json", "utf8")));
  expect(data.nodes.every((n) => !!n.sprite)).toBe(true);
  const broken = structuredClone(data);
  broken.nodes[0].sprite!.x = 10000;
  expect(() => parseGenesisData(broken)).toThrow();
});

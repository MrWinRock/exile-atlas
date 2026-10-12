import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseGenesisData } from "../src/lib/genesis-data";
test("the pinned Genesis snapshot has five valid, isolated, reachable roots", () => {
  const data = parseGenesisData(JSON.parse(readFileSync("public/data/poe2-genesis.json", "utf8")));
  expect(data.nodes.filter((n) => n.root)).toHaveLength(5);
  expect(data.historical).toBe(true);
  expect(data.nodes).toHaveLength(243);
  expect(data.captured).toBe("2026-07-04");
  expect(new Set(data.nodes.map((n) => n.id)).size).toBe(data.nodes.length);
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  for (const [a, b] of data.edges) expect(byId.get(a)?.branch).toBe(byId.get(b)?.branch);
  const broken = structuredClone(data);
  broken.edges.push([data.nodes[0].id, "unknown"]);
  expect(() => parseGenesisData(broken)).toThrow();
  const geometry = structuredClone(data);
  geometry.nodes[0].x = Infinity;
  expect(() => parseGenesisData(geometry)).toThrow();
});

import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeGenesisSource } from "../src/lib/genesis-data";
const REVISION = "27f5dad0d0979aa23a604defd11fcf7ae4668444";
const ROOT = `https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/${REVISION}/src/data`;
const SOURCES = [
  {
    name: "genesisGraph.json",
    sha: "7e88a370fa33c2f249002cd8d65af060640a091c89c848bbdfd06e689e359ca8",
  },
  {
    name: "genesisCrafting.json",
    sha: "bfe55a9da73438fe40cdc50b37db6e59ff124a0edc15f123b1da814c2938b038",
  },
] as const;
async function prepare() {
  const raw = await Promise.all(
    SOURCES.map(async (source) => {
      const response = await fetch(`${ROOT}/${source.name}`);
      if (!response.ok) throw new Error(`Source fetch failed: ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (createHash("sha256").update(bytes).digest("hex") !== source.sha)
        throw new Error(`Integrity check failed: ${source.name}`);
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    }),
  );
  const normalized = normalizeGenesisSource(raw[0], raw[1], REVISION);
  await mkdir(resolve("public/data"), { recursive: true });
  await Bun.write(
    resolve("public/data/poe2-genesis.json"),
    JSON.stringify(normalized, null, 2) + "\n",
  );
  console.log(
    `Prepared ${normalized.nodes.length} nodes / ${normalized.edges.length} edges; historical ${normalized.captured} snapshot.`,
  );
}
if (import.meta.main) await prepare();

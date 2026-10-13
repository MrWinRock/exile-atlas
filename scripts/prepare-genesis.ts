import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeGenesisSource } from "../src/lib/genesis-data";
import { parsePlanningSprites } from "../src/lib/planning-artwork";
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
  {
    name: "genesisIcons.json",
    sha: "cb0cc956e119213c95e2a34c0e063b57b97fd79c5f0aa5605879de826873f8af",
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
  const sprites = parsePlanningSprites(raw[2], "/art/planning/genesis-icons.webp");
  const normalized = normalizeGenesisSource(raw[0], raw[1], REVISION, sprites);
  if (normalized.nodes.some((n) => !n.sprite))
    throw new Error("Genesis artwork coverage is incomplete.");
  const image = await fetch(
    `https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/${REVISION}/src/assets/tree/genesis-icons.webp`,
  );
  if (!image.ok) throw new Error(`Genesis image fetch failed: ${image.status}`);
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (
    createHash("sha256").update(bytes).digest("hex") !==
    "d0c627af6c86fc8c7e891bac8b8cde6516eb4e15e3479716d9599c420b10369a"
  )
    throw new Error("Genesis image integrity check failed.");
  await mkdir(resolve("public/art/planning"), { recursive: true });
  await Bun.write(resolve("public/art/planning/genesis-icons.webp"), bytes);
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

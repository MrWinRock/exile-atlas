import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { normalizeAtlasSource } from "../src/lib/atlas-data";
import { parsePlanningSprites } from "../src/lib/planning-artwork";
const REVISION = "b818b843337cae43b090b272fd98bbc0fd3a34f3";
const ART_REVISION = "27f5dad0d0979aa23a604defd11fcf7ae4668444";
async function pinned(url: string, sha: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Atlas source fetch failed: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== sha)
    throw new Error(`Atlas integrity check failed: ${url}`);
  return bytes;
}
async function prepare() {
  const artRoot = `https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/${ART_REVISION}`;
  const [source, icons, image] = await Promise.all([
    pinned(
      `https://raw.githubusercontent.com/repoe-fork/poe2/${REVISION}/data/passive_skill_trees/Atlas.json`,
      "7148fa1989e273adfba30fdb5d3fb878a647158d79b4dddfdf4d08ea40632ebd",
    ),
    pinned(
      `${artRoot}/src/data/atlasIcons.json`,
      "7d35ee1f769f82fcf7bffc28e7aada3ec32fdefaf61fdbf194d981176be10917",
    ),
    pinned(
      `${artRoot}/src/assets/tree/atlas-icons.webp`,
      "a0e2b47ec71edac2b5bc45fd5cbb0a29a7409099f4585855861a3736e9ad8798",
    ),
  ]);
  const decode = (bytes: Uint8Array) => JSON.parse(new TextDecoder().decode(bytes));
  const data = normalizeAtlasSource(
    decode(source),
    { revision: REVISION, captured: "2026-09-15", patch: "4.5.5.2" },
    parsePlanningSprites(decode(icons), "/art/planning/atlas-icons.webp"),
  );
  data.artwork = {
    source: `https://github.com/PraedythXIV/poe2-build-converter/tree/${ART_REVISION}`,
    captured: "2026-07-04",
    patch: "4.5.4.3",
  };
  await mkdir("public/art/planning", { recursive: true });
  await mkdir("public/data", { recursive: true });
  await Bun.write("public/art/planning/atlas-icons.webp", image);
  await Bun.write("public/data/poe2-atlas.json", JSON.stringify(data, null, 2) + "\n");
  console.log(
    `Prepared ${data.nodes.length} Atlas nodes / ${data.edges.length} edges, ${data.nodes.filter((n) => n.root).length} roots, ${data.nodes.filter((n) => n.sprite).length} sourced node images.`,
  );
}
if (import.meta.main) await prepare();

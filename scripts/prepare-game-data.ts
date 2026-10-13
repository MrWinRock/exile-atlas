import { createHash } from "node:crypto";
import { readdir, readFile, mkdir } from "node:fs/promises";
import { normalizePobBundle } from "../src/server/game-data/pob-adapter";
import { validateGameSnapshot } from "../src/lib/game-data";
import trade from "../public/data/poe2-trade-stats.json";
import { parseTradeStatsLua } from "./prepare-trade-stats";
import { extractDbDefinitions } from "../src/server/game-data/db-adapter";
import { CORE_CRAFT_OPERATIONS } from "../src/lib/crafting-operations";
const revision = "bb52d6b368307457eb9c54bb13f1829993d390b1";
const modFiles = [
  "ModItem.lua",
  "ModItemExclusive.lua",
  "ModCharm.lua",
  "ModFlask.lua",
  "ModJewel.lua",
  "ModCorrupted.lua",
  "ModRunes.lua",
  "ModVeiled.lua",
];
const baseFiles = [
  "amulet",
  "belt",
  "body",
  "boots",
  "bow",
  "crossbow",
  "flail",
  "flask",
  "focus",
  "gloves",
  "helmet",
  "jewel",
  "mace",
  "quiver",
  "ring",
  "sceptre",
  "shield",
  "spear",
  "staff",
  "talisman",
  "wand",
];
export const GAME_SOURCE_PATHS = [
  ...modFiles.map((p) => `src/Data/${p}`),
  ...baseFiles.map((p) => `src/Data/Bases/${p}.lua`),
];
export async function prepareGameData(rev = revision, refreshDb = false) {
  if (!/^[a-f0-9]{40}$/.test(rev)) throw new Error("Invalid source revision");
  const files: Record<string, string> = {},
    refs = [];
  if (!refreshDb) await mkdir("data/game-data-raw", { recursive: true });
  const cached = new Set(refreshDb ? [] : await readdir("data/game-data-raw"));
  for (const path of GAME_SOURCE_PATHS) {
    const name = path.includes("Bases/")
      ? `Base-${path.split("/").at(-1)}`
      : path.split("/").at(-1)!;
    const url = `https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/${rev}/${path}`;
    let content: string;
    if (rev === revision && cached.has(name))
      content = await readFile(`data/game-data-raw/${name}`, "utf8");
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Source fetch ${response.status}: ${path}`);
      content = await response.text();
    }
    files[name] = content;
    refs.push({
      source: "Path of Building Community PoE2",
      revision: rev,
      url,
      checksum: createHash("sha256").update(content).digest("hex"),
    });
  }
  const snapshot = normalizePobBundle(files, refs);
  // Preserve trade identities from the corresponding pinned export. A newer source
  // requires its matching TradeSiteStats literal extraction before it can be staged.
  let groups = trade.groups;
  if (rev !== trade.revision) {
    const url = `https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/${rev}/src/Data/TradeSiteStats.lua`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("Matching trade-stat source unavailable");
    const literal = await response.text();
    groups = parseTradeStatsLua(literal);
    snapshot.sourceRefs.push({
      source: "PoB trade stats",
      revision: rev,
      url,
      checksum: createHash("sha256").update(literal).digest("hex"),
    });
  }
  snapshot.stats = groups.filter((g) => g.id !== "pseudo").flatMap((g) => g.entries);
  const categories = (text: string): string[] =>
    /\(Sanctum\)|Honour|Sacred Water|Merchant|Affliction/i.test(text)
      ? ["relic"]
      : /\(Map\)|in Map|in your Maps|Tablets?|Tower|Precursor/i.test(text)
        ? ["tablet"]
        : ["vendor", "equipment"];
  snapshot.regexDefinitions = [
    ...new Map(
      snapshot.stats
        .filter((s) => s.type === "explicit" || s.type === "sanctum" || s.type === "rune")
        .map((s) => [
          s.id + ":" + s.text,
          {
            id: s.id + ":" + createHash("sha256").update(s.text).digest("hex").slice(0, 8),
            template: s.text.replace(/ \((?:Map|Sanctum)\)$/, ""),
            categories: categories(s.text),
            tradeStatId: s.id,
          },
        ]),
    ).values(),
  ];
  for (const [category, page, file] of [
    ["relic", "Relics", "relics"],
    ["tablet", "Tablet", "tablets"],
  ] as const) {
    const url = `https://poe2db.tw/us/${page}`;
    const cachedPath = `data/regex-reference/${file}.html`;
    let html: string;
    if (!refreshDb && (await Bun.file(cachedPath).exists()))
      html = await Bun.file(cachedPath).text();
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error("Modifier source unavailable");
      html = await response.text();
    }
    const definitions = extractDbDefinitions(html, category, url);
    const checksum = createHash("sha256").update(html).digest("hex"),
      revision = createHash("sha256")
        .update(JSON.stringify(definitions))
        .digest("hex")
        .slice(0, 40);
    snapshot.sourceRefs.push({
      source: `PoE2DB ${page} game-data extraction`,
      revision,
      url,
      checksum,
    });
    snapshot.regexDefinitions = snapshot.regexDefinitions.filter(
      (d) => !d.categories.includes(category),
    );
    snapshot.regexDefinitions.push(...definitions);
  }
  snapshot.currencyOperations = CORE_CRAFT_OPERATIONS;
  const normalized = validateGameSnapshot(snapshot);
  normalized.id = createHash("sha256")
    .update(JSON.stringify({ ...normalized, id: undefined, verifiedAt: undefined }))
    .digest("hex");
  return normalized;
}
if (import.meta.main) {
  const s = await prepareGameData();
  await Bun.write("public/data/poe2-game-data.json", JSON.stringify(s));
  console.log(
    JSON.stringify({
      id: s.id,
      modifiers: s.modifiers.length,
      bases: s.bases.length,
      regex: s.regexDefinitions.length,
    }),
  );
}

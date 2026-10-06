import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const REVISION = "bb52d6b368307457eb9c54bb13f1829993d390b1";
const STAT_BLOB = "163a42ae653a2d1576eddf3827aaac3ea308b9d1";
const SOURCE_ROOT = `https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/${REVISION}`;
const SOURCE_URL = `${SOURCE_ROOT}/src/Data/TradeSiteStats.lua`;
const EXPECTED_COUNTS = { entries: 8293, uniqueIds: 8213, aliases: 80 };
const GROUP_IDS = [
  "pseudo",
  "explicit",
  "implicit",
  "fractured",
  "crafted",
  "enchant",
  "rune",
  "desecrated",
  "sanctum",
  "skill",
] as const;
const entrySchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    type: z.string().min(1),
  })
  .strict();
const groupsSchema = z
  .array(
    z
      .object({
        id: z.enum(GROUP_IDS),
        label: z.string().min(1),
        entries: z.array(entrySchema),
      })
      .strict(),
  )
  .min(1);

export type TradeStatGroup = {
  id: string;
  label: string;
  entries: { id: string; text: string; type: string }[];
};
export type TradeStatCounts = { entries: number; uniqueIds: number; aliases: number };

type LuaValue = string | LuaValue[] | { [key: string]: LuaValue };

// Parse only the generated catalogue's literal-table syntax. Lua is never evaluated.
export function parseTradeStatsLua(source: string): TradeStatGroup[] {
  let offset = 0;
  const fail = (message: string): never => {
    throw new Error(`${message} at offset ${offset}`);
  };
  const skipWhitespace = () => {
    while (offset < source.length) {
      if (/\s/.test(source[offset])) offset++;
      else if (source.startsWith("--", offset)) {
        const lineEnd = source.indexOf("\n", offset);
        offset = lineEnd < 0 ? source.length : lineEnd + 1;
      } else break;
    }
  };
  const expect = (token: string) => {
    skipWhitespace();
    if (!source.startsWith(token, offset)) fail(`Expected ${token}`);
    offset += token.length;
  };
  const readString = (): string => {
    skipWhitespace();
    const quote = source[offset++];
    if (quote !== '"' && quote !== "'") fail("Expected a quoted string");
    let value = "";
    const escapes: Record<string, string> = {
      a: "\u0007",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
      v: "\v",
      "\\": "\\",
      '"': '"',
      "'": "'",
    };
    while (offset < source.length) {
      const char = source[offset++];
      if (char === quote) return value;
      if (char === "\n" || char === "\r") fail("Unescaped newline in string");
      if (char !== "\\") value += char;
      else {
        const escaped = escapes[source[offset++]];
        if (escaped === undefined) fail("Unsupported string escape");
        value += escaped;
      }
    }
    return fail("Unterminated string");
  };
  const readValue = (depth = 0): LuaValue => {
    if (depth > 12) fail("Table nesting exceeds catalogue limit");
    skipWhitespace();
    const char = source[offset];
    if (char === '"' || char === "'") return readString();
    if (char !== "{") return fail("Expected a literal string or table");
    offset++;
    const array: LuaValue[] = [];
    const record: { [key: string]: LuaValue } = Object.create(null);
    let keyed = false;
    while (true) {
      skipWhitespace();
      if (source[offset] === "}") {
        offset++;
        return keyed ? record : array;
      }
      if (source[offset] === "[") {
        if (array.length) fail("Mixed keyed and array table");
        keyed = true;
        offset++;
        const key = readString();
        if (Object.hasOwn(record, key)) fail(`Duplicate table key ${key}`);
        expect("]");
        expect("=");
        record[key] = readValue(depth + 1);
      } else {
        if (keyed) fail("Mixed keyed and array table");
        array.push(readValue(depth + 1));
      }
      skipWhitespace();
      if (source[offset] === ",") offset++;
      else if (source[offset] !== "}") fail("Expected comma or closing table");
    }
  };
  expect("return");
  const groups = groupsSchema.parse(readValue());
  skipWhitespace();
  if (offset !== source.length) fail("Unexpected content after catalogue");
  verifyTradeStatGroups(groups);
  return groups;
}

export function verifyTradeStatGroups(
  groups: TradeStatGroup[],
  expected?: TradeStatCounts,
): TradeStatCounts {
  groupsSchema.parse(groups);
  const groupIds = new Set<string>();
  const uniqueIds = new Set<string>();
  const uniqueEntries = new Set<string>();
  let entries = 0;
  for (const group of groups) {
    if (groupIds.has(group.id)) throw new Error(`Duplicate group ID ${group.id}`);
    groupIds.add(group.id);
    for (const entry of group.entries) {
      if (
        !entry.id.startsWith(`${group.id}.`) ||
        entry.type !== (group.id === "rune" ? "augment" : group.id)
      )
        throw new Error(`Stat ${entry.id} has a mismatched group or type`);
      const identity = JSON.stringify([group.id, entry.id, entry.text, entry.type]);
      if (uniqueEntries.has(identity)) throw new Error(`Duplicate stat entry ${entry.id}`);
      uniqueEntries.add(identity);
      uniqueIds.add(entry.id);
      entries++;
    }
  }
  const counts = { entries, uniqueIds: uniqueIds.size, aliases: entries - uniqueIds.size };
  if (
    expected &&
    (counts.entries !== expected.entries ||
      counts.uniqueIds !== expected.uniqueIds ||
      counts.aliases !== expected.aliases)
  )
    throw new Error(`Stat catalogue count changed: ${JSON.stringify(counts)}`);
  return counts;
}

async function fetchPinnedText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Unable to read pinned source (${response.status}): ${url}`);
  const text = await response.text();
  if (Buffer.byteLength(text) > 5_000_000) throw new Error("Pinned source exceeds expected size");
  return text;
}

async function prepareTradeStats() {
  const [lua, license] = await Promise.all([
    fetchPinnedText(SOURCE_URL),
    fetchPinnedText(`${SOURCE_ROOT}/LICENSE.md`),
  ]);
  const bytes = Buffer.from(lua);
  const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  if (blob !== STAT_BLOB) throw new Error("Pinned stat source does not match its Git blob digest");
  const groups = parseTradeStatsLua(lua);
  const counts = verifyTradeStatGroups(groups, EXPECTED_COUNTS);
  if (groups.length !== GROUP_IDS.length || GROUP_IDS.some((id, i) => groups[i]?.id !== id))
    throw new Error("Pinned stat catalogue groups changed");
  const licenseEnd = license.indexOf("PUC-Rio Lua interpreter");
  if (licenseEnd < 0 || !license.includes("Copyright (c) 2016 David Gowor"))
    throw new Error("Pinned software license format changed");
  const softwareLicense = license.slice(0, licenseEnd).trim();
  const catalogue = { revision: REVISION, source: SOURCE_URL, groups };
  const notice = `# PoE2 trade stat catalogue\n\nGame data (c) Grinding Gear Games.\n\nThis catalogue is a literal-data conversion of [TradeSiteStats.lua](${SOURCE_URL}) from Path of Building Community PoE2 revision \`${REVISION}\`. Its source identifies the original data as the PoE2 trade site's stat catalogue. Regeneration reads only the pinned community repository; it does not call GGG's internal trade endpoints or execute Lua.\n\nThe JSON preserves ${counts.entries.toLocaleString("en-US")} source entries in ${groups.length} groups, including ${counts.aliases} alternate labels sharing stat IDs (${counts.uniqueIds.toLocaleString("en-US")} unique IDs). Consumers should use a compound identity of group, ID and text for list keys while retaining the original stat ID in searches. The catalogue is a snapshot; additions and changes on the official trade website may appear later.\n\nRegenerate with \`bun run scripts/prepare-trade-stats.ts\`. The script checks the pinned Git blob digest, schema, group list, unique compound entries and expected counts before writing.\n\nThe upstream repository's software license is reproduced below. The upstream game-data copyright notice remains applicable to the catalogue; this notice does not relicense GGG's game data.\n\n## Path of Building software license\n\n\`\`\`text\n${softwareLicense}\n\`\`\`\n`;
  const output = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data");
  await mkdir(output, { recursive: true });
  await Bun.write(resolve(output, "poe2-trade-stats.json"), JSON.stringify(catalogue) + "\n");
  await Bun.write(resolve(output, "poe2-trade-stats.NOTICE.md"), notice);
  console.log(
    `Prepared ${counts.entries} PoE2 trade stat entries in ${groups.length} groups (${counts.uniqueIds} unique IDs; ${counts.aliases} aliases).`,
  );
}

if (import.meta.main) await prepareTradeStats();

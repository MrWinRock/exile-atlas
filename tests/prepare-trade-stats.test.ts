import { expect, test } from "bun:test";
import { parseTradeStatsLua, verifyTradeStatGroups } from "../scripts/prepare-trade-stats";

const fixture = `-- Game data (c) Grinding Gear Games
return {
  {
    ["entries"] = {
      { ["id"] = "explicit.stat_243380454", ["text"] = "# additional Rare Monsters are spawned from Abysses", ["type"] = "explicit", },
      { ["id"] = "explicit.stat_243380454", ["text"] = "# additional Rare Monsters are spawned from Abysses in Map", ["type"] = "explicit", },
    },
    ["id"] = "explicit", ["label"] = "Explicit",
  },
  {
    ["id"] = "rune", ["label"] = "Augment",
    ["entries"] = { { ["id"] = "rune.stat_123", ["text"] = "Adds # to # Damage", ["type"] = "augment", }, },
  },
}`;

test("literal Lua conversion retains alternate labels sharing a stat ID", () => {
  const groups = parseTradeStatsLua(fixture);
  expect(groups).toEqual([
    {
      id: "explicit",
      label: "Explicit",
      entries: [
        {
          id: "explicit.stat_243380454",
          text: "# additional Rare Monsters are spawned from Abysses",
          type: "explicit",
        },
        {
          id: "explicit.stat_243380454",
          text: "# additional Rare Monsters are spawned from Abysses in Map",
          type: "explicit",
        },
      ],
    },
    {
      id: "rune",
      label: "Augment",
      entries: [{ id: "rune.stat_123", text: "Adds # to # Damage", type: "augment" }],
    },
  ]);
  expect(verifyTradeStatGroups(groups)).toEqual({ entries: 3, uniqueIds: 2, aliases: 1 });
});

test("literal Lua strings decode escaped quotes and preserve Unicode labels", () => {
  const unicodeLabel = "燃焼";
  const source = String.raw`return { { ["id"] = "skill", ["label"] = "Skill", ["entries"] = { { ["id"] = "skill.fireball", ["text"] = "Fireball: \"${unicodeLabel}\"\\path", ["type"] = "skill" } } } }`;
  expect(parseTradeStatsLua(source)[0].entries[0].text).toBe('Fireball: "燃焼"\\path');
});

test.each([
  ["executable expression", "return os.execute('unexpected')"],
  ["trailing program", `${fixture}\nos.execute('unexpected')`],
  ["function call", fixture.replace('"Explicit"', "getLabel()")],
  [
    "duplicate field",
    fixture.replace('["label"] = "Explicit"', '["label"] = "Explicit", ["label"] = "Wrong"'),
  ],
  ["mismatched entry type", fixture.replace('["type"] = "explicit"', '["type"] = "pseudo"')],
  [
    "invalid text type",
    fixture.replace(
      '["text"] = "# additional Rare Monsters are spawned from Abysses"',
      '["text"] = {}',
    ),
  ],
  [
    "unknown group",
    fixture.replace('["id"] = "explicit", ["label"]', '["id"] = "unexpected", ["label"]'),
  ],
  ["truncated table", fixture.slice(0, -1)],
])("rejects %s without interpreting Lua code", (_, source) => {
  expect(() => parseTradeStatsLua(source)).toThrow();
});

test("data validation rejects exact duplicate entries instead of silently dropping them", () => {
  const groups = parseTradeStatsLua(fixture);
  groups[0].entries.push({ ...groups[0].entries[0] });
  expect(() => verifyTradeStatGroups(groups)).toThrow(/duplicate/i);
});

test("data validation detects changed pinned counts before publication", () => {
  const groups = parseTradeStatsLua(fixture);
  expect(() => verifyTradeStatGroups(groups, { entries: 4, uniqueIds: 2, aliases: 1 })).toThrow(
    /count/i,
  );
  expect(() => verifyTradeStatGroups(groups, { entries: 3, uniqueIds: 3, aliases: 0 })).toThrow(
    /count/i,
  );
});

test("repeated group IDs cannot overwrite or merge source groups", () => {
  const groups = parseTradeStatsLua(fixture);
  expect(() => verifyTradeStatGroups([...groups, groups[0]])).toThrow(/group/i);
});

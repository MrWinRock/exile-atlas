import { describe, expect, test } from "bun:test";
import { parseBuild, exportBuild } from "../src/lib/build";
import { generateFilter, validateFilter } from "../src/lib/filter";
import { completedHour, validateHour, normalizeMarket } from "../src/lib/currency";
import { poePath, rateLimitDelay } from "../src/lib/poe";
import { encryptToken, decryptToken } from "../src/server/crypto";
import { assertSameOrigin } from "../src/server/responses";

describe("PoE2 build exports", () => {
  test("roundtrips documented fields without application metadata", () => {
    const build = parseBuild(
      JSON.stringify({
        name: "Titan",
        passives: ["strength89"],
        skills: [{ id: "Metadata/Items/Gems/SkillGemEarthquake", support_skills: [] }],
      }),
    );
    expect(parseBuild(exportBuild(build))).toEqual(build);
    expect(JSON.parse(exportBuild(build))).not.toHaveProperty("id");
  });
  test("rejects malformed build and out-of-range weapon sets", () => {
    expect(() => parseBuild('{"name":""}')).toThrow();
    expect(() => parseBuild('{"name":"Bad","passives":[{"id":"x","weapon_set":3}]}')).toThrow();
    expect(() => parseBuild('{"name":"Bad","skills":"wrong"}')).toThrow();
  });
});
describe("PoE2 filter tools", () => {
  test("generates valid rules with bounded label styling", () => {
    const text = generateFilter({
      name: "Starter",
      fontSize: 42,
      rareColor: "#ffc46b",
      showNormal: false,
      showMagic: true,
      sounds: true,
    });
    expect(text).toContain("Rarity == Rare");
    expect(text).toContain("SetFontSize 42");
    expect(validateFilter(text).valid).toBe(true);
  });
  test("rejects style outside a Show/Hide block", () => {
    expect(validateFilter("SetFontSize 99").valid).toBe(false);
  });
});
describe("currency history", () => {
  test("selects the previous complete UTC hour", () => {
    expect(completedHour(new Date("2026-10-04T10:35:00Z"))).toBe(
      Date.parse("2026-10-04T09:00:00Z") / 1000,
    );
  });
  test("rejects current, future and non-hour timestamps", () => {
    const now = new Date("2026-10-04T10:35:00Z");
    expect(() => validateHour(Date.parse("2026-10-04T10:00:00Z") / 1000, now)).toThrow();
    expect(() => validateHour(123, now)).toThrow();
  });
  test("keeps currency dictionary ratios separate instead of inventing a price", () => {
    const market = normalizeMarket({
      league: "Standard",
      market_pair: ["Metadata/A", "Metadata/B"],
      volume_traded: { "Metadata/A": 120, "Metadata/B": 10 },
      lowest_ratio: { "Metadata/A": 10, "Metadata/B": 0.08 },
      highest_ratio: { "Metadata/A": 15, "Metadata/B": 0.1 },
      lowest_stock: {},
      highest_stock: {},
    });
    expect(market.baseVolume).toBe(120);
    expect(market.quoteVolume).toBe(10);
    expect(market.low).toBe(10);
    expect(market.high).toBe(15);
  });
});
describe("API boundaries", () => {
  test("uses PoE2 and encodes Unicode names as one path segment", () => {
    expect(poePath("character", "Test/# ทดสอบ")).toBe(
      "/character/poe2/Test%2F%23%20%E0%B8%97%E0%B8%94%E0%B8%AA%E0%B8%AD%E0%B8%9A",
    );
    expect(poePath("league", "Hardcore Test")).toBe("/league/Hardcore%20Test?realm=poe2");
  });
  test("honors Retry-After and exhausted header windows", () => {
    expect(rateLimitDelay(new Headers({ "Retry-After": "10" }))).toBe(10000);
    expect(
      rateLimitDelay(
        new Headers({
          "X-Rate-Limit-Rules": "client",
          "X-Rate-Limit-Client": "10:5:10",
          "X-Rate-Limit-Client-State": "10:5:0",
        }),
      ),
    ).toBe(5000);
  });
  test("rejects cross-origin mutations", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/auth/logout", {
          headers: { origin: "https://evil.example" },
        }),
        "http://localhost:3000",
      ),
    ).toThrow();
  });
});
describe("token encryption", () => {
  const key = "ab".repeat(32);
  test("roundtrips an encrypted token and detects tampering", () => {
    const encrypted = encryptToken("secret-token", key);
    expect(encrypted).not.toContain("secret-token");
    expect(decryptToken(encrypted, key)).toBe("secret-token");
    expect(() => decryptToken(encrypted.slice(0, -4) + "AAAA", key)).toThrow();
  });
});

# Item, data, and search implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User selected native implementation in this chat, current checkout, one independent final review.

**Goal:** Shared browser item inspection, complete reference regex controls and verified selectable dataset updates.
**Architecture:** Pure parsing/catalogue functions consume immutable snapshots. The existing server extracts allowlisted sources; browser snapshot selection/cache makes updates deliberate. Bundled data remains the default fallback.
**Tech Stack:** Installed Next.js/Bun/TypeScript/Zod, native IndexedDB/Web Crypto, existing PostgreSQL/Redis helpers, Bun/Playwright.
**Spec:** `docs/superpowers/specs/2026-10-13-item-data-search-design.md`.
Read installed Next.js client/route-handler guides before product edits.

## Global constraints

Browser-only English pasted item text; maximum 64 KiB UTF-8. Preserve unknown lines, existing saved IDs and all user libraries. Immutable source-qualified snapshots; no fetched Lua/JavaScript execution or guessed patch/tier/DPS. Existing 250-character copy budget, Any/All and explicit exclusion semantics remain. No new dependency or account requirement.

## Task 1 — reusable item parser

**Files:** create `src/lib/item-text.ts`, `tests/item-text.test.ts`, `tests/fixtures/items/rare-basic.txt`, `tests/fixtures/items/rare-advanced.txt`, `tests/fixtures/items/waystone-basic.txt`, `tests/fixtures/items/waystone-advanced.txt`.
**Interface:** `parseItemText(text:string): ParsedItem`. ParsedItem retains original text, line-indexed sections, rarity/name/base/class, header facts, modifiers, annotations and unknown lines. ParsedModifier retains actual numeric slots separately from annotated bounds and explicitly supplied affix/tier information. No network required; 64 KiB UTF-8 limit.

- [ ] Write basic/advanced fixtures with Rarity Rare, Item Level 82, `+20(10-30)% to Fire Resistance`, `Adds 5(1-8) to 10(9-15) Fire Damage`, CRLF, decimal header `Attacks per Second: 1.50` and unknown line:
  ```ts
  expect(fire.actualRolls).toEqual([20]);
  expect(added.actualRolls).toEqual([5,10]);
  expect(parsed.itemLevel).toBe(82);
  expect(parsed.properties.attackRate).toBe(1.5);
  ```
  Assert separate annotation bounds, retained unknown text/order, explicit tier only when supplied, no mutation, and oversized input rejection.
- [ ] Run `bun test tests/item-text.test.ts`; expect missing-parser failure.
- [ ] Implement section-aware parsing with partial/unknown states. Include required attributes/level, quality, sockets, corruption and item-class fixtures; preserve separators and source line indices.
- [ ] Repeat the parser command; expect pass. Commit fixtures/parser.

## Task 2 — normalized modifier/base catalogue

**Files:** create `src/lib/game-data.ts`, `src/server/game-data/lua-literals.ts`, `src/server/game-data/pob-adapter.ts`, `scripts/prepare-game-data.ts`, `tests/game-data.test.ts`, generated `public/data/poe2-game-data.json` and attribution notice.
**Interfaces:** GameSnapshot has schemaVersion 1, immutable id, sourceRefs, verifiedAt, stats, bases, modifiers, regexDefinitions and currencyOperations. ModifierDefinition has stable id/category, optional affixType/name/requiredLevel/group, tags, ordered eligibilityRules, templates, numericSlots and tradeMappings. NumericSlot has index, scale 1/10/100, domain, unit and sign. Functions: `parseLuaLiterals(source):LiteralValue`, `normalizePobBundle(files,sourceRefs):GameSnapshot`, `validateGameSnapshot(raw):GameSnapshot`, `matchItemModifiers(item,snapshot):ModifierMatch[]`.

- [ ] Pin source fixtures: Strength1 suffix `(5-8)` level 1; Strength8 `(31-33)` level 74; ordered applicability/default rules; hybrid/two-roll entries; signed/decimal values. Assert stable IDs/groups, sorted bounds, template order, trade hashes, base tags and eligibility. Ambiguous tiers/types or missing base stay ambiguous.
- [ ] Run `bun test tests/game-data.test.ts`; expect missing-normalizer failure.
- [ ] Implement original literal extraction for PoB ModItem, relevant modifier files, Bases and TradeSiteStats at existing revision `bb52d6b368307457eb9c54bb13f1829993d390b1`. Reuse attribution. Parser accepts literal numbers/booleans, named/numeric keys and mixed tables; rejects execution, duplicate/prototype keys, nesting >32 or source >10 MiB. Keep unsupported records with diagnostic reasons; apply existing PoE2-only base scoping. Add malformed schema/checksum/unsupported-literal fixtures as well as positive metadata tests.
- [ ] Repeat the game-data tests, run `bun run scripts/prepare-game-data.ts` twice and assert equal IDs/content hashes for identical inputs; expect pass. Commit reproducible snapshot/notice and extraction code.

## Task 3 — immutable updates and selection

**Files:** create `src/server/game-data/service.ts`, `src/lib/game-data-store.ts`, `src/lib/game-data-cache.ts`, `src/components/game-data-status.tsx`, `tests/game-data-updates.test.ts`, `e2e/game-data-updates.spec.ts`; modify `src/app/api/[...path]/route.ts`, `src/components/settings.tsx`, `src/components/providers.tsx` and `src/server/public-data.ts` tree metadata.
**Interfaces:** async `checkGameDataUpdates():Promise<UpdateStatus>`, `stageGameSnapshot(sourceRevisions):Promise<GameSnapshot>`, `getGameSnapshot(id:string):Promise<GameSnapshot>`, browser `selectSnapshot(snapshot):Promise<void>` validates/caches before changing its active pointer. UpdateStatus distinguishes installed/upstream revisions, counts, check time, available/unsupported/offline states. Small manifests/preferences use recoverable local storage; immutable payloads use IndexedDB. Existing database persists snapshots when configured; fixed-source reconstruction/bundled fallback supports local development.

- [ ] Write assertions for failed schema/checksum/partial extraction/IndexedDB write: active snapshot id remains old; saved records stay byte-equivalent. Valid staging alone does not select it; explicit selection changes id; rollback restores old id. Upstream SHA change is source-update availability, not an invented patch version. Missing selected cached data fails visibly rather than silently choosing another version.
- [ ] Run `bun test tests/game-data-updates.test.ts`; expect missing-service/store failures.
- [ ] Add GET game-data/status and game-data/snapshot?id, same-origin/rate-limited POST game-data/check and game-data/stage. Registry fixes repos/paths, validates 40-hex revisions and retains checksum/licence/normalizer receipts. No caller URLs or code execution. Cache upstream checks one hour; use existing staging locks. Activation is per browser, never public global mutation. Test rejected arbitrary URLs/revisions, concurrency/rate limits and bounded payloads.
- [ ] Connect Settings check/stage/select/rollback, source/date/count/coverage and offline states. Expose GGG tree revision. Genesis updates remain unavailable until a newer graph passes its own adapter validation. Preserve older records as version-unrecorded; offer explicit revalidation for changed IDs.
- [ ] Run `bun test tests/game-data-updates.test.ts` and `bun run test:e2e e2e/game-data-updates.spec.ts --workers=2`; expect pass for mocked update/offline/reload/rollback and preserved libraries. Commit.

## Task 4 — coverage inventory and compiler integration

**Files:** create `docs/regex-coverage.md`, `src/lib/regex-catalogue-builder.ts`, `tests/regex-coverage.test.ts`, `tests/regex-numeric-slots.test.ts`, `e2e/regex-coverage.spec.ts`; modify `src/lib/regex-catalogue.ts`, `src/lib/regex-search.ts`, `src/lib/regex-schema.ts`, `src/lib/regex-item-test.ts`, `src/lib/regex-trade.ts`, `src/lib/regex-store.ts`, `src/components/regex-toolkit.tsx`.
**Interfaces:** define RegexCatalogue in the builder as snapshotId/modifiers/properties/categories using existing modifier/category types extended with slot metadata. `buildRegexCatalogue(snapshot:GameSnapshot):RegexCatalogue`; optional catalogue argument on compileRegexSearch/testRegexItem/prepareRegexTrade keeps bundled defaults. Selections gain optional slots map of RegexRange; old min/max remains slot 0. Metadata declares slot units/scale and exact/presence/average/unmapped trade semantics.

- [ ] Inventory Tablet, Relic, Vendor and Item reference controls/families at `4ae8978f28eb025aa14ba46fc2920c9358285f93`; map each to independently sourced definitions/formatting and a fixture. Document counts and exceptions; no reference code/dataset imports.
- [ ] Tests cover required/actual level, quality, sockets, classes/bases and damage/speed/skill families. Two-roll `Adds 5 to 10 Fire Damage` accepts slot0 minimum 5/slot1 maximum10, rejects `4 to10` and `5 to11`. Scale100 range `1.20..1.50` accepts 1.2/1.20/1.5/1.50, rejects1.19/1.51/11.2. Unknown precision stays presence-only; explicit maxima never round. Per-roll bounds on an average-only trade mapping block lossy handoff.
- [ ] Run `bun test tests/regex-coverage.test.ts tests/regex-numeric-slots.test.ts`; expect incomplete-coverage/missing-slot failures.
- [ ] Derive source-backed categories/families and exact numeric slot/decimal handling. Decimal intervals use scaled integers, explicit delimiters and mathematically valid optional trailing zeros; split whole/fraction bounds rather than enumerating large ranges. Shared parser/matcher drives item tests.
- [ ] Route consumers through active catalogue, preserve saved IDs and current Any/All/exclusion/literal/250-character rules. Collision checks include modifiers, headers and applicable base/class labels. Preserve complete over-budget output and unsupported IDs; source refs remain optional for old presets.
- [ ] Run `bun test tests/regex-coverage.test.ts tests/regex-numeric-slots.test.ts tests/regex-search.test.ts tests/regex-item-test.test.ts tests/regex-trade.test.ts tests/regex-store.test.ts tests/regex-presets.test.ts`; expect pass. Run `bun run test:e2e e2e/regex-coverage.spec.ts e2e/regex-waystone-parity.spec.ts e2e/regex-trade.spec.ts --workers=2` for desktop/mobile category controls, copied-query boundaries and saved preset compatibility; expect pass. Commit.

## Task 5 — inspector and transfers

**Files:** create `src/components/item-inspector.tsx`, `src/components/item-inspector.module.css`, `src/lib/item-transfer.ts`, `e2e/item-inspector.spec.ts`; modify `src/app/[section]/page.tsx`, `src/components/shell.tsx`, `src/components/dashboard.tsx`, `src/components/settings.tsx` and target regex/trade preview components.
**Interface:** ItemTransfer version1 retains itemText, snapshotId, recognized selections and unresolved facts. Handoffs are local typed data, not account writes.

- [ ] Browser regression: paste basic/advanced fixture, Analyse, inspect actual facts/rolls and unknown line, preview regex/trade, cancel without altering target draft; confirmed complete transfer retains every supported selected criterion. Oversized/offline failures retain original text.
- [ ] Run `bun run test:e2e e2e/item-inspector.spec.ts --workers=2`; expect missing-screen/action failure.
- [ ] Build /inspect cards/actions, manual paste and optional explicit clipboard access. Connect local transfers for later safety/crafting tasks; retain ambiguity and incomplete facts. Inspector analysis records snapshotId; saved presets record it optionally and older presets remain version-unrecorded.
- [ ] Run `bun run test:e2e e2e/item-inspector.spec.ts e2e/game-data-updates.spec.ts e2e/regex-toolkit.spec.ts e2e/regex-trade.spec.ts e2e/workspace.spec.ts --workers=2`; expect desktop/mobile pass. Run `bun run typecheck`, `bun run lint`, `bun run build`; expect zero failures/errors. Update docs and commit.

## Review focus

Compound-affix ambiguity; annotations mistaken for rolls; decimal suffix matches; executable/prototype source payloads; storage quota/partial staging; incompatible schemas; lossy average-stat transfer; stale-ID migration. Owning tasks above must exercise these.

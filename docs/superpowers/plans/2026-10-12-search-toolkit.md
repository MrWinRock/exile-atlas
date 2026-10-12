# Search Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. The user selected direct implementation in this chat, followed by a final independent review.

**Goal:** Add five English in-game search generators, portable presets, pasted-item testing, and complete supported trade handoff to Exile Atlas.

**Architecture:** Structured conditions drive a pure compiler, item tester, and trade adapter. A separate validated Zustand store owns generator drafts and presets. Client components integrate through the existing section router and shared app shell.

**Tech Stack:** Bun, installed Next.js App Router, React, TypeScript, Zustand, Zod, CSS Modules, Bun tests, Playwright. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-12-search-toolkit-design.md` (approved 2026-10-12).

## Global constraints

- Initial language: English. Generator categories: Waystones, Tablets, Relics, Vendor, Equipment.
- Route: `/regex`. Navigation label: **Search Toolkit**.
- Search budget: 250 characters, including copied quotes and spaces. Never silently truncate, round, drop conditions, or broaden intervals.
- Item tester limit: 64 KiB. Pasted text is transient and never uploaded or exported.
- Presets: at most 100; names trimmed to 1-120 characters; storage key `exile-atlas-regex-v1`.
- Import limit: 1 MiB, at most 100 presets, atomic validation before mutation, fresh imported IDs.
- Envelope: `{ format: "exile-atlas-regex", version: 1, presets: [...] }`.
- No new database tables, worker jobs, OAuth scopes, or runtime dependencies. Preserve Bun.
- Read the installed Next.js guides before product code. Use client boundaries and deferred store hydration already established in the repo.
- Genesis is a separate requested subsystem with its own design and plan; this plan does not add Genesis data to character builds or the regex store.

## Review focus

1. Numeric suffixes and multi-number modifiers: a threshold must constrain the intended number, not a longer number or an unrelated roll (Task 2).
2. English item text missing advanced headers: report unavailable properties instead of treating them as a successful match (Task 3).
3. Old/imported catalogue IDs: preserve the configuration, expose unsupported criteria, and block incomplete copy/handoff (Tasks 2, 4, 5).
4. Failed localStorage or Clipboard operations: retain the draft and report an actionable failure (Tasks 4, 6).
5. Existing trade draft: opening/canceling a preview cannot replace it; explicit transfer preserves saved searches (Tasks 5, 6).

## File and interface map

| File | Responsibility |
| --- | --- |
| `src/lib/regex-schema.ts` | Structured draft/preset types and validation schemas |
| `src/lib/regex-catalogue.ts` | Curated definitions, property domains, sources, trade mappings |
| `src/lib/regex-search.ts` | Normalization, validation, integer intervals, token generation |
| `src/lib/regex-item-test.ts` | Pasted text normalization and explained match outcomes |
| `src/lib/regex-presets.ts` | Pure persistence decoding and portable preset import/export |
| `src/lib/regex-store.ts` | Draft/preset actions and deferred browser persistence |
| `src/lib/regex-trade.ts` | Complete-or-blocked translation into `TradeDraft` |
| `src/components/regex-toolkit.tsx` | Page orchestration and generator controls |
| `src/components/regex-presets.tsx` | Library and import/export controls |
| `src/components/regex-item-tester.tsx` | Transient pasted-item test UI |
| `src/components/regex-trade-preview.tsx` | League, mapping summary, explicit draft transfer |
| `src/components/regex-toolkit.module.css` | Scoped responsive toolkit styling |
| `public/data/poe2-regex.NOTICE.md` | Catalogue provenance and applicable existing attribution |

Shared model definitions belong to `regex-schema.ts`:

```ts
type RegexCategory = "waystone" | "tablet" | "relic" | "vendor" | "equipment";
type RegexRange = { min: string; max: string };
type ModifierSelection = { id: string; min: string; max: string };
type RegexDraft = {
  category: RegexCategory;
  match: "any" | "all";
  wanted: ModifierSelection[];
  unwanted: ModifierSelection[];
  properties: Record<string, string | RegexRange>;
  text: string;
};
type RegexPreset = {
  id: string; name: string; draft: RegexDraft; favorite: boolean;
  createdAt: string; updatedAt: string;
};
```

## Task 1: Validated definitions and sourced initial catalogue

**Files:** Create `src/lib/regex-schema.ts`, `src/lib/regex-catalogue.ts`, `public/data/poe2-regex.NOTICE.md`, `tests/regex-catalogue.test.ts`.

**Interfaces:**
- Produces `createRegexDraft(category: RegexCategory): RegexDraft`, `regexDraftSchema`, `regexPresetSchema`.
- Produces `REGEX_CATEGORIES`, `REGEX_MODIFIERS`, `REGEX_PROPERTIES`, `REGEX_SOURCE`.
- A modifier definition contains `id`, `categories`, `label`, `template`, `numericSlot?`, `numericDomain?`, `tradeStatId?`, and `source`.
- A property definition contains `id`, `categories`, `label`, `kind`, optional `numericDomain`, item-text extraction information, optional `tradeField`, and `source`. Domains are explicit integer intervals from verified item text/data.

- [x] **Step 1: Add failing catalogue tests.** Assert five categories; unique stable definition IDs; nonempty usable modifier/property sets in every category; every selectable numeric condition has one identified slot and a bounded domain; every source has a URL and verification date. Assert mapped stat IDs exist in the pinned snapshot and preserve labels.
- [x] **Step 2: Run `bun test tests/regex-catalogue.test.ts`.** Expect failure because the new exports do not exist.
- [x] **Step 3: Implement the schemas and curated catalogue.** Read relevant installed Next.js guides. Use pinned `public/data/poe2-trade-stats.json` through JSON parsing, retaining its current notice. Known entries to verify include `explicit.stat_1890519597` (Monster Damage), `explicit.stat_3376488707` (maximum Player Resistances), `explicit.stat_2250533757` (Movement Speed), and `sanctum.stat_2287831219` (Honour Resistance). Inspect source text and class applicability before including any entry; do not bulk-convert pseudo or ambiguous stats. Add verified tablet effects, equipment life/mana/resistances, and waystone properties. Record source URLs/revisions and verification dates alongside definitions. Use full unambiguous text templates initially, with only proven shortening.
- [x] **Step 4: Run the catalogue tests and `bun run typecheck`.** Expect all tests and type checking to pass.
- [x] **Step 5: Commit the catalogue/schema deliverable with its tests and notice.**

## Task 2: Exact bounded in-game search compilation

**Files:** Create `src/lib/regex-search.ts`, `tests/regex-search.test.ts`, `tests/fixtures/regex-items.ts`.

**Interfaces:**
- Consumes Task 1's draft, definitions, and domains.
- Produces `integerRangePattern(min: number, max: number): string` and `compileRegexSearch(draft: RegexDraft): CompiledRegexSearch`.
- `SearchCondition` has `key`, `label`, `pattern`, `negative`, `source` (`header | modifier | property | text`), and optional `propertyId`.
- `SearchGroup` has `operator: "any" | "all"` and `conditions: SearchCondition[]`; groups combine with AND.
- `CompiledRegexSearch` has `text`, `length`, `limit`, `valid`, `copyable`, `errors: string[]`, and `groups: SearchGroup[]`.

- [x] **Step 1: Add failing range and semantic tests.** For intervals 0-0, 9-11, 19-21, 99-101, and signed negative intervals, assert every in-range integer matches and adjacent/out-of-range integers do not. A 10-20 modifier cannot match 110 or 200. Multi-number fixtures constrain only the defined slot. Assert literal `+`, `.`, `(`, `|`, quotes, and backslashes cannot introduce expressions or extra tokens.
- [x] **Step 2: Add compiler tests.** Assert Any joins wanted conditions into alternatives, All retains independent requirements, exclusions remain independent, and property restrictions always apply. Zero is retained. Reversed/fractional/nonfinite/out-of-domain values, contradictions, unknown properties/IDs, and cross-category conditions produce errors. Empty draft has empty output and `copyable === false`. Over-budget output is preserved exactly and `copyable === false`; no conditions disappear. Identical conditions deduplicate deterministically.
- [x] **Step 3: Run `bun test tests/regex-search.test.ts`.** Expect failure before implementation.
- [x] **Step 4: Implement range partitioning and compiler exports.** Partition integer ranges by sign and decimal prefix rather than enumerate unbounded values. Build numeric boundaries from the item's verified template delimiter so longer numbers cannot match. Generate conservative quoted positive tokens and negated tokens without lookarounds/backreferences. Independently verify quoted-token AND, pipe OR, and exclusion syntax using primary reference-tool behavior/source fixtures; record the inspected reference beside the tests. Do not import upstream application code. If a proposed control needs unsupported syntax, expose a validation error and leave it outside the active catalogue until verified.
- [x] **Step 5: Run catalogue/compiler tests and type checking.** Expect pass. Inspect match and nonmatch assertions, not just expression strings.
- [x] **Step 6: Commit the compiler with its tests and fixture provenance.**

## Task 3: Explained item-text matching

**Files:** Create `src/lib/regex-item-test.ts`, `tests/regex-item-test.test.ts`; extend `tests/fixtures/regex-items.ts`.

**Interfaces:**
- Consumes `compileRegexSearch` and its groups; uses Task 1's property extraction definitions.
- Produces `testRegexItem(draft: RegexDraft, text: string): RegexItemTestResult`.
- Result has `status: "match" | "no-match" | "incomplete" | "invalid"`, `conditions: { key: string; label: string; status: "pass" | "fail" | "unknown" }[]`, and `errors: string[]`.

- [x] **Step 1: Add failing behavior tests.** CRLF and LF versions of the same item agree; case changes agree; present and absent unwanted mods differ; Any passes when one wanted modifier matches; All fails when one is missing. Required unavailable headers give `incomplete`, while a definite failing group gives `no-match` despite an unrelated unknown. For Any, one passing choice resolves the group even when another is unknown.
- [x] **Step 2: Pin limits and failure cases.** Exactly 65,536 UTF-8 bytes are accepted; 65,537 are rejected. A multibyte fixture verifies bytes rather than string length. Invalid draft returns `invalid`. Incomplete property/header text never produces `match` when needed. Sourced item fixtures document URLs and dates; synthetic fixtures are labeled.
- [x] **Step 3: Run `bun test tests/regex-item-test.test.ts`.** Expect failure.
- [x] **Step 4: Implement `testRegexItem` and its private normalization/extraction helpers.** Evaluate compiled groups over verified searchable lines and known properties; preserve three-state group semantics. Keep user text transient and run only bounded generated patterns.
- [x] **Step 5: Run all three regex unit suites and type checking.** Expect pass.
- [x] **Step 6: Commit item testing with fixtures and tests.**

## Task 4: Portable presets and robust browser persistence

**Files:** Create `src/lib/regex-presets.ts`, `src/lib/regex-store.ts`, `tests/regex-presets.test.ts`, `tests/regex-store.test.ts`.

**Interfaces:**
- Consumes Task 1's models/schemas and Task 2's compilation results.
- Produces `parseRegexPresetImport(text: string, currentCount: number): RegexPreset[]`, `exportRegexPresets(presets: RegexPreset[]): string`, and `decodeRegexState(raw: unknown): { drafts: Partial<Record<RegexCategory, RegexDraft>>; presets: RegexPreset[]; activeTab: RegexCategory | "presets"; warnings: string[] }`.
- Store `useRegexWorkspace` exposes `drafts`, `presets`, `activeTab`, `warning`, `setDraft(draft)`, `setActiveTab(tab)`, `savePreset(name, category, id?)`, `loadPreset(id)`, `renamePreset(id, name)`, `duplicatePreset(id)`, `toggleFavorite(id)`, `deletePreset(id)`, `importPresets(text)`, and `clearAll()`.
- Actions that can fail return `{ ok: boolean; error?: string }`. Save/update returns `id?: string` too. Save without an ID creates a UUID; update preserves identity/creation time.

- [x] **Step 1: Add failing pure import/export tests.** Assert format/version, trimmed valid names, roundtrip preservation of conditions/favorites, fresh IDs on import, and atomic rejection of malformed JSON, unsupported version/category, invalid timestamps/ranges, 1 MiB overflow, and total capacity over 100. Preserve unknown catalogue IDs for visible remediation rather than dropping them.
- [x] **Step 2: Add store tests with isolated in-memory storage.** Assert updates preserve creation time; duplicates have new IDs; loading updates the intended draft/tab; clearing removes all regex drafts/presets; individual invalid persisted presets do not discard valid neighbors. Inject a throwing storage backend and assert actions preserve current memory state plus a recoverable warning. Test late hydration never replaces action functions.
- [x] **Step 3: Run `bun test tests/regex-presets.test.ts tests/regex-store.test.ts`.** Expect failure.
- [x] **Step 4: Implement pure validation and the store.** Use Zod structural validation plus semantic draft validation; unknown catalogue IDs and over-budget expressions can be saved/imported as editable configurations, but invalid ranges cannot. Use `skipHydration: true` and validated merge; catch persistence failures. Enforce the capacity before appending imported records, with no partial mutation.
- [x] **Step 5: Run the regex suites and type checking.** Expect pass.
- [x] **Step 6: Commit persistence and portable presets.**

## Task 5: Complete trade translation

**Files:** Create `src/lib/regex-trade.ts`, `tests/regex-trade.test.ts`.

**Interfaces:**
- Consumes Task 1 definitions and existing `createTradeDraft`, `validateTradeDraft`, and `tradeSummary` from `src/lib/trade-search.ts`.
- Produces `prepareRegexTrade(draft: RegexDraft, league: string): { draft: TradeDraft; supported: string[]; unsupported: string[]; errors: string[]; ready: boolean }`.

- [x] **Step 1: Add failing mapping tests.** Assert waystone/tablet/relic categories, wanted And/Or groups, Not exclusions with numeric bounds, verified property fields, rarity/state, and preserved zero boundaries. Assert missing league, additional literal text without an exact mapping, unknown definitions, and unmapped active criteria set `ready === false`. A valid mapping passes `validateTradeDraft`.
- [x] **Step 2: Test immutability.** Freeze the input draft and unrelated existing trade state; preview generation must not mutate either. Exclusion semantics must match compiler semantics, including conditional numeric exclusion rather than whole-mod exclusion.
- [x] **Step 3: Run `bun test tests/regex-trade.test.ts`.** Expect failure.
- [x] **Step 4: Implement `prepareRegexTrade`.** Read explicit mapping metadata; initialize a fresh trade draft, attach the chosen league, and map only equivalent supported conditions. Build a full unsupported list and block handoff when it is nonempty. Deduplicate identical mapped criteria. Do not guess that a substring item search is an exact name/base trade filter; such text blocks transfer unless an exact equivalence is verified.
- [x] **Step 5: Run regex suites plus `bun test tests/trade-search.test.ts`.** Expect pass.
- [x] **Step 6: Commit the adapter and tests.**

## Task 6: Generator, presets, tester, and trade preview UI

**Files:** Create the five components and scoped stylesheet in the file map; create `e2e/regex-toolkit.spec.ts`, `e2e/regex-presets.spec.ts`, `e2e/regex-trade.spec.ts`. Modify `src/app/[section]/page.tsx`, `src/components/providers.tsx`.

**Interfaces:**
- `RegexToolkit()` consumes `useRegexWorkspace` and owns transient test text/preview visibility.
- `RegexPresets()` consumes the store and pure import/export helpers.
- `RegexItemTester({ draft }: { draft: RegexDraft })` consumes `testRegexItem`.
- `RegexTradePreview({ draft, onClose }: { draft: RegexDraft; onClose: () => void })` consumes `prepareRegexTrade`; only Use these filters calls existing `useTradeWorkspace.getState().setDraft` and navigates to `/trade`.

- [x] **Step 1: Add failing browser tests.** Every tab exposes usable controls and a labeled output; numeric changes update output and count; copy succeeds only after confirmed Clipboard completion; failed Clipboard leaves selectable output and feedback. Save a configuration, reload, edit/update/duplicate/favorite/delete, then verify library order and category/name filtering. Import/export through real file chooser/download events, including malformed and oversized files with no mutation.
- [x] **Step 2: Add tester and transfer tests.** Assert explained Match/No match/Incomplete states; pasted text is absent from storage/export. Opening and canceling preview preserves a seeded existing trade draft and saved searches. Unsupported criteria disable transfer with a visible explanation. Valid explicit transfer replaces only the draft and opens `/trade` with the selected league/criteria.
- [x] **Step 3: Run `bun run test:e2e -- e2e/regex-toolkit.spec.ts e2e/regex-presets.spec.ts e2e/regex-trade.spec.ts`.** Expect failures because `/regex` is not implemented.
- [x] **Step 4: Implement the components and route/hydration integration.** Apply the frontend-design skill within the existing visual system. Use native labeled inputs and shared `Button`, `Field`, `Notice`, and `PageTitle`; make tabs keyboard accessible, associate validation messages, and debounce polite output announcements without hiding the current result. Keep draft names, test text, and dialog inputs scoped to their owners. Reset affects only the current category. Copy blocks invalid/over-budget/empty output. Saved over-budget and unknown-ID presets expose adjustment warnings. Catch file, Clipboard, download, and storage failures. Show provenance/version details and the catalogue notice link.
- [x] **Step 5: Run the three new Playwright files for desktop/mobile, regex unit tests, type checking, and lint.** Expect pass; verify keyboard access and no page-width overflow at 390px.
- [x] **Step 6: Commit the integrated toolkit UI with browser tests.**

## Task 7: Workspace discoverability and Settings clear behavior

**Files:** Modify `src/components/shell.tsx`, `src/components/dashboard.tsx`, `src/components/settings.tsx`, `README.md`; extend `e2e/workspace.spec.ts` and `e2e/regex-presets.spec.ts`.

**Interfaces:** Consumes `useRegexWorkspace.presets`, `.drafts`, `.clearAll()`; leaves other stores' APIs intact.

- [x] **Step 1: Add failing browser assertions.** Main navigation links to `/regex` with the correct active state; dashboard count equals saved preset count. Settings displays regex counts and lets the existing confirmed clear action clear the new store. Cancel preserves it. With `/api/status` failing, local preset information and clear controls remain available.
- [x] **Step 2: Run the changed browser files.** Expect failures for missing navigation/dashboard/Settings behaviors.
- [x] **Step 3: Implement integration.** Add Search Toolkit navigation and dashboard card/count. Place browser workspace management independently of account/status success so local tools remain usable. Extend the existing confirmed clear callback with `clearAll()` while preserving other store clearing. Document features, English/snapshot scope, import limits, and game-client verification limits in README.
- [x] **Step 4: Run affected browser tests, `bun run test`, `bun run typecheck`, and `bun run lint`.** Expect pass.
- [x] **Step 5: Commit workspace integration and documentation.**

## Task 8: Final verification and independent review

**Files:** Modify product/tests only to resolve verified findings; record delivery evidence in `docs/implementation-log.md`.

- [x] **Step 1: Run `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`.** All must pass; use systematic-debugging for any failure before proposing a fix.
- [x] **Step 2: Run the new regex Playwright files plus affected workspace/trade files on desktop/mobile.** Every selected test must pass.
- [x] **Step 3: Inspect desktop and 390px mobile with long names, errors, over-budget output, preset management, item test results, handoff preview, and keyboard navigation.** Verify no console errors or page overflow. Document fixture-based checks separately from live game verification.
- [x] **Step 4: Request one independent whole-change code review using the requesting-code-review skill.** Review against this plan and the approved spec, including the five review-focus cases. Resolve actionable findings and rerun only the checks affected by new fixes.
- [x] **Step 5: Record actual verification results and limitations, then commit final corrections/evidence.** Inspect `git diff --check` and repository state. Never claim live in-game compatibility, account integration, or upstream freshness from browser/unit tests alone.

## Plan self-review

The compiler, tester, store, handoff, interface, workspace integration, and
verification tasks cover every approved spec section. Shared names and shapes
are defined above their consumers. The five review-focus cases have explicit
tests in their owning tasks. Genesis remains a separate design so its graph/data
requirements cannot delay the independently useful Search Toolkit delivery.

Execution method is recorded as direct implementation in this chat with a final
independent review. Implementation begins after the user reviews this written
plan.

# Exile Atlas Search Toolkit

Date: 2026-10-12

## Intent and approved scope

The user wants Exile Atlas to become an all-in-one personal Path of Exile 2
companion, starting with regex tools and saved presets. The user approved the
in-chat design on 2026-10-12. This document makes that design concrete for review
before implementation planning.

The first delivery adds one integrated Search Toolkit. Subsequent companion
features are a roadmap, not acceptance requirements for this delivery.

Success means a player can configure an English in-game search, copy it, check
its behavior against pasted item text, save it for later, and prepare supported
criteria in the existing trade editor without account credentials or a database.

## Product scope

Add `/regex` to the existing section router, with the navigation label
**Search Toolkit**. Provide five generator tabs: Waystones, Tablets, Relics,
Vendor, and Equipment. A Presets view provides a searchable saved library.

All generators share these controls where applicable:

- Wanted modifiers, combined using Any or All.
- Unwanted modifiers, each excluded independently.
- Optional numeric minimum and maximum for supported properties/modifiers.
- Item/base text, rarity, and corruption state where meaningful for the category.
- Additional literal text, escaped as text rather than executed as custom regex.

Waystones additionally expose tier, revives, item rarity yield, pack size,
monster effectiveness, monster rarity, and waystone drop chance. Tablet and relic
controls expose a curated, sourced modifier list for their category. Vendor and
Equipment expose item/base text, rarity, and verified searchable item properties,
including movement speed, life, mana, resistances, and sockets where supported by
the item text. Controls are omitted when their search semantics cannot be
established; the interface must not suggest that every trade property is present
in in-game searchable text.

Display generated search text, its character count, validation messages, Copy,
Reset, Save preset, and Prepare trade. A compact result panel stays visible on
desktop; mobile stacks controls and output without horizontal scrolling.
Reset clears the current generator and leaves saved presets intact.

The initial language is English. Pasted item text stays in component state and is
not saved, uploaded, or included in preset exports.

## Search semantics and compiler

Represent user choices as structured conditions independent of presentation,
compiled text, and trade queries. Each condition refers to a stable catalogue ID
or a known property ID. Store values as editable strings; validate before
compilation so blank, zero, and invalid values remain distinguishable.

Property restrictions combine with AND. Wanted modifiers combine using the
selected Any/All mode. Every unwanted modifier contributes an exclusion. An
unwanted modifier without numeric bounds excludes its presence; with bounds it
excludes matching occurrences within that interval. Wanted numeric modifiers
must be present and satisfy the selected inclusive interval. If a property and a
modifier describe the same feature, detect conflicting settings explicitly.

Generate the game's quoted search tokens, alternatives, and exclusions using a
documented, conservative syntax subset. Do not generate JavaScript lookarounds,
backreferences, or other constructs merely because the browser supports them.
Verify token/exclusion behavior against the reference tool's public behavior
and published fixtures before labeling output as game-compatible. Automated
browser verification cannot establish behavior inside the running game; report
that limitation in the delivery notes.

Numeric range compilation must be bounded and deterministic. Support finite
integer values within each property's documented domain. Modifier definitions
specify numeric capture position, sign, and units; a modifier with multiple
numbers cannot use an arbitrary first number. Reject unsupported fractional
range conditions with a field-level explanation. Escape user literals, anchor
numeric boundaries, deduplicate identical conditions, and preserve meaning when
shortening expressions. Do not truncate text, round thresholds, drop conditions,
or broaden ranges automatically.

Use an initial 250-character search budget, matching the reference tool's
displayed budget. Keep the limit as one named compiler constant. Count the
complete copied search, including quotes and spaces. Over-budget output remains
visible with an explanation and Copy is disabled; users can remove conditions.
Saving an over-budget configuration is allowed when its structured conditions
are otherwise valid. The preset list marks it as needing adjustment.

Opposed rarity/state selections, reversed ranges, invalid numbers, unknown IDs,
or the same modifier both wanted and unwanted produce explicit errors. An empty
configuration explains that it imposes no restrictions and has no copyable text.

## Pasted-item tester

Provide a labeled textarea and an explicit Test item action. Normalize CRLF/LF
and match case-insensitively. Evaluate the same normalized conditions and token
semantics used by the generator, instead of treating the complete quoted search
as a single JavaScript regular expression. Show Match, No match, or Incomplete
item text, plus a condition-by-condition explanation.

Distinguish an absent modifier from an unavailable property. For example, a
modifier absence can satisfy an exclusion, while an unavailable item-level
property cannot prove that an item-level range passes. Missing class/header
information or omitted advanced properties must be reported as unknown when
needed. A definite failing condition yields No match; otherwise unresolved
required conditions yield Incomplete item text.

Enforce a 64 KiB input limit. Only generated, bounded expressions run during
testing. Arbitrary user regex execution is outside the first delivery.

## Catalogue and provenance

Build the initial curated catalogue from the repository's existing pinned PoE2
trade-stat snapshot and verified property/item text. Preserve full display labels
and original trade stat IDs when an exact supported mapping exists. Pseudo,
calculated, legacy, or class-ambiguous entries must not automatically become
in-game search options.

Each definition has a stable ID, category, full label, search text template,
optional numeric semantics, optional trade mapping, and source metadata.
Metadata records source URL, source revision when available, and verification
date. Include an attribution notice and show the catalogue verification date in
the toolkit. A source revision is not a claim that every modifier is current in
the running game. If a modifier cannot be verified, leave it outside the active
catalogue rather than exposing guessed output.

Use poe2.re as product inspiration. Implement the compiler and interface within
this repository; do not import its application source or generated datasets
without establishing applicable reuse terms. Existing pinned PoB data retains
its current attribution and license notice.

## Presets and persistence

Add a dedicated persisted Zustand store following the existing deferred
hydration pattern. Storage key: `exile-atlas-regex-v1`. It owns current drafts
per generator, active tab, and up to 100 user presets. It does not own workspace
builds, trade drafts, account state, or currency favorites.

A preset contains an ID, trimmed name (1-120 characters), category, structured
conditions, favorite flag, and ISO creation/update timestamps. Actions: create,
load, update, rename, duplicate, toggle favorite, and delete. Duplicating assigns
a new UUID and creation timestamp. Favorited presets sort first, followed by most
recently updated; users can filter by category and search by name. Loading a
preset updates its generator draft and selected tab without saving changes to
the preset until the user presses Update preset.

Validate persisted state with Zod before merging it with the store's actions.
Invalid drafts fall back to empty drafts. Preserve individually valid presets
while ignoring invalid stored records and show a recoverable storage warning.
Unknown catalogue IDs remain visible as unsupported criteria and block generated
copy/trade handoff until removed; never silently omit them from a search.

Export one preset or all presets in a versioned JSON envelope:
`{ format: "exile-atlas-regex", version: 1, presets: [...] }`.
Exports contain structured configurations, not arbitrary executable code or
cached expressions. Import accepts at most 1 MiB and 100 presets; validate the
entire file before mutation. Report unsupported versions, unknown categories,
invalid ranges/records, and capacity overflow without changing existing data.
Imported presets receive fresh IDs, preserve names/favorites, and append to the
library. Re-importing creates copies intentionally; no existing preset is
overwritten. Unknown modifier IDs are retained as unsupported criteria with a
warning, using the same behavior as persisted records.

Clipboard success appears only after the browser confirms the write. On failure,
retain selectable output and explain how to copy manually. Download/import and
storage errors produce recoverable messages without deleting the current draft.

## Trade handoff

Translate structured conditions through a separate pure adapter into the existing
`TradeDraft` format. Do not translate the generated regex string itself.
Categories use existing verified values such as `map.waystone`, `map.tablet`,
and `sanctum.relic`. Match Any/All uses existing Or/And stat groups; exclusions
use Not groups. Transfer property ranges and states only when an existing
supported trade field represents the same condition.

Require the player to select a league in the handoff preview. Show supported
criteria, unsupported criteria, and the prepared draft summary. If an active
criterion has no mapping, disable Use these filters and explain that the player
must remove it or use the in-game search. Do not silently launch a weaker search.
Validate the prepared draft with `validateTradeDraft`.

Opening the preview does not alter the existing trade draft. The explicit Use
these filters action replaces that draft and navigates to `/trade`. Saved trade
searches are preserved. The existing Search on official trade action continues to
handle the external browser handoff. Price estimates, listing retrieval, seller
contact, and automatic trade execution are outside this feature.

## Integration and implementation boundaries

Use focused modules for catalogue/schema, condition normalization and compiler,
item testing, trade translation, and persistence. Suggested paths:

- `src/lib/regex-catalogue.ts`, `regex-search.ts`, `regex-item-test.ts`,
  `regex-trade.ts`, and `regex-store.ts`.
- `src/components/regex-toolkit.tsx` and focused preset/tester/handoff components,
  with a scoped CSS module using the app's established colors and spacing.
- Existing section router, Shell, Dashboard, Providers, and Settings integration.
- Bun unit tests in `tests/` and browser tests in `e2e/`.

Add a dashboard card and saved-preset count. Settings includes regex preset/draft
counts and clears the new store when the user confirms the existing clear-data
action. Keep access to local presets available when account/status requests fail.
Catalogue loading must not depend on GGG account services. Maintain keyboard
access, field labels, clear validation associations, live result announcements,
and visible focus styling.

No new database tables, worker jobs, OAuth scopes, or runtime dependencies are
required. Follow the installed Next.js documentation for client boundaries,
dynamic route params, and navigation. Preserve the project's Bun runtime.

## Acceptance and verification

1. Every generator has verified usable conditions and produces bounded output
   with accurate wanted/unwanted, Any/All, property, and inclusive-range behavior.
2. Unit tests cover literal escaping, token composition, numeric boundary
   matches/nonmatches, multiple numeric fields, contradictions, empty searches,
   over-budget handling, and unsupported IDs. Test intended match behavior as
   well as serialization; snapshots alone are insufficient.
3. Item tests cover CRLF/LF, case differences, present/absent modifiers, unavailable
   properties, condition explanations, and input limits. Label synthetic item
   fixtures as fixtures; include sourced text fixtures for supported definitions.
4. Preset tests cover persistence validation, versioned roundtrips, failed imports
   with no mutation, capacity limits, and identity behavior when importing copies.
5. Trade tests prove complete mappings and blocking of unsupported conditions,
   correct stat-group logic, range/state mapping, and no mutation before transfer.
6. Browser tests cover tab navigation, copy feedback/failure, save/reload/edit/
   duplicate/favorite/delete, import/export, item testing, trade preview/transfer,
   and Settings clear behavior in isolated contexts.
7. Inspect desktop and 390px mobile layouts, including a long saved name,
   over-budget output, validation errors, and keyboard use. No page overflow.
8. Run `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`, and
   the relevant desktop/mobile Playwright tests. Report any game-client validation
   or live upstream verification that could not be performed.

## Companion roadmap after this delivery

- Whole-workspace backup and restore across builds, filters, planner allocations,
  trade searches, currency favorites, and regex presets.
- Build-linked shopping lists that reuse existing saved trade searches.
- Currency conversion and personal watchlists based on the existing hourly data.
- A dedicated pasted-item inspection workspace, with sourced property extraction.
- Personal progression/endgame checklists, stored locally.

Each follow-up receives its own concrete scope and acceptance criteria. This
delivery does not claim DPS calculation, live item valuation, stash integration,
or server synchronization.

## References

- [poe2.re waystone generator](https://poe2.re/waystone): reference controls,
  output budgeting, and preset-oriented workflow; inspected 2026-10-12.
- [poe.re/poe2.re repository](https://github.com/veiset/poe.re): confirms the five
  PoE2 generator categories; inspected 2026-10-12.
- Existing `public/data/poe2-trade-stats.NOTICE.md`: pinned snapshot
  `bb52d6b368307457eb9c54bb13f1829993d390b1` and attribution.
- Existing `src/lib/trade-search.ts`, `trade-store.ts`, `workspace-store.ts`, and
  `src/components/providers.tsx`: integration patterns and verified trade fields.
- Installed Next.js guides:
  `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  and `03-layouts-and-pages.md`.

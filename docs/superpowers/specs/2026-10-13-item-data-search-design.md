# Item inspection, data versions, and regex coverage

Parent scope: [browser companion roadmap](2026-10-13-web-companion-roadmap.md).

## Item inspector

Add `/inspect` with a paste area for basic or advanced English item text and an
explicit Analyse action. A user-initiated clipboard button may be available when
the browser permits it; manual paste always works. Enforce a 64 KiB UTF-8 limit.

Parse rarity, name/base, item class, item level, required level/attributes,
quality, sockets, corruption, header properties, and modifier sections. Preserve
original text, separators, annotations, source line positions, and unrecognized
lines. Normalize CRLF without discarding content. Treat item text as data.

For each stat show actual roll(s), explicitly supplied roll-range annotations,
and matching sourced stat identities. Distinguish exact, ambiguous, and unknown
matches. Prefix/suffix, tier, modifier group, and craftability are shown only
when the advanced text or verified class/base-aware data establishes them.
Never infer a tier or prefix/suffix solely from a familiar stat label.

Provide a readable item card and actions to prepare a regex or trade preview,
send a Waystone to safety checking, and send an eligible item to the workbench.
Transfers preserve complete supported criteria; ambiguity or unmapped criteria
require review instead of weakening the search. Analysis stays local.

The reusable parser/matcher is shared with regex item tests and downstream tools.

The existing pinned PoB `src/Data/ModItem.lua` provides affix type/name, item-level
requirements, modifier groups, tags, applicability keys, roll ranges, and trade
hashes; `src/Data/Bases/` supplies the corresponding base definitions. Start with
these existing licensed sources and retain their attribution. Parse literal data
without running Lua. Keep tier numbers unknown unless directly supplied or
established by an explicitly validated tier mapping for the selected base.

## Complete regex coverage

Keep the five existing categories and all current saved IDs. Bring Tablets,
Relics, Vendor, and Equipment to the verified English control/modifier coverage
of their published reference category at a recorded source revision. This is a
defined reference-coverage target, not a claim about undiscovered future modifiers.

Create a coverage inventory comparing reference controls and independently
sourced supported definitions before implementing each category. Use the existing
pinned PoB export and suitably licensed factual game exports. Do not distribute
reference application code or datasets without established reuse terms.

Tablets/relics gain all verified category effects and meaningful numeric controls.
Vendor/equipment gain sourced base/item-class selection, item/required levels,
quality/socket properties, resistances, attributes, life/mana/spirit, movement,
attack/cast speed, relevant damage types, and skill-level families where the
reference provides them. Equipment exposes the reference item modifier families
and base matching. A broad family selection must be labeled as a family.

Multi-roll and signed modifiers retain the selected numeric slot(s). Decimal
properties are supported only with a declared scale/unit and verified formatting;
no rounding happens silently. Explicit minimums/maximums remain exact unless the
user deliberately enables the existing positive-minimum rounding option.

Keep Any/All, grouped exclusions, literal escaping, compact copied tokens, local
item tests, and previews. Fragment collision checks include category modifiers,
headers, and applicable base/class labels. Keep long, exact patterns when a short
fragment cannot be verified. Disable copying rather than truncate or drop criteria.

## Patch-aware data

Add a Data status view under Settings, showing each dataset's source, revision,
verified/fetched time, installed record count, upstream-check result, and coverage.
Distinguish an upstream source revision change from a confirmed game patch version.
Do not invent a game version from a repository timestamp.

An explicit **Check for updates** action uses the existing web server to compare
public upstream revisions, with caching/rate-limit handling. Failure/offline state
retains the last verified data and reports the failed check without destroying drafts.

Allow refreshing datasets with a verified JSON/literal extraction adapter, fixed
source allowlist, source/licence metadata, integrity checks, and stable-ID validation.
No fetched Lua/JavaScript is executed. Stage and validate a complete snapshot before
making it active; retain the previous snapshot for rollback. Unsupported extraction
changes are reported as update unavailable until the adapter is updated.

All consumers use the same selected immutable snapshot through a shared catalogue
interface. Record snapshot references on new saved analyses, presets, safety rules,
and recipes; older records remain readable and are labeled as version unrecorded.
On a new snapshot show removed/changed/unknown referenced IDs and offer explicit
revalidation. Never silently rewrite a saved recipe, allocation, or search criterion.

The passive tree already fetches a live GGG export; expose its revision and check
allocations against that version. Genesis retains its historical label until a
current extraction passes its graph/source integrity checks.

## Acceptance and boundaries

- Basic/advanced fixtures agree on actual rolls; annotations never become rolls.
- Unknown or compound lines remain visible and complete through transfers.
- Each category has a documented control/modifier inventory, stable identities,
  correct numeric semantics, and copied-token collision/boundary fixtures.
- Same item/snapshot gives consistent inspector, regex, and downstream results.
- Invalid, oversized, changed-schema, offline, and partial-update cases preserve
  the last valid data and existing saved records.
- This subsystem does not estimate live item prices or calculate character DPS.


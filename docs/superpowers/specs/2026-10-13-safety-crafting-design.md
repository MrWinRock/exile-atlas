# Browser map safety and crafting recipes

Depends on [item/data/search](2026-10-13-item-data-search-design.md).

## Map safety checker

Add `/safety`: paste or transfer a Waystone, choose a named saved build-risk
profile, and evaluate its recognized modifiers. Profile input is explicit user
information: relevant build traits, recovery/defence weaknesses, and modifier
rules with severity and optional numeric thresholds. Existing build notes/items
can be references; do not pretend the current build format calculates defences.

Results separate **avoid**, **caution**, and **no flagged known condition**;
unknown modifiers or incomplete profile/item data stay visibly **needs review**.
Explain each finding with the actual matched roll, selected rule, and build trait.
Do not describe an incomplete result as safe or predict survival.

Support combination rules over multiple known modifiers, with clear, inspectable
conditions rather than an unexplained universal risk score. Users can adjust the
rules and save profiles. Warn when referenced data IDs change between snapshots.

Generate an avoid regex from representable profile rules and preview its supported
coverage. If a combination/rule cannot be faithfully represented, show it and
block a complete transfer until the user explicitly chooses a reduced rule set.
Keep item-level safety analysis and generated stash search distinct in the UI.

Profiles and user-added rules persist locally and support versioned JSON
export/import with atomic validation, bounded size/count, and fresh imported IDs.

## Crafting workbench: recipes first

Add `/crafting`: select/paste a base item, inspect the applicable verified modifier
pool, choose target modifiers, and create a named sequence of crafting steps.
The user explicitly chose this over probability simulation for the first release.

Pool browsing filters by sourced base/item class, item level, prefix/suffix,
modifier group, tags, and available tiers/ranges. Keep uncertain or unsupported
eligibility visible; do not infer it from a trade label alone. Include source
revision with the pool and require revalidation after applicable data changes.

Each recipe records starting item/base, targets, source version, ordered currency
or manual steps, quantity, editable unit costs, notes, and total budget. Currency
effects and basic preconditions must be sourced and displayed. A planned random
step shows possible effects; it does not manufacture a guaranteed resulting roll
or claim that the user's actual item has changed.

Costs can be entered manually or filled from the existing completed-hour currency
data, with league, quote currency, and timestamp. Retain raw currency quantities.
Convert only when a usable price exists; missing/invalid prices stay unpriced and
do not become zero. Totals distinguish priced subtotal from complete budget.

Support rearrange/duplicate/remove steps, actual spend entries, budget comparison,
recipe duplicate/favorite, and JSON export/import. Preserve recipes across refresh.
Link selected Genesis planning effects as a reference to a saved Genesis plan;
retain its historical/version label and do not simulate unverified choice rules.

## Acceptance and boundaries

- Safety rules evaluate actual rolls, exclusions, unknown lines, and multi-mod
  combinations; every result explains why it was flagged or needs review.
- Profile/recipe imports reject malformed files without losing the current library.
- Modifier pool eligibility distinguishes established matches from unknown cases.
- Recipe currency effects/preconditions are sourced; random outcomes are never
  displayed as guaranteed or applied to a real item.
- Budget math preserves mixed currencies, quantities, timestamps, and incomplete
  quotes; manually overridden costs remain explicit.
- No client installation, game automation, trading automation, live price promises,
  probability calculator, or profit guarantee is part of this release.


# Requirements Analysis

## Intent Analysis

Exile Atlas players should be able to start Tablet and Relic searches from a preset that matches their goal. On Currency, they should be able to convert amounts in either direction and read a single price for each item in the selected completed hour. A price is available when the feed reports one consistent rate for that pair. [desc] [Q1] [Q2] [revision]

## Functional Requirements

### Regex Toolkit

- **FR1 — Tablet presets.** The Tablet tab shows a small set of at least two named recommendations with distinct goals. Each recommendation identifies its goal and applies Tablet search criteria when selected. [desc] [Q1]
- **FR2 — Relic presets.** The Relic tab shows a small set of at least two named recommendations with distinct goals. Each recommendation identifies its goal and applies Relic search criteria when selected. [desc] [Q1]
- **FR3 — Editable, valid criteria.** Applying a recommendation updates the active category draft and its generated search. The player can inspect and edit the criteria and copy the result through the existing workflow. A recommendation can apply only when its criteria resolve in the active catalogue. The other category drafts retain their selections. [Q1] [kb]

### Currency

- **FR4 — One rate in the pair comparison.** For a selected pair, league, and completed hour, show one decimal per-item rate when both reported bounds yield the same positive, finite ratio. Include both units, for example `1 A = 0.2 B`. Determine whether the two bounds agree before display rounding. [desc] [Q2] [kb]
- **FR5 — One price per market row.** The Price cell shows one exchange expression under the same rate-availability rule as the comparison. For a rate of at least one quote unit per item, show quote units per item. For a rate below one quote unit per item, show `x ↔ 1 [currency logo]`, with the number of row items on the left and exactly one unit of the quote currency and its logo on the right. Choose the display direction from the unrounded rate. For differing, incomplete, or unusable bounds, the table and comparison show that a single rate is unavailable for that hour. A missing direct market continues to use the existing no-market state. [desc] [Q2] [revision] [kb]
- **FR6 — Swap and bidirectional quantity calculation.** Swapping a pair with a usable rate shows its reciprocal. Both quantity fields are editable. A valid amount entered on the left automatically converts to the right, and a valid amount entered on the right automatically converts to the left, using the same unrounded rate. The amount being edited drives the conversion. When the entered amount is invalid or the pair has no single rate, the calculated result is unavailable. [desc] [Q2] [revision] [kb]

## Non-Functional Requirements

- **NFR1 — Consistent presentation.** For the same pair, league, and hour, the comparison and market row agree on rate availability. Positive values smaller than the default display precision remain visibly nonzero. Each quantity input, price direction, and unavailable state has a readable label accessible to assistive technology. [desc] [Q2] [revision]

## Acceptance Checks

- The Tablet and Relic tabs each offer multiple presets. Applying a valid preset populates that tab's editable draft and changes its compiled search. An incompatible catalogue cannot produce an invalid search from the preset. [FR1] [FR2] [FR3]
- When the feed reports `1 A = 0.2 B`, the comparison shows that rate, and the row for A shows `5 ↔ 1 [B logo]` as its only price. The accessible label identifies five A and one B. The row shows `1 B per A` for a rate of exactly one and `2 B per A` for a rate of two. [FR4] [FR5] [NFR1]
- With `1 A = 0.2 B` in the comparison, entering ten A on the left calculates two B on the right. Editing the right field to three B calculates fifteen A on the left. Swapping the displayed pair shows `1 B = 5 A`. [FR6]
- Distinct ratios that round to the same text, a single usable bound, and a change to another hour with unequal bounds all yield an unavailable rate and quantity. With a valid rate, clearing either field clears the calculated amount. [FR4] [FR5] [FR6]
- A small valid rate remains readable and nonzero. The currency units and unavailable states can be read without relying on icons. [NFR1]

## Constraints

- Use the active Regex catalogue and existing search compiler. Keep the existing completed-hour Currency data source and source bounds available to their existing consumers. [kb]

## Assumptions & Open Questions

- [assumption] Goal names and modifier selections will be chosen from the supported Tablet and Relic catalogue during implementation.
- [assumption] The exact-rate rule applies to quotes and quantity totals for the selected hour. The separately labeled historical trends continue to use their current midpoint calculation.
- No open requirements questions.

## Out of Scope

- New price feeds, changes to historical trend metrics or JSON export, and changes to crafting market estimates.
- Changes to Waystone, Vendor, or Equipment recommendations.

## Sources

- [desc] Initial description: add Tablet and Relic recommendations in `/regex` and show a single decimal per-item conversion in `/currency`.
- [Q1] Tablet and Relic recommendations: option A in [Requirements Analysis Questions](requirements-analysis-questions.md).
- [Q2] Single currency rate: option B in [Requirements Analysis Questions](requirements-analysis-questions.md).
- [revision] The requirements revisions request right-to-left amount calculation and the item count on the left of `↔ 1 [currency logo]` when the per-item rate is below one.
- [kb] Existing behavior and data contracts are documented in the [component inventory](../../../../codekb/poe2api/component-inventory.md) and [API documentation](../../../../codekb/poe2api/api-documentation.md).

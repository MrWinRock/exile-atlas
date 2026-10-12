# Search Toolkit catalogue

Game data © Grinding Gear Games. Modifier labels and stat identities derive from
the pinned PoB Community PoE2 snapshot described in
[the existing attribution notice](poe2-trade-stats.NOTICE.md).

Revision: bb52d6b368307457eb9c54bb13f1829993d390b1. Definitions and source identities
checked 2026-10-12. This is a curated English snapshot, not a complete or live
modifier catalogue. Numeric domains are compiler bounds, not available roll tiers.

Product and token syntax references: [poe2.re](https://poe2.re/waystone) and its
[WaystoneResult.ts](https://github.com/veiset/poe.re/blob/master/poe2/src/pages/waystone/WaystoneResult.ts).
Separate quoted searches combine with AND; alternatives use `|`; exclusions use
`"!pattern"`. No reference application code is included. The compiler is original
to Exile Atlas. Local item tests approximate searchable item text and do not run
GGG's in-game search engine. Confirm searches in-game after patch changes.

Waystone coverage checked 2026-10-13: 34 individual effects corresponding to
the reference's 32 affix groups (critical chance/damage and stun/ailment
thresholds are separate controls with verified individual trade IDs).
Labels and IDs are generated from our existing pinned PoB export by
`scripts/prepare-waystone-regex.ts`; compact fragments are independently
derived and collision-checked against all 34 definitions. No reference
application source or generated dataset is distributed.

Reference roll intervals and formatting were checked against
[poe2.re revision 4ae8978](https://github.com/veiset/poe.re/tree/4ae8978f28eb025aa14ba46fc2920c9358285f93).
Copied minimum-only yield filters assume the game's nonnegative whole-number
headers. Bounded modifier tokens use the searchable advanced roll format
`20(10-30)%`; the pasted-item tester also accepts basic `20%` text and checks
the actual roll separately from its range annotation. Optional rounding lowers
positive minimums to tens; explicit maximums stay exact. Multiple rarities and
delirium remain unmapped in trade preview and prevent a lossy handoff.

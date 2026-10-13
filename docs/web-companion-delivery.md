# Browser companion delivery — 2026-10-13

The four approved plans are implemented in the current checkout. Independent
review and master deployment are the remaining release gates.

| Tool | Browser workflow |
| --- | --- |
| Item inspector `/inspect` | Basic/advanced English copied text, actual rolls, source candidates, unknowns and explicit local search/safety/crafting handoffs |
| Search Toolkit `/regex` | Existing compact Waystones plus sourced Tablet, Relic, Vendor and equipment controls, independent numeric slots, decimal bounds and saved presets |
| Map safety `/safety` | Saved build traits and Any/All rules, actual roll thresholds, explained avoid/caution/review outcomes and lossless exclusion previews |
| Crafting `/crafting` | Source-qualified pools, target groups, ordered recipes, notes, exact planned/actual budgets, historical quotes and saved Genesis references |
| Comparison `/compare` | Saved builds or in-memory imports, separate reports, unknown IDs, weapon-set identities and paired read-only trees |
| Settings `/settings` | Source receipts, independent upstream checks, staged validation, explicit per-browser selection and rollback |

Weapon set I uses red `#e67878`, set II green `#74c99a`; shared uses gold
`#dab077`. Persistent in-canvas switches and the both-sets view retain separate
allocations and the current editing context.

The bundled snapshot contains 9,071 literal modifiers, 1,440 bases, 3,303 search
definitions and 31 source receipts. The independently sourced reference inventory
matches 86/86 Tablet, 31/31 Relic and 513/513 active equipment families; see
[coverage scope](regex-coverage.md) and [data attribution](../public/data/poe2-game-data.NOTICE.md).

Unknown identities, missing roll precision, unsupported trade mappings, changed
sources and absent item details remain visible. Genesis is a historical snapshot;
the eight core currency effects are manually maintained. Upstream source revisions
are not represented as game patch versions. Crafting does not manufacture random
outcomes or advertise source eligibility weights as probabilities. Comparison uses
available build facts, without inferred combat statistics.

## Verification before independent review

- Full unit suite: 297 passing tests, 10,471 assertions.
- Full desktop/mobile suite: 82 passing stories, including import/recovery and
  explicit inspector handoffs.
- Typecheck, lint and production build passed after the final semantic corrections.
- The data generator reproduced content ID
  `aaced308c9592c596cf68c6ef6c5fe09a7b847a2b1a6051b4ce52104263e1fe0`.
- Desktop/mobile visual captures show no horizontal overflow. Local official-tree
  fetching was unavailable while the configured Redis service was stopped;
  fixture-backed planner checks passed. The live official-tree flow is a release gate.

## Implementation rulings

1. Hidden or duplicate-key upstream base tables remain excluded with diagnostics
   rather than executing Lua or guessing values. Cost if wrong: an affected base
   needs manual source review before its pool can be verified.
2. PoE1 and unreleased hidden reference classes are outside the verified PoE2
   inventory. Cost if wrong: an inactive reference control remains unavailable.
3. Products of six-decimal quantities and prices retain twelve decimal places.
   Cost if wrong: exact totals display more decimal places than expected.

## Independent review and release

Pending; this section will record the review verdict, addressed findings, deferred
minor findings, master commit and actual deployment/live verification results.

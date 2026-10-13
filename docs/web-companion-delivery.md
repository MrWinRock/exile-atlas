# Browser companion delivery — 2026-10-13

The four approved plans are implemented in the current checkout. Independent
review is addressed; master deployment and live verification are the remaining gates.

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

- Full unit suite: 302 passing tests, 10,486 assertions after the review fix pass.
- Full desktop/mobile suite: 88 passing stories, including review regressions, import/recovery and
  explicit inspector handoffs.
- Typecheck, lint and production build passed after the final semantic corrections.
- The data generator reproduced content ID
  `aaced308c9592c596cf68c6ef6c5fe09a7b847a2b1a6051b4ce52104263e1fe0`.
- Desktop/mobile visual captures show no horizontal overflow. Local official-tree
  fetching was unavailable while the configured Redis service was stopped;
  fixture-backed planner checks passed. A compiled server using the supported in-memory
  cache fetched and rendered the real official tree on both layouts (4,912 nodes,
  5,830 edges; revision `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`). Live
  PoB/Relic/Tablet source checks and allowlisted staging also passed.

## Implementation rulings

1. Hidden or duplicate-key upstream base tables remain excluded with diagnostics
   rather than executing Lua or guessing values. Cost if wrong: an affected base
   needs manual source review before its pool can be verified.
2. PoE1 and unreleased hidden reference classes are outside the verified PoE2
   inventory. Cost if wrong: an inactive reference control remains unavailable.
3. Products of six-decimal quantities and prices retain twelve decimal places.
   Cost if wrong: exact totals display more decimal places than expected.

## Independent review and release

The fresh independent reviewer found four important defects and one minor display
finding at `77c0fb7`. The display finding was regraded Important because a comparison
must show the changed support details. All five entered one fix pass, with reproducing
RED-to-GREEN tests and the full suite green afterwards. No second review was dispatched.

1. Numeric trade handoffs use the compiler's slot precision and aggregated domains;
   failed/unsupported conversions block complete handoff.
2. Inspector handoffs retain attack rate, sockets and required level. Unsupported
   copied properties are explicit unresolved criteria.
3. Changing a crafting/spend currency clears its previous price and provenance.
4. New authored presets record the selected snapshot; existing references remain
   intact until explicit revalidation.
5. Comparison displays support-gem level intervals and notes.

Deferred minor findings: none.

Additional review rulings:
- Manual/historical Genesis and currency-effect adapters stand because they are
  disclosed. Cost if wrong: their facts can lag until maintained.
- The recorded hidden/rejected/PoE1/unreleased scope stands. Cost if wrong: affected
  controls require source review before availability.
- Probabilities, combat statistics and upgrade scores remain outside these factual
  tools. Cost if wrong: users need a separate calculation tool.
- Deployment/live rendering remains a release gate outside the read-only code review.
  Cost if wrong: environment failures require correction before claiming deployment.
- Support-detail display was upgraded to Important. Cost if wrong: extra explanatory
  text appears in comparisons.

Master deployment/live results: pending.

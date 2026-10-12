# Genesis Tree explorer and local planner

Date: 2026-10-12
Status: Approved design; implementation plan also approved on 2026-10-12.

## Intent

The user asked to add the functionality represented by
`https://poe2db.tw/us/The_Genesis_Tree` to the personal PoE2 companion.
The existing Search Toolkit specification is approved independently.

Provide a searchable crafting-tree explorer and persistent local planning tool.
The initial feature supports Currency, Rings, Amulets, Belts, and Breachstones,
matching the reward sections on the referenced page. It works without GGG account
credentials or access to the player's in-game state.

## Interface and behavior

Add `/genesis`, a **Genesis Tree** navigation entry, and a dashboard card.
Use the app's existing visual system and an accessible searchable node list beside
a pan/zoom tree view. Branch controls focus the selected subtree; Fit and Reset
view restore the camera without deleting allocations.

Selecting a node displays its name, branch, effects, allocation status, and source
link. Search matches names and effect text, focuses the selected result, and
retains keyboard-accessible list controls as an alternative to canvas interaction.
Repeated node names are distinguished by their stable IDs and branches.

Allocate along a connected path from the selected branch root or existing
allocations. Preview the nodes and point count required before applying the path.
Refunding a connector removes descendants that become disconnected from that
branch root. Allocations never connect across independent branches.
Root records initialize reachability and do not count as player allocations
unless a verified rule explicitly makes them spendable.

Show allocated counts per branch. The player can enter a personal point budget
per branch; mark it as a planning budget rather than an automatically detected
game limit. Reject a new allocation that exceeds a configured budget. No budget
means counts-only planning. Enforce source-provided game limits, dependencies,
or exclusivity only when the dataset establishes their semantics. Unknown unlock
requirements remain visible as reference information without guessed enforcement.

Add a reference panel for Wombgifts, their associated reward branches, and
verified crafting effects. Show allocated effects verbatim with their node IDs.
Do not sum conditional probabilities or promise expected profit/crafting odds.

## Data and accuracy

Use a bundled, versioned Genesis dataset with stable node IDs, coordinates,
branch roots, connections, node text, and crafting references. A preparation
script validates IDs, finite geometry, edge endpoints, branch membership, and
root reachability before writing the snapshot. Production serves the local
snapshot rather than scraping PoE2DB on each page visit.

The referenced PoE2DB page is the comparison/reference target. Existing GGG
character-tree exports are not evidence that their data includes Genesis.
A publicly available community graph and crafting snapshot was found in
`PraedythXIV/poe2-build-converter`, with internal capture date 2026-07-04 and
patch identifier `4.5.4.3`. Its repository is archived. This is a candidate
geometry/reference source, not evidence of current patch parity.

During data preparation, pin the selected source revision, verify its full
contents and reuse/provenance notices, compare node IDs/text/categories against
the requested reference, and record any differences. Do not combine current text
with historical geometry under one unqualified version label. Preserve GGG game
data attribution independently of any upstream software license.

Display the dataset source, patch/capture information, and verification date.
An older validated snapshot must be explicitly labeled historical. If graph data
cannot be obtained or validated, report that delivery blocker rather than invent
positions/connections or silently substitute a reference-only page for the
requested planner. Invalid/missing data disables allocation and retains a
recoverable error with the external reference link.

## Architecture

Keep Genesis models, normalization, allocation rules, and persistence independent
of the existing character passive planner and regex toolkit. Reuse viewport and
rendering helpers where their interfaces fit; do not apply character-class,
ascendancy, or weapon-set assumptions to this graph.

Use focused modules for `genesis-data`, `genesis-plan`, and `genesis-store`, a
`genesis` page component, accessible node/reference controls, and a renderer
adapter. Prefer existing Pixi/browser capabilities; no new runtime dependency,
OAuth scope, database table, or worker is needed.

## Saved plans and portability

Store current allocations, branch budgets, and up to 100 named plans in
`exile-atlas-genesis-v1`, using the existing deferred Zustand hydration pattern.
Names are trimmed to 1-120 characters. Support save, load, rename, duplicate,
delete, and explicit reset of the current plan. Budgets and allocation state stay
independent across branches.

Export/import a versioned JSON envelope with format `exile-atlas-genesis`, version
1, dataset identity, node IDs, budgets, and named plans. Imports accept at most
1 MiB and 100 plans and validate completely before mutation. Imported plans get
fresh IDs. Dataset mismatches and unknown node IDs are retained for review with
warnings; do not silently replace nodes or discard planned choices. Invalid
connectivity or unresolved IDs block applying a plan until repaired.

These are Exile Atlas planning files. Genesis allocations do not enter `.build`
files because the current official Build model does not define Genesis fields.
Settings shows plan counts and extends its existing confirmed clear action to
the Genesis store, independently of account/status availability.

## Verification and acceptance

- The validated snapshot contains all supported branches, valid roots, finite
  coordinates, and resolvable connections; node counts are derived from data.
- Unit tests cover connected allocation, disconnected targets, branch isolation,
  connector refunds, budget boundaries, root accounting, stable duplicate names,
  unknown IDs, and dataset-version mismatches.
- Persistence/import tests cover schema validation, fresh imported IDs, atomic
  rejection, storage errors, and explicit reset without deleting saved plans.
- Browser tests cover search/focus, pan/zoom/fit, branch switching, path preview,
  allocation/refund, budgets, saved-plan roundtrips, Settings clear, keyboard
  node controls, error states, and desktop/390px mobile widths.
- Run Bun unit tests, type checking, lint, production build, and the relevant
  desktop/mobile Playwright tests. Report data-version and in-game verification
  limitations explicitly.

## Sources inspected 2026-10-12

- [Requested Genesis Tree page](https://poe2db.tw/us/The_Genesis_Tree).
- [Candidate graph](https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/main/src/data/genesisGraph.json).
- [Candidate crafting references](https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/main/src/data/genesisCrafting.json).
- [Candidate source license](https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/main/LICENSE) and [provenance notices](https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/main/THIRD-PARTY-NOTICES.md).
- [GGG Build Planner format](https://www.pathofexile.com/developer/docs/game#build-planner).

The approved Search Toolkit can be delivered independently. Genesis receives its
own implementation plan after this design is reviewed.

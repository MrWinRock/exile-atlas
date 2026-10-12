# Saved-build comparison in the browser

Parent scope: [browser companion roadmap](2026-10-13-web-companion-roadmap.md).

## Inputs and persistence

Add a Compare action to the existing build library and a `/compare` page. Choose
two saved builds or explicitly import `.build`/JSON files with existing schema
validation and size limits. Import/comparison does not overwrite either saved build.

Use stable build IDs for saved inputs. A refreshed/edited/deleted build is handled
explicitly, without leaving a mislabeled comparison. Compare imported copies in
memory unless the user chooses to save them to the library.

## Differences

Show names, ascendancy, skills/supports, inventory-slot hints, passives, level
intervals, descriptions/notes, and available item facts. Mark added, removed,
changed, and unchanged entries. Provide a **Differences only** toggle.

Passive identity includes node ID and `weapon_set`; shared, I, and II allocations
must not be merged merely because they share a node ID. Count regular/ascendancy
points with the existing planning rules, and keep unresolved IDs visible. Set I
uses the new red, set II green, shared gold conventions from the weapon-set fix.

Where available, show an overlay of passive differences against a declared tree
snapshot with membership legends and selected-node details. Unknown or outdated
nodes remain listed even when the renderer cannot position them. Comparison must
never normalize away imported data or reallocate the working planner.

Equipment comparisons cover the hints/parsed facts actually present. Label a
missing roll, base, or item detail as unavailable; the current `.build` format is
not a complete combat model. Do not invent DPS, effective health, or an upgrade
score. Offer links to inspect available item text and prepare a trade search.

Provide a copy/download comparison report that includes input names/IDs,
snapshot versions, differences, and unresolved data. This is a new report format,
not an incompatible extension silently inserted into official `.build` exports.

## Acceptance

- Same build compares equal; input order reverses added/removed differences.
- Different support gems, inventory hints, level intervals, and notes are shown.
- Shared/I/II identity survives import, comparison, reporting, and view switching.
- Missing/unknown node IDs and incomplete equipment remain visible.
- No comparison, reload, report export, or canvas interaction mutates source builds
  or the existing working passive plan.
- Usable side-by-side/stacked layouts and keyboard controls on desktop/mobile.


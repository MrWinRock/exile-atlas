# Atlas planner, Genesis artwork and navigation

User scope: scrollable sidebar, a browser Atlas skill-tree planner, artwork on every
Genesis node, and accessible passive-planner Undo. Implement directly in the current
checkout and review/deploy to master under the standing user instructions.

The sidebar scrolls independently at small viewport heights. Every navigation and
settings link remains reachable; mobile close stays available while scrolling.

Atlas is a separate `/atlas` tool. Pin RePoE PoE2 revision
`b818b843337cae43b090b272fd98bbc0fd3a34f3`, captured 2026-09-15, source patch
`4.5.5.2`. Normalize orbit geometry, undirected connections and seven roots. Retain
decorative icon-only nodes for display, exclude them from allocation. Allocate a
connected path within one branch atomically; refund disconnected descendants.
Point budgets are user planning budgets from 0 to 5000, not detected game limits.
Show source effects, not simulated outcomes. Preserve source references to choice
mechanics without inventing selectable options absent from the source.

Provide pan/zoom/fit, searchable keyboard node list, selected effects/art, per-branch
counts, current draft persistence, named saved plans, JSON backups/imports, reset
and visit-local Undo for the last 50 draft changes. Export format is app-specific
`exile-atlas-atlas`, version 1, not an in-game build file. Bound libraries to 100
records/1 MiB; reject invalid input, preserve damaged storage and warn. Dataset
mismatches/unknown IDs remain reviewable and block allocation/save until explicitly
replaced by a new plan. Imports are copies. Saved plans are separate from character
passives and Genesis.

Use existing gold/green typography and panels. Share the existing SVG planning
graph with Genesis without changing its allocation rules or plan identity. Genesis
sprites come from its existing pinned revision; every source node has an icon.
Show cropped artwork in the graph, browser list and selected details. Atlas icons
may reuse matching artwork paths from that historical art snapshot; disclose its
separate source version, and show a fallback for an unmatched icon.

Passive Undo already restores allocation/refund/reset/class/ascendancy changes.
Keep its header action and add the same action to the tree toolbar so it remains
reachable while inspecting the canvas. Editing-set switches do not consume history.

Validate: failing model/coverage/browser cases first; unit suite, lint, typecheck,
production build, desktop/mobile flows, small-height sidebar, source image loading,
and final independent review. Then deploy and verify the live planner.

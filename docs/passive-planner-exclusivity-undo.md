# Passive planner: exclusive sets and undo

Both red set I and green set II are always displayed in the planner. Selecting a
set changes the editing target. Shared gold nodes remain available to both sets.

New private allocations cannot reuse nodes owned by the other set. Automatic
paths exclude those nodes and use an alternative route when one exists. If none
exists, the complete allocation is rejected with guidance to use shared connectors.

Existing overlapping drafts remain visible for repair. The planner identifies the
conflicting nodes and disables save/export until the user refunds one membership or
promotes the connected path to Shared. Saved library builds are not rewritten.

Undo restores allocations, refunds (including disconnected descendants), reset,
class and ascendancy changes as complete actions, together with the editing set
and selected node. Set switches, node selection, save/export and unsuccessful
allocation attempts do not add history. History retains the last 50 changes during
the current planner visit and is separate from browser persistence and build exports.

Verification: allocation/alternative-route/immutable-history tests reproduced
failures before implementation and passed afterwards. Desktop/mobile stories cover
always-visible colors, ownership guards, reset/refund/allocation undo, context undo,
legacy repair and recovery. Final suite/review/deployment results are recorded below.

Final verification: 306 unit tests and all 96 desktop/mobile browser stories passed.
Typecheck, lint, production build and `git diff --check` passed. An independent
review of `e2e44a5..fcb8441` found no critical, important or minor issues and approved
merging after the full browser suite completed successfully.

Deployment: master `8e984e88a869ebdd813f169aca058abac3cc2f97` published and deployed
successfully in [workflow run 38359664982](https://github.com/MrWinRock/exile-atlas/actions/runs/38359664982).
All 20 planner desktop/mobile browser stories passed against
[production](https://poe2.nonglabs.cloud/planner). Separate real-data smoke checks
rendered the official tree, verified always-visible set controls and fresh Undo
state, and found no page errors or viewport overflow on desktop or mobile.

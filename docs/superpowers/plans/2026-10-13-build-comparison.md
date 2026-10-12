# Browser build comparison implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User selected direct implementation in this chat/current checkout, with one independent final review.

**Goal:** Compare two saved/imported builds without changing either build or the working planner.
**Architecture:** A pure diff/report module preserves official build data and weapon-set identity. A separate read-only screen selects stable saved IDs or in-memory imports and renders facts/differences against a declared tree snapshot.
**Tech Stack:** Installed Next.js/Bun/TypeScript/Zod, existing build library/Pixi tree, Bun and Playwright.
**Spec:** `docs/superpowers/specs/2026-10-13-build-comparison-design.md`.
**Dependencies:** Weapon-set views and shared inspector/data plans; read their interfaces before implementation.

## Global constraints

Browser only, mobile/keyboard usable. Shared gold `#dab077`, set I red `#e67878`, set II green `#74c99a`. Preserve source objects/unknown IDs; no guessed equipment rolls, DPS, effective health or upgrade score. File imports use existing schema validation and a 1-MiB UTF-8 bound. Comparison report is separate from official `.build` exports. Read installed Next.js guides before product edits.

## Task 1 — pure identity-preserving diff/report

**Files:** create `src/lib/build-comparison.ts`, `src/lib/build-comparison-schema.ts`, `tests/build-comparison.test.ts`; consume existing build/passive-budget modules without allocation normalization.
**Interfaces:** `compareBuilds(left:Build,right:Build,snapshot?:Tree):BuildDifference` uses the existing Tree type and returns metadata, added/removed/changed/unchanged entries by section, regular/ascendancy counts and unresolved facts. Passive identity is `(weapon_set ?? 0, id)`; level intervals/notes are compared within that identity. Inventory identity uses supplied inventory_id and position; retain duplicate/ambiguous identities as explicit diagnostics. `exportBuildComparison(inputs,difference,sources):BuildComparisonReport` emits format `exile-atlas-build-comparison`, version 1, input names/optional stable IDs, source snapshots, differences and unresolved data.

- [ ] Write tests for same-build equality, reverse-input symmetry, changed supports/slot hints/notes/intervals, missing item data and unknown passive IDs. Assert:
  ```ts
  expect(compareBuilds(build, build).hasChanges).toBe(false);
  expect(diff(passive("a",1),passive("a",2)).passives.removed[0].weapon_set).toBe(1);
  expect(diff(passive("a",1),passive("a",2)).passives.added[0].weapon_set).toBe(2);
  expect(counts({shared:2,setI:2,setII:3}).regular).toBe(5);
  expect(report.format).toBe("exile-atlas-build-comparison");
  expect(report.version).toBe(1);
  ```
  Counts include existing regular-budget rules and separate ascendancy; unknown unclassified nodes are unresolved rather than silently counted. Pin shared/I/II duplicates, repeated skills/supports/inventory entries, insignificant ordering versus semantic slot/level changes and byte-equivalent input objects after diff/report.
- [ ] Run `bun test tests/build-comparison.test.ts`; expect missing-module failure.
- [ ] Implement named interfaces using source-preserving matching. Never feed compared imports through planner normalization. Available pasted item text can be parsed through the shared inspector; missing rolls/base details remain unavailable. Diff markers use text/shape separately from weapon-set colors.
- [ ] Repeat tests; expect pass. Commit as `feat: add build comparison and report model`.

## Task 2 — comparison screen and read-only trees

**Files:** create `src/components/build-comparison.tsx`, `src/components/build-comparison.module.css`, `e2e/build-comparison.spec.ts`; modify `src/components/builds.tsx`, `src/app/[section]/page.tsx`, `src/components/shell.tsx` and optional read-only props in `src/components/tree-canvas.tsx`.
**Interfaces:** selectors hold saved stable IDs or validated imported copies; imports remain in memory until an explicit library-save action. TreeCanvas consumes the weapon-view display model but read-only comparison suppresses allocation/refund callbacks and editing switches. BuildDifference drives differences-only sections, selected-node details and report downloads/copy.

- [ ] Write desktop/mobile browser tests: select two saved builds from Compare action, import a copy, inspect differing supports/notes/slots, toggle differences-only, switch shared/I/II/both views, select nodes, copy/download report and save an imported copy explicitly. Assert working-plan/library serialization is unchanged by comparison/view/report actions. Oversized/malformed imports do not replace valid selections. Deleted or updated saved selections are clearly refreshed/cleared rather than mislabeled; unresolved IDs remain listed when no tree position exists.
- [ ] Run `bun run test:e2e e2e/build-comparison.spec.ts --workers=2`; expect missing-screen failure.
- [ ] Implement `/compare` with two selectors, side-by-side desktop and stacked mobile sections. Show declared tree source/revision; use read-only overlay or paired views with added/removed text/shape and set membership legends. List unknown/unavailable facts, offer inspector/trade previews only for available item text, and retain a visible state for missing selected builds. No comparison canvas action writes to workspace or source library.
- [ ] Run `bun test tests/build-comparison.test.ts`, then `bun run test:e2e e2e/build-comparison.spec.ts e2e/workspace.spec.ts e2e/planner.spec.ts --workers=2`; expect pass. Run `bun run typecheck`, `bun run lint`, `bun run build`; expect zero failures/errors. Update documentation and commit as `feat: add browser build comparison`.

## Final integration and release

- [ ] Run `bun run test`, then one Playwright run containing all new tool stories and existing regex/build/Genesis/Settings regressions on desktop/mobile (`--workers=2`). Run typecheck/lint/production build after final edits; record commands and results.
- [ ] Use requesting-code-review for one independent whole-change review, as already selected by the user. Address findings, rerun affected checks and record any remaining material limitations.
- [ ] Inspect final diff/status and preserve unrelated changes. With existing authorization to merge master for deployment, integrate the verified commits into master using the repository's current deployment workflow, push and monitor that workflow. Verify live navigation and the weapon-set/regression/new-tool flows before reporting deployment success. Report an actual deployment failure without claiming release.

## Review focus

Node ID collapse across sets (task 1); duplicate/ordered entries causing misleading diffs (task 1); lost unknown nodes or invented point counts (tasks 1–2); stale/deleted saved inputs mislabeled in the UI (task 2); imported/report/canvas actions mutating the working plan or library (tasks 1–2). Tests above pin each failure mode.

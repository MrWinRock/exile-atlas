# Weapon-set views implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User selected native implementation in this chat, current checkout, one independent final review.

**Goal:** Red set I, green set II, accessible switching, and both-sets viewing without changing allocations.
**Architecture:** Separate display membership from active editing mode. Update the existing Pixi renderer in place and reuse allocation/budget logic.
**Tech Stack:** Installed Next.js/React/TypeScript, Pixi, Zustand, Bun tests, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-13-web-companion-roadmap.md`, weapon-set section.

## Global constraints

Shared gold `#dab077`, set I red `#e67878`, set II green `#74c99a`. Preserve budgets/allocation rules and official weapon_set values. Browser/mobile/keyboard usable; switching preserves camera, selection and allocations. Read installed Next.js guides before product edits.

## Task 1 — palette and display membership

**Files:** modify `src/lib/passive-colors.ts`; create `src/lib/passive-display.ts`, `tests/passive-display.test.ts`; update existing color tests.
**Interfaces:** `PassiveDisplay = {shared: string[]; weapon1: string[]; weapon2: string[]; mode: AllocationMode; showBoth: boolean}`; `visiblePassiveIds(display): string[]`; `passiveMembership(display,id): (0|1|2)[]`; `edgeMembership(display,from,to): (0|1|2)[]`.
Edges belong to a set only when both endpoints are active in that set's shared+exclusive tree. Shared/shared edges stay gold. Do not join unrelated exclusive branches.

- [ ] Write tests with shared `a,r`, I `b,d`, II `c,d`:
  ```ts
  expect(WEAPON_PASSIVE_COLORS).toEqual({1:0xe67878,2:0x74c99a});
  expect(passiveMembership(display,"d")).toEqual([1,2]);
  expect(edgeMembership(display,"b","c")).toEqual([]);
  expect(edgeMembership(display,"a","d")).toEqual([1,2]);
  ```
  When showBoth is false, only the selected set plus shared is visible. Input arrays stay unchanged.
- [ ] Run `bun test tests/passive-colors.test.ts tests/passive-display.test.ts`; expect new palette/membership assertions to fail.
- [ ] Implement pure membership helpers and palette.
- [ ] Run `bun test tests/passive-colors.test.ts tests/passive-display.test.ts tests/passive-plan.test.ts`; expect all passing. Commit palette/helpers/tests.

## Task 2 — renderer, controls and both-set view

**Files:** modify `src/lib/tree-renderer.ts`, `src/components/tree-canvas.tsx`, `src/components/planner.tsx`, `src/components/planner.module.css`, `src/app/globals.css`, `src/lib/workspace-store.ts`; create `e2e/weapon-set-views.spec.ts`.
**Interface:** renderer `update(allocated,highlight?,weaponAllocated?,weaponSet?,display?:PassiveDisplay)` remains compatible. TreeCanvas receives optional display state/view callbacks. Planner retains explicit AllocationMode for editing.

- [ ] Browser regression uses existing planner fixtures with independent allocations. Switch Shared/I/II/Both; assert editing mode, membership text, counts and stored plans remain correct. In-canvas View weapon set I/II and Show both sets controls work on desktop/mobile. Legend swatches are RGB `(230,120,120)` and `(116,201,154)`. Save/reload/export preserves weapon_set 1/2; camera and renderer instance survive switches.
- [ ] Run `bun run test:e2e e2e/weapon-set-views.spec.ts --workers=2`; expect missing controls/both-set view failures.
- [ ] Draw frames/edges from Task 1. Both membership uses split red/green rings and both colors on edges. Preserve radii, hit areas, orbit geometry, and existing allocation rules.
- [ ] Add in-canvas controls synchronized with existing tabs, keyboard support and textual editing/membership details. Persist showBoth as a view preference outside official `.build` data; initialize older state safely.
- [ ] Run `bun test tests/passive-colors.test.ts tests/passive-display.test.ts tests/passive-plan.test.ts`, then `bun run test:e2e e2e/weapon-set-views.spec.ts e2e/planner.spec.ts e2e/planner-select.spec.ts e2e/workspace.spec.ts --workers=2`; expect pass.
- [ ] Inspect desktop/mobile screenshots; run `bun run typecheck`, `bun run lint`, `bun run build`; expect zero failures/errors. Commit evidence/docs and product files.

## Review focus

Overlapping membership, unrelated branch edges, both-view refunds, reload/import identities, mobile control overflow and camera/renderer regressions are exercised above. Switching display must never charge/refund points.

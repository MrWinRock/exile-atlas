# Atlas, artwork and navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** Deliver the four requested browser improvements with independent review and master deployment.
**Architecture:** Pin and normalize the Atlas export; a separate draft and local library consume pure graph planning functions. Share the existing SVG graph with Genesis and retain its behavior.
**Tech Stack:** Installed Next 16, React, TypeScript, Zod, Zustand, Bun, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-13-atlas-artwork-navigation.md`

## Global Constraints

Current checkout; no new runtime dependency. Browser-only. Libraries 100 records/1 MiB.
Planning budgets 0–5000; visit Undo 50. Source effects are references. Preserve damaged storage.

## Review Focus

- Small-height mobile navigation: settings and close remain reachable.
- Imported different datasets: retain content, refuse unsafe mutations.
- Icon-only nodes: visible artwork, no point allocation or path shortcuts.
- Draft hydration/storage errors: no empty-state overwrite; warn and allow backup.
- Refunding a shared connector: only disconnected descendants of that branch removed.

### Task 1: Sidebar and passive Undo reachability

**Files:** `src/components/shell.tsx`, `src/app/globals.css`, `src/components/tree-canvas.tsx`, `src/components/planner.tsx`, `e2e/navigation-artwork.spec.ts`.
**Interfaces:** TreeCanvas accepts optional `undoAction: { disabled: boolean; onClick: () => void }`; comparison omits it.
- [x] Write/run browser cases for short-height scroll/close and canvas Undo; expect RED.
- [x] Add bounded sidebar overflow with nonshrinking content and sticky mobile close; add toolbar Undo.
- [x] Run focused browser stories; expect PASS. Commit.

### Task 2: Sourced artwork and shared graph

**Files:** `src/lib/planning-artwork.ts`, `scripts/prepare-genesis.ts`, `src/lib/genesis-data.ts`, `src/components/planning-graph.tsx`, `src/components/genesis-graph.tsx`, `src/components/genesis.tsx`, source notices/data/assets.
**Interfaces:** `parsePlanningSprites(raw, sheet): Map<string, PassiveSprite>` validates crops; Graph accepts branch-scoped nodes/edges and label, sprites/root/decoration flags.
- [x] Write/run crop validation and Genesis coverage/browser image cases; expect RED.
- [x] Pin/check sprite JSON and WebP digests; retain sprite references without changing dataset identity.
- [x] Extract existing graph behavior; display crops in graph/list/details and preserve selection/pan/zoom.
- [x] Run Genesis/unit/browser regressions; expect PASS. Commit.

### Task 3: Atlas data and planning model

**Files:** `scripts/prepare-atlas.ts`, `src/lib/atlas-data.ts`, `src/lib/atlas-plan.ts`, `src/lib/atlas-store.ts`, `tests/atlas.test.ts`, `public/data/poe2-atlas.json`/notice.
**Interfaces:** `parseAtlasData(raw)`, `normalizeAtlasSource(raw, metadata, sprites)` produce AtlasData. `atlasPath`, `allocateAtlasPath`, `refundAtlasNode`, `validateAtlasPlan`, `atlasCounts` consume AtlasData/AtlasPlan. Store current draft and plans with `createAtlasDraft(storage?)`/`createAtlasLibrary(storage?)`.
- [x] Write/run hand-derived graph path/budget/refund/decorative cases and damaged-storage/import tests; expect RED.
- [x] Implement validated geometry/roots/branch edges, pinned source preparation and pure planning rules.
- [x] Implement separate recoverable draft/library persistence using existing local-library facilities.
- [x] Run focused and full unit suites; expect PASS. Commit.

### Task 4: Atlas interface and release

**Files:** `src/components/atlas-planner.tsx`, `src/components/atlas-planner.module.css`, route/shell/providers/dashboard/settings, `e2e/atlas.spec.ts`.
**Interfaces:** Consume Task 2 graph/art and Task 3 model/store; no character-store mutation.
- [x] Write/run browser tests for allocation, Undo/refund/reset, branch budget isolation, save/reload/import/dataset guards; expect RED.
- [x] Build sourced branch tabs/graph/search/details and saved-plan backup actions; restore full draft per Undo.
- [x] Run unit/lint/type/build/full desktop/mobile tests and artwork smoke; expect PASS.
- [x] Commit, dispatch one fresh reviewer, fix reproduced significant findings, record receipt.
- [x] Merge/push master, await workflow success, verify live Atlas/Genesis/passive/navigation cases.

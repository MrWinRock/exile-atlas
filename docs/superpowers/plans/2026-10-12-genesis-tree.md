# Genesis Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implement directly in this chat, followed by an independent final review.

**Goal:** Add a versioned Genesis crafting-tree explorer with connected allocations, branch budgets, and portable local plans.

**Architecture:** A checked local snapshot provides geometry, effects, roots, and crafting references. Pure graph operations own allocation/refund validation; a dedicated Zustand store owns plans. A client page renders the graph and accessible search/details controls separately from the character planner.

**Tech Stack:** Bun, TypeScript, installed Next.js, React, Zod, Zustand, existing rendering/browser capabilities, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-genesis-tree-design.md` (approved 2026-10-12).

## Global constraints

- Route `/genesis`; navigation label **Genesis Tree**.
- Independent branches: Currency, Rings, Amulets, Belts, Breachstones.
- Storage key `exile-atlas-genesis-v1`; up to 100 saved plans, trimmed names of 1-120 characters.
- Import at most 1 MiB / 100 plans, atomic validation and fresh imported IDs.
- Envelope format `exile-atlas-genesis`, version 1; retain dataset identity and unknown IDs for review.
- Show source, capture/patch information, verification date, and historical-data status. Never invent graph connections or present a historic snapshot as current.
- Root nodes seed connectivity and do not consume points. Branch budgets are player-entered planning budgets.
- Genesis stays outside `.build` files and character/regex state. No new OAuth scopes, database tables, workers, or runtime dependencies.

## Review focus

1. Historical/current text mismatch: keep one labeled snapshot rather than combine incompatible versions (Task 1).
2. Disconnected/cross-branch targets: refuse allocation and keep current state (Task 2).
3. Connector refunds and root accounting: retain reachable descendants only and never count implicit roots (Task 2).
4. Unknown IDs/dataset mismatch on import: preserve choices for remediation; applying unresolved plans is blocked (Task 3).
5. Canvas keyboard/touch use: accessible list allocation alternatives, drag threshold, bounded zoom, stable view (Task 4).

## Task 1: Pin and validate a Genesis snapshot

**Files:** Create `scripts/prepare-genesis.ts`, `src/lib/genesis-data.ts`, `public/data/poe2-genesis.json`, `public/data/poe2-genesis.NOTICE.md`, `tests/genesis-data.test.ts`.

**Interfaces:** `GenesisBranch = "Currency" | "Rings" | "Amulets" | "Belts" | "Breachstones"`; `GenesisNode = { id: string; name: string; branch: GenesisBranch; x: number; y: number; effects: string[]; root: boolean }`; `GenesisData = { identity: string; source: string; captured: string; patch: string; historical: boolean; nodes: GenesisNode[]; edges: [string,string][]; wombgifts: { name: string; branch: GenesisBranch; description: string }[] }`. Export `parseGenesisData(raw: unknown): GenesisData`.

- [ ] Add failing tests for unique IDs, finite geometry, five verified roots, resolvable edge endpoints, isolated branches, duplicate names distinguished by ID, and explicit source metadata.
- [ ] Run `bun test tests/genesis-data.test.ts`; expect failure before implementation.
- [ ] Resolve a pinned commit from `PraedythXIV/poe2-build-converter`, inspect `src/data/genesisGraph.json` and `genesisCrafting.json`, and verify source/provenance notices. Compare counts/names/branches against the requested PoE2DB page. Document differences in the notice. Treat the 2026-07-04 / 4.5.4.3 capture as historical unless current parity is established; derive actual counts from the graph. Do not copy wiki prose or upstream renderer code.
- [ ] Implement `parseGenesisData` and a preparation script that downloads only the pinned graph/crafting data, verifies pinned digests, normalizes records, validates invariants, and writes the local snapshot. Record GGG ownership and upstream provenance; include source revision/digests in the notice/script. If no valid complete graph can be retrieved, stop Genesis implementation and report the data blocker while completing Search Toolkit.
- [ ] Run data tests and `bun run typecheck`; expect pass. Commit snapshot/normalizer/tests/notice/script together.

## Task 2: Connected allocation, refunds, and budgets

**Files:** Create `src/lib/genesis-plan.ts`, `tests/genesis-plan.test.ts`.

**Interfaces:** `GenesisPlan = { dataset: string; allocated: string[]; budgets: Partial<Record<GenesisBranch, number>> }`; export `createGenesisPlan(data: GenesisData): GenesisPlan`, `validateGenesisPlan(data, plan): string[]`, `genesisPath(data, plan, target: string): { ids: string[]; error?: string }`, `allocateGenesisPath(data, plan, target): { plan: GenesisPlan; error?: string }`, `refundGenesisNode(data, plan, target): GenesisPlan`, `genesisCounts(data, plan): Record<GenesisBranch, number>`.

- [ ] Add failing tests for shortest connected path within a branch, deterministic path selection, unknown/unreachable targets, roots costing zero, per-branch counts, exact-budget acceptance, overflow rejection without mutation, connector cascading refunds, and immutable input plans.
- [ ] Run `bun test tests/genesis-plan.test.ts`; expect failure.
- [ ] Implement breadth-first path search seeded only by that branch's root and connected allocated nodes; validate current connectivity before extending. Enforce optional budgets independently; refunds retain only nodes still reachable from their own roots. Preserve source IDs; reject incompatible datasets.
- [ ] Run both Genesis unit suites; expect pass. Commit graph operations/tests.

## Task 3: Persistent named plans and JSON portability

**Files:** Create `src/lib/genesis-store.ts`, `src/lib/genesis-presets.ts`, `tests/genesis-presets.test.ts`.

**Interfaces:** `SavedGenesisPlan = { id: string; name: string; plan: GenesisPlan; createdAt: string; updatedAt: string }`; export `parseGenesisImport(text: string, currentCount: number): SavedGenesisPlan[]`, `exportGenesisPlans(plans: SavedGenesisPlan[]): string`, `useGenesisWorkspace` with `current`, `plans`, `warning`, `setPlan`, `savePlan(name,id?)`, `loadPlan(id)`, `renamePlan`, `duplicatePlan`, `deletePlan`, `importPlans`, `resetCurrent(data)`, `clearAll`.

- [ ] Add failing tests for envelope/schema/size/capacity/version validation, preserving dataset IDs and unknown nodes, fresh imported IDs, atomic rejection, creation-time preservation on updates, independent saved/current reset, individually valid persisted-record recovery, and throwing browser storage.
- [ ] Run `bun test tests/genesis-presets.test.ts`; expect failure.
- [ ] Implement strict structural validation, deferred hydration, validated merge, and recoverable storage failures. Keep unresolved/version-mismatched imported plans editable; graph validation blocks their application until repaired. Preserve current and saved plans on errors.
- [ ] Run Genesis suites and type checking; expect pass. Commit persistence/portability/tests.

## Task 4: Tree explorer, allocation preview, and plan library

**Files:** Create `src/components/genesis.tsx`, `src/components/genesis-graph.tsx`, `src/components/genesis.module.css`, `e2e/genesis.spec.ts`; modify section router, Providers, Shell, Dashboard, Settings.

**Interfaces:** `Genesis()` loads the bundled validated snapshot, owns selection/branch/search/preview/camera, and consumes the Genesis store. `GenesisGraph({ data, allocated, selected, onSelect, branch })` displays verified geometry and provides pan/zoom/fit; accessible list controls remain available for every allocation action.

- [ ] Add failing browser tests for route/navigation, source/version notice, five branch selectors, search/name/effect matching, node focus/details, path/point preview, explicit allocation, refunds, budgets, saving/loading/duplicating/renaming/deleting, import/export, and Settings clear independent of failed account status.
- [ ] Run `bun run test:e2e -- e2e/genesis.spec.ts`; expect failures before route/UI exists.
- [ ] Implement the page in the existing dark editorial style. Use SVG or the existing canvas helpers according to verified graph size; no generic character-tree adaptation that injects class or weapon-set semantics. Bound camera zoom, implement pointer-captured drag with a movement threshold, preserve the camera during allocations, and provide Fit/Reset view. Keyboard-accessible list selection and explicit Allocate/Refund buttons must cover canvas actions. Keep historic data visible as a planning reference with no odds/profit calculator.
- [ ] Wire navigation/card/Settings counts, deferred store hydration, and existing confirmed clear action. Handle snapshot failure with a recoverable error and source link; disable graph operations.
- [ ] Run Genesis browser tests on desktop/mobile, Genesis units, typecheck, lint; expect pass. Commit integrated explorer/planner.

## Task 5: Verification and delivery

**Files:** Update README and implementation log; modify product/tests only for verified findings.

- [ ] Run full Bun suite outside sandbox if deployment subprocesses require it; typecheck, lint, and production build must pass.
- [ ] Run Genesis and affected workspace/regex browser tests on desktop/390px mobile. Inspect node details, long effects, plan names, touch drag, keyboard list controls, and no page-width overflow.
- [ ] Request an independent review against this spec/plan and the five review-focus cases, then fix important findings using failing regression tests before code changes.
- [ ] Record actual data provenance, reference differences, checks, and game-client limitations; commit final evidence/fixes. Do not claim live account synchronization or `.build` import support.

## Self-review and execution

The tasks cover data accuracy, graph semantics, persistence, accessible UI,
integration, and verification. Shared types are declared before consumers; the
review-focus conditions have explicit tests. Direct execution in this chat is
already selected. This plan awaits the user's written-plan review; the approved
Search Toolkit plan can proceed independently meanwhile.

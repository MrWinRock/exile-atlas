# Map safety and crafting workbench implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User selected direct implementation in this chat/current checkout, with one independent final review.

**Goal:** Browser map-risk profiles and a sourced modifier browser with saved crafting recipes and budgets.
**Architecture:** Pure safety and recipe models consume the item parser and selected immutable game snapshot. Recoverable local libraries back independent safety/crafting screens; market quotes provide optional recorded costs.
**Tech Stack:** Installed Next.js/Bun/TypeScript/Zod/Zustand, existing storage/market helpers, Bun and Playwright.
**Spec:** `docs/superpowers/specs/2026-10-13-safety-crafting-design.md`.
**Dependency:** Complete `2026-10-13-item-data-search.md` first; use its ParsedItem, GameSnapshot, ModifierDefinition and ItemTransfer interfaces.

## Global constraints

Browser only; preserve unknown facts and source revisions. No survival prediction, crafting odds, guaranteed random result, profit estimate or game automation. Imports are atomic, maximum 100 records and 1 MiB UTF-8 per library; imported IDs are fresh. Search retains its 250-character budget. Read installed Next.js guides before product edits.

## Task 1 — explainable safety model

**Files:** create `src/lib/map-safety.ts`, `src/lib/map-safety-schema.ts`, `tests/map-safety.test.ts`.
**Interfaces:** SafetyProfile stores id/name/traits/rules/optional snapshotId. SafetyRule stores id/label/severity (`avoid` or `caution`), operator (`all` or `any`), conditions and explanation. Conditions reference verified stat IDs/numeric slots/ranges or explicit user traits. `evaluateMapSafety(item:ParsedItem,profile:SafetyProfile,snapshot:GameSnapshot):SafetyResult` returns matched findings with actual rolls, unresolved facts and status (`avoid`, `caution`, `no-flagged-condition` or `needs-review`). `prepareSafetyRegex(profile,snapshot):SafetyRegexPreview` returns representable selections and unsupported rules; complete transfer is disabled if any are unsupported.

- [ ] Write tests named actual_roll_threshold, combination_requires_both, unknown_requires_review, and complete_transfer_rejects_loss. Assert:
  ```ts
  expect(evaluate(fireDamage(20), thresholdAt20).status).toBe("avoid");
  expect(evaluate(fireDamage(19), thresholdAt20).findings).toHaveLength(0);
  expect(evaluate(recoveryOnly, recoveryAndDamage).findings).toHaveLength(0);
  expect(evaluate(recoveryAndDamageItem, recoveryAndDamage).findings).toHaveLength(1);
  expect(evaluate(unknownModifier, completeProfile).status).toBe("needs-review");
  expect(preview(unrepresentableCombination).canTransferComplete).toBe(false);
  ```
  Pin equal basic/advanced results, signed rolls, missing traits/IDs, definite avoid alongside unresolved facts, explicit reduced-rule selection, source-change warnings and immutable input.
- [ ] Run `bun test tests/map-safety.test.ts`; expect failure for missing model.
- [ ] Implement the signatures with the shared matcher. Record why every rule matches or cannot be evaluated. A missing trait/value never satisfies a condition or establishes safety. Keep stash-regex coverage distinct from item analysis; preserve an explicit chosen reduced subset.
- [ ] Run the same tests; expect all passing. Commit model/schema/tests as `feat: add explainable map safety rules`.

## Task 2 — safety profiles and screen

**Files:** create `src/lib/map-safety-store.ts`, `tests/map-safety-store.test.ts`, `src/components/map-safety.tsx`, `src/components/map-safety.module.css`, `e2e/map-safety.spec.ts`; modify `src/app/[section]/page.tsx`, `src/components/shell.tsx`, `src/components/settings.tsx`, `src/components/item-inspector.tsx` and `src/lib/item-transfer.ts`.
**Interfaces:** store actions create/update/duplicate/delete/export/import profiles with schemaVersion 1. Selection tracks stable ID; imports validate the whole payload before writing and use recoverableBrowserStorage. The screen consumes SafetyResult/SafetyRegexPreview and confirmed ItemTransfer.

- [ ] Write store tests for 100-record/1-MiB boundaries, fresh imported IDs, atomic malformed import, unavailable/quota-failed storage and preserved unreadable bytes. Write a browser story that creates traits and two rules, pastes a Waystone, inspects roll/explanation/unknowns, edits a threshold, previews regex, saves/reloads and exports/imports. Cancellation must leave the regex draft intact.
- [ ] Run `bun test tests/map-safety-store.test.ts` and `bun run test:e2e e2e/map-safety.spec.ts --workers=2`; expect missing-feature failures.
- [ ] Implement `/safety` with profile/rule editors, numeric and combination controls, explicit no-known-flag/needs-review copy, source revalidation, complete/reduced transfer previews and deliberate deletion. Desktop/mobile keyboard users can inspect every condition and finding. Existing build references are notes, never inferred defences.
- [ ] Repeat tests on desktop/mobile; expect pass. Commit as `feat: add browser map safety profiles`.

## Task 3 — eligible pool, recipe and exact budgets

**Files:** create `src/lib/crafting.ts`, `src/lib/crafting-schema.ts`, `src/lib/crafting-budget.ts`, `tests/crafting.test.ts`, `tests/crafting-budget.test.ts`; extend verified currency-operation definitions in the game-data adapter.
**Interfaces:** `eligibleModifiers(baseId:string,itemLevel:number|undefined,snapshot:GameSnapshot):ModifierEligibility[]` returns eligible/ineligible/unknown plus reasons. CraftRecipe stores id/name/optional snapshotId/startingItemText/baseId/targets/ordered steps/budget/actualSpend/optional genesisPlanId/favorite. Steps contain currency or manual action, quantity, optional unit cost, quote currency/source/league/time and notes. `checkCraftStep(item:ParsedItem,operation,snapshot:GameSnapshot):CraftStepCheck` returns established preconditions and unknowns, never a changed item. `summarizeCraftBudget(recipe:CraftRecipe,quotes):CraftBudgetSummary` retains raw currency totals, priced subtotal, unpriced entries, actual spend and comparison completeness.

- [ ] Test verified ring tags/ordered rules and Strength levels 1 versus 74, conflicting groups, unknown bases/levels/targets and multiple possible affixes. Exalted steps require sourced rare-item/available-affix conditions: known normal item is ineligible; unknown affix occupancy stays unknown rather than counting stat lines. Random effects remain possibilities. Source fixtures establish core currency names/effects/preconditions before inclusion.
- [ ] Test exact decimal totals, missing quotes, mixed currencies, overrides and invalid quantities:
  ```ts
  expect(total([{quantity:"2",unitCost:"1.25"}]).pricedSubtotal).toBe("2.5");
  expect(total([{quantity:"1",unitCost:"0.1"},{quantity:"1",unitCost:"0.2"}]).pricedSubtotal).toBe("0.3");
  expect(total([{quantity:"2"}]).complete).toBe(false);
  ```
  Negative/nonfinite values fail validation; manual overrides retain provenance; stale/league-mismatched quotes stay explicit. Budget and actual spend never combine unlike currencies without a valid conversion.
- [ ] Run `bun test tests/crafting.test.ts tests/crafting-budget.test.ts`; expect failure.
- [ ] Implement pool eligibility using verified rules, with no guessed tiers/affix groups. Use six-decimal fixed-point integers internally and decimal strings in JSON (no persisted BigInt); reject excess precision visibly. Currency registry retains source receipts. Planned steps check available facts without simulating random outcomes.
- [ ] Repeat tests; expect pass. Commit as `feat: add sourced crafting recipes and budget model`.

## Task 4 — saved workbench and quote integration

**Files:** create `src/lib/crafting-store.ts`, `tests/crafting-store.test.ts`, `src/components/crafting-workbench.tsx`, `src/components/crafting-workbench.module.css`, `e2e/crafting-workbench.spec.ts`; modify `src/app/[section]/page.tsx`, `src/components/shell.tsx`, `src/components/settings.tsx`, `src/components/item-inspector.tsx` and `src/lib/item-transfer.ts`.
**Interfaces:** recipe library uses schemaVersion 1 and the same limits/recovery semantics as safety. Existing completed-hour currency API supplies optional recorded quotes; filling prices never overwrites manual costs. Genesis references use saved stable plan ID and retained historical/version label, without editing the plan.

- [ ] Test malformed/oversized imports, fresh IDs, quota failures, recipe duplicate/favorite/delete and source-change revalidation. Browser story: paste/select base, filter prefix/suffix/group/tags/tiers, choose targets, add/reorder/duplicate/remove steps, enter mixed costs and actual spend, link Genesis, save/reload/export/import. Verify unpriced entries stay visible and random effects never appear as actual resulting modifiers. Missing/deleted Genesis plans show a recoverable unresolved reference.
- [ ] Run `bun test tests/crafting-store.test.ts` and `bun run test:e2e e2e/crafting-workbench.spec.ts --workers=2`; expect failures before UI/store exist.
- [ ] Implement `/crafting` with source-qualified pool and target details, step/notes editors, explicit currency effects/preconditions, editable quote defaults, complete/incomplete totals, budget versus actual spend, local recipe library and Genesis reference. Confirm transferred item/targets before replacing drafts.
- [ ] Run the store/browser tests on desktop/mobile plus `bun run typecheck`, `bun run lint`, `bun run build`; expect zero failures/errors. Update tool documentation and commit as `feat: add browser crafting workbench`.

## Review focus

Unknown facts mistaken for a safe map (task 1); combination regex losing constraints (tasks 1–2); multi-line affixes mistaken for free crafting slots (task 3); unpriced/mixed currency counted as zero or exact market cost (tasks 3–4); storage/source/deleted-reference failures destroying saved plans (tasks 2–4). Tests above pin each failure mode.

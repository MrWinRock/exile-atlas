# Regex and Currency Implementation Plan

## Summary

- Builds: Tablet and Relic recommendations, exact hourly currency quotes, and an editable two-way exchange calculator.
- Touches: Regex Toolkit and Currency components, supporting pricing and recommendation logic, and their Bun and Playwright tests.
- Tests: At least seven requirement checks across unit tests and focused Playwright scenarios.

**Requirements.** [Approved requirements](../../inception/requirements-analysis/requirements.md)

## Scope and impact

The existing Next.js client workspaces remain the entry points. The recommendation model reads the active Regex catalogue and uses the existing compiler and draft store. The exchange views share the hourly rate calculation. Historical trends, digest export, and crafting continue to consume the existing bounds. The scope has no database, API, package, or runner configuration change.

Currency logic has multiple consumers. Preserve the existing normalized market and directional-comparison contracts. Any exact display rate on a market row is derived solely for the client from its selected direct pair. Regex changes affect Tablet and Relic drafts and the recommendation area of the existing tool.

## Implementation steps

- [x] **Step 1. Verify test tooling and baseline.** Confirm the existing Bun and Playwright commands in `unit-test-instructions.md`. The original Bun suite has 337 passing tests across 50 files. Use the repository's existing runners and this Testing Contract.
- [x] **Step 2. Implement recommendation logic.** In `src/lib/regex-recommendations.ts`, define a small set of named presets for each of Tablet and Relic. Pick distinct goals using category-supported IDs from the bundled/default and active catalogue. Provide a typed way to resolve and apply a preset to its category draft. Require every preset criterion to resolve and compile before application. Preserve unrelated edits where compatible, and remove a contrary exclusion for each recommended modifier. FR1–FR3.
- [x] **Step 3. Test recommendation logic.** Add `tests/regex-recommendations.test.ts` with separate Tablet and Relic checks that cover multiple compiling goals, plus checks for a missing criterion and mismatched category. Run the new Bun test file. FR1–FR3.
- [x] **Step 4. Implement exact quotes and conversion.** Add a shared single-rate calculation to `src/lib/currency.ts` using both valid directional endpoints. Expose the resulting rate where `src/lib/currency-market.ts` builds a row. Retain distinct outcomes for a missing market and a market with an unavailable single rate. Use one finite positive rate for left-to-right multiplication and right-to-left division. Choose the market row orientation from the unrounded rate, reversing below one. Provide readable formatting for positive prices below the default decimal precision. FR4–FR6, NFR1.
- [x] **Step 5. Test exact quotes and conversion.** Extend `tests/currency-comparison.test.ts` and `tests/currency-market.test.ts`. Cover proportional endpoints, close unequal endpoints, missing and invalid endpoints, the reciprocal, price orientation below and at one, and a tiny exact rate. Run the two Bun files. FR4–FR6, NFR1.
- [x] **Step 6. Connect the recommendation UI.** Add Tablet and Relic sections in `src/components/regex-toolkit.tsx` using existing panel and form styles, and small CSS module additions if needed. Show the goal and a button that updates only the active draft. A preset that cannot be applied is unavailable to the player. Provide stable labels and test IDs for the new controls. FR1–FR3.
- [x] **Step 7. Connect the currency UI.** Update `src/components/currency-comparison.tsx`, `src/components/currency-markets.tsx`, and their CSS modules as needed. Show both units for a single price in the comparison. Make each amount input editable and derive the opposite amount from the last-edited side. Render only one market-price expression per row, with `5 ↔ 1 [B logo]` for a rate of 0.2 B per A. Give the conversion inputs and the full market expression readable accessible names and preserve responsive behavior. FR4–FR6, NFR1.
- [x] **Step 8. Verify the route interactions.** Add `e2e/regex-recommendations.spec.ts` and update `e2e/currency.spec.ts` and `e2e/currency-market.spec.ts`. Exercise each recommendation tab, edit both amounts, swap, check exact and unavailable hours, and verify price direction, logo placement, and accessible wording. Keep existing unrelated interactions in those specs. Run the focused scenarios in both configured browser projects. FR1–FR6, NFR1.
- [x] **Step 9. Verify and record.** Run the focused checks and TypeScript verification. Record the observed results and any deviations for the code summary and requirements traceability.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop`, `classic` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:93cc30bfac56d027325cddc54558e948a7b3c5795d8b95fdf54be9cef18eb687",
  "contract_sha256": "sha256:55ed9576f1182de0615d887392d7d201fa1b6dc3599767f7260b15939c91944b"
}
```

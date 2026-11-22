# Code Generation Summary

## Changes

- `src/lib/regex-recommendations.ts`, `src/components/regex-toolkit.tsx`, and `src/components/regex-toolkit.module.css` provide three editable presets per category. Tablet goals are Pack density, Waystone sustain, and Item rarity. Relic goals are Honour protection, Honour pool, and Life pool. Applying a recommendation checks the active catalogue and updates only its category draft.
- `src/lib/currency.ts` and `src/lib/currency-market.ts` derive the selected-hour quote from two valid raw bounds. The rate check compares exact decimal cross-products before formatting. The same rate drives conversions and quote availability in both views.
- `src/components/currency-comparison.tsx` and `src/components/currency-comparison.module.css` let the player edit either quantity. Swapping moves the last entered amount with its currency. The completed-hour rate shows both units.
- `src/components/currency-markets.tsx` renders one price per row, with the item quantity on the left and one quote unit plus logo on the right for prices below one. Available prices sort using the direct rate. The historical trend and digest export use their existing data contract.

## Verification

- The full Bun suite passed with 344 tests across 51 files. The baseline was 337 tests across 50 files.
- The focused Bun run passed with 62 tests. Coverage includes preset applicability and isolation, rate equality across pair orientations, the one-unit threshold, invalid or incomplete bounds, and two-way arithmetic.
- The three focused Playwright specs passed in both desktop and mobile projects, six tests total. The local run used installed Chrome because the bundled Playwright Chromium was absent.
- TypeScript, targeted ESLint, and `git diff --check` passed.

The browser checks used fixture digests. The production build and remaining browser suite are pending broader verification.

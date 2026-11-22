# Test Results

## Build and Automated Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Production build | Passed, exit 0 | `bun run build` compiled with Next.js 16.3.8 and Webpack. TypeScript, four static pages, and build traces completed. `/[section]` is rendered on demand. |
| Full lint | Passed, exit 0 | `node .\\node_modules\\eslint\\bin\\eslint.js .` ran the repository's ESLint configuration. The revised browser spec also passed its targeted lint recheck. |
| Full Bun suite with coverage | 344 passed, 0 failed, 0 skipped | `bun run test --coverage`, 51 files and 10,759 assertions. The original suite had 337 passing tests. |
| Focused Bun checks | 62 passed, 0 failed, 0 skipped | `bun test ./tests/regex-recommendations.test.ts ./tests/currency-comparison.test.ts ./tests/currency-market.test.ts`, 122 assertions. These tests are included in the full Bun count. |
| Chrome browser regressions | 38 passed, 0 failed, 0 skipped | Playwright ran all selected specs against `next start` using installed Chrome on the desktop and mobile profiles. The final run took 24.9 seconds. |
| Requirements traceability | Passed | Seven requirements map to implementation or test files. |

Bun line coverage was 98.25% for `src/lib/regex-recommendations.ts`, 99.02% for `src/lib/currency.ts`, and 100% for `src/lib/currency-market.ts`. The Express Testing Contract sets no numeric coverage threshold. Browser component coverage was verified through interactions.

## Browser Scope

The 38 tests cover the Currency comparison, markets, and pickers plus the Regex Toolkit, recommendations, modifier coverage, presets, trade transfer, and Waystone behavior. The crafting workbench also passed. The exchange and artwork scenarios use test data. The local server reported refused connections to its configured Redis instance. Redis-backed operation was outside the browser checks.

## Issues Resolved During Verification

- An existing mobile scenario assumed the main navigation was open. The test now opens the mobile drawer for the navigation assertions and closes it before interacting with the Regex Toolkit.
- A mobile item-check interaction failed intermittently after Playwright reported interception by the floating search panel. The scenario now activates the same “Test item” button through the keyboard. Both updated scenarios and the other 36 scenarios passed on the final run.

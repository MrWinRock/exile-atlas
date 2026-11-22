# Unit Test Instructions

## Runner and configuration

Use the established Bun runner for domain tests and the existing Playwright configuration for route behavior. Dependencies and Next.js remain the versions pinned by the repository. Playwright uses the configured local web server and Chromium desktop and mobile projects. The original Bun suite finished with 337 passing tests across 50 files.

## Run the scoped tests

```powershell
bun test ./tests/regex-recommendations.test.ts ./tests/currency-comparison.test.ts ./tests/currency-market.test.ts
bun run test:e2e e2e/regex-recommendations.spec.ts e2e/currency.spec.ts e2e/currency-market.spec.ts
```

Run each layer's tests after its implementation. Build and Test checks the full existing suite separately.

## Test data and coverage

- Compile named presets using the default Regex catalogue for each category. Supply a reduced catalogue for the missing-criterion case. Verify the preset edits are isolated and the result remains editable.
- Use local normalized exchange rows. Make two quantity dictionaries proportional to produce one valid rate, distinctly unequal to test unavailability, and incomplete to test a missing bound. Use 0.2, 1, 2, and a very small positive exact rate for display boundaries.
- Use Playwright route stubs for deterministic digests, currency names and artwork. Test `10 A → 2 B`, right-field input `3 B → 15 A`, swap, clearing either input, and the single `5 ↔ 1 [B logo]` market expression.
- Cover every approved requirement and each changed component's normal path. The original suite remains a regression check.

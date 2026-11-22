# Cross-Unit Traceability

**Verdict:** Pass. All seven approved requirements map to existing implementation or test files. The Express plan uses a single stage-level implementation.

| Requirement | Owning stage | Target file | Verification |
| --- | --- | --- | --- |
| FR1 | Code Generation | `src/lib/regex-recommendations.ts` | Tablet catalogue and draft unit tests, plus Playwright in Chrome |
| FR2 | Code Generation | `src/lib/regex-recommendations.ts` | Relic catalogue and draft unit tests, plus Playwright in Chrome |
| FR3 | Code Generation | `src/components/regex-toolkit.tsx` | Incompatible catalogue, draft isolation, and editability checks |
| FR4 | Code Generation | `src/lib/currency.ts` | Raw ratio equality, listing consistency, and hour change checks |
| FR5 | Code Generation | `src/components/currency-markets.tsx` | One-quote orientation, boundary, and logo checks |
| FR6 | Code Generation | `src/components/currency-comparison.tsx` | Both edits, invalid input, and currency swap checks |
| NFR1 | Code Generation | `e2e/currency-market.spec.ts` | Small positive amount and accessible price-label checks |

Uncovered requirements: none.

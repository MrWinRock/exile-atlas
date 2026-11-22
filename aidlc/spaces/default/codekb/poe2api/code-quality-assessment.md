# Code Quality Assessment

## Existing Verification

Bun tests cover model parsing, currency ratio orientation and missing data, market history, regex compiler and preset behavior, source data processing, and server helpers. Playwright covers category interactions, Waystone recommendations, item controls, exchange pair selection, market rows and browser persistence. No tests or builds ran during this inspection.

`.github/workflows/publish.yml` runs Bun tests, ESLint and Next type generation with TypeScript checking before container publication. Playwright is configured separately. Repository docs cover local setup, optional credentials and infrastructure, and game-data provenance.

## Change-Sensitive Areas

- Waystone recommendations are keyed to fixed properties and tier 15. Tablet and Relic recommendations should be checked against live-on-page catalogue IDs, their valid selection mode and supported numeric fields.
- Exchange presentation currently assumes ranges. A representative value requires a rule for incomplete bounds and swap direction, plus tests that keep fractional rates visible. The bounds remain useful for history and crafting.
- Local data provenance, fixture versions and external game behavior are separate evidence. Browser tests can lock down application behavior with a fixed digest or snapshot.

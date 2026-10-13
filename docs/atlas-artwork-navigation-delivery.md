# Atlas, artwork and navigation delivery

User requests implemented:

- Sidebar scrolls independently; short-height desktop/mobile settings and close controls remain reachable.
- `/atlas`: seven sourced branch trees, node artwork/effects, connected allocations, independent planning budgets, descendant refunds, visit-local 50-step Undo, saved plans and JSON backups/imports.
- Genesis: matching artwork on all 243 source nodes in the graph/list/details, without changing graph identity or saved plans.
- Passive planner: header Undo retained and added to the canvas editing toolbar.

Atlas graph is the RePoE PoE2 2026-09-15 snapshot (source patch 4.5.5.2), with 575
records and seven roots. Artwork uses exact matching asset paths from the separately
disclosed 2026-07-04 art snapshot. Source/asset checksums and normalization details
are recorded in `public/data/poe2-atlas.NOTICE.md` and the preparation script.
Point budgets are user-supplied; conditional source choices and reward outcomes are
references rather than simulations. Atlas backups use the app's JSON format.

Verification:

- RED: no sidebar scroll, missing canvas Undo, zero Genesis graph images, missing Atlas route/model.
- GREEN: 315 unit tests / 10,539 assertions; all 106 desktop/mobile browser stories.
- Typecheck, lint, production build and `git diff --check` passed.
- Real-data screenshots checked on desktop/mobile after decoding both image sheets;
  no page errors or viewport overflow. Earlier screenshots captured before image
  decoding; QA was corrected to wait for actual images before visual assessment.
- Initial full unit run hit sandbox-denied Bash/Python deployment subprocesses;
  the permitted full rerun passed. No tests skipped or production code changed for that restriction.

Independent review and deployment: pending.

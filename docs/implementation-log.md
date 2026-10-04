# Implementation log

Ruling: Execute inline from the accepted stack and explicit “start build” request; user authorization takes precedence over skill approval handoffs.
Ruling: Browser localStorage stores anonymous build/filter drafts; PostgreSQL stores authenticated server data. This avoids requiring infrastructure to try the editors.
Ruling: Use Bun's native test runner instead of Vitest so runtime and unit tests agree.
Ruling: No Git commits/worktree because the target folder is empty and not a Git repository.

## Verified delivery

- Bun 1.4.2 runs Next.js development and production commands. Production preview binds to 127.0.0.1:3000.
- Final `bun run test`: 20 passed, 0 failed, 44 assertions. `bun run typecheck`, `bun run lint`, and `bun run build` passed.
- Live public API checks: official tree normalized to 4,912 nodes and 5,830 edges; currency digest returned 2,699 markets. Production `/api/status` reports Bun 1.4.2.
- Browser checks through the Codex browser: filter save/reload, locally hosted Monaco, passive search/allocation/library save, skill editing and save/reload, live currency rendering, mobile navigation, viewport width, and disconnected account setup. Production screenshot: `docs/preview.jpg`.
- A fresh reviewer identified equipment export IDs, canvas viewport reset, stale filter GET caches, lock contention, cross-league currency selection, and oldest-first history starvation. All were corrected and reviewed again. Live Titan allocation also confirmed a connected path from the Warrior start.
- Live tree import exposed null IDs on unpublished nodes; normalization now excludes those placeholders and has a regression test.
- Browser testing exposed unregistered React Hook Form values overwriting edited skills; the metadata merge now explicitly picks only guide fields.
- The authored Playwright suite was not executed. The in-app browser download-event check timed out; JSON export contracts are verified by Bun unit tests, while final native file-download receipt remains unverified.
- Real OAuth authorization/token refresh, PostgreSQL/Redis, the history worker, and Docker deployment remain unverified without approved credentials and running services. No account data or market data is fabricated.


## PoE2 artwork — 2026-10-04

- Added official passive sprite atlas mappings to the Pixi canvas, node search, and detail panel; covers all 4,912 exported nodes in both active and inactive states, including mastery effects and jewel-socket frames.
- Added /api/items and a searchable, paginated Item gallery with class/base/unique filters. RePoE PoE2 artwork uses a pinned revision and verified file manifest; the public PoE2 trade reference lists exclude legacy names. Internal DNT entries and the known legacy ItemisedTrial record are excluded.
- Final source coverage: 3,683 catalogue records, 3,683 mapped images, 3,683 distinct record IDs. Unique variants preserve their own original source keys and pictures. Name aliases prefer available artwork.
- Added images to currency pairs, build skills/supports, character equipment, and recursively nested socketed items. GGG character icons take precedence. Missing/failed item images retain labelled placeholders.
- Browser verification confirmed official canvas/detail icons, three distinct Grand Spectrum pictures, and loaded Earthquake/Compressed Duration I gems. Connected character data remains unverified because no approved OAuth credentials are configured.
- Added seven artwork tests for sprite rectangles, mastery prefixes, jewel fallback, release/internal filters, unique variant identity, safe paths, and PoE2 reference scoping. Full suite: 27 tests / 60 assertions; typecheck and lint pass. Production build and final responsive screenshots recorded below after verification.

- Production build passed after replacing deprecated Graphics child containers with proper Pixi Container nodes. Production browser has no warning/error logs for the tree renderer. Gallery filters and three distinct Grand Spectrum images pass at desktop and 390px mobile viewport, with no horizontal overflow. Proof: docs/item-gallery-preview.jpg and docs/passive-artwork-preview.jpg. Updated Bun production server listens on 127.0.0.1:3000.

## Passive tree overlap correction — 2026-10-04

- Root cause: 368 exported mastery decorations were drawn as opaque framed, clickable passives; several have exactly the same coordinates as real passives. Draw decorations behind the graph without pointer targets or frames; exclude them from search, allocation, persisted allocation counts, and build exports. Preserve all exported coordinates.
- Keep 22 item-only (isBlighted) records out of the positioned tree. Their artwork remains in normalized source data.
- Reduce real-passive frames and hit areas to fit tight clusters. A full export audit across 4,522 actual passives found zero frame/hit-area collisions within each base/ascendancy tree, versus hundreds of decoration/passive overlaps before correction.
- Preserve and render 1,733 exported orbit connection centers as short circular arcs, with exact endpoint coordinates. Bump normalized-tree cache to v4.
- Regression tests cover exact exported positions, orbit wrapping/direction, decorative/item-only allocation rejection, saved allocation filtering, and tightly spaced frames. Suite: 31 tests, 78 assertions; final build/browser verification recorded after completion.
- Final lint and production build (including TypeScript validation) passed. Live /api/tree returns 4,912 source records, 22 item-only flags, and 1,733 orbit centers. Browser verification confirmed distinct close-zoom icons, curved connections, preserved view after list selection, and canvas click selecting Mindful Awareness. No browser warnings/errors. Proof: docs/passive-spacing-preview.jpg. Updated production Bun server runs at 127.0.0.1:3000 with access to public source data.

## Docker development databases — 2026-10-04

- Added compose.dev.yaml and infra:up/down/status commands. The isolated poe2api-dev project runs only official PostgreSQL 18 and Redis 8 images, with persistent volumes, health checks, restart policies, and ports 5432/6379 bound to 127.0.0.1. Production Compose remains available separately.
- Generated a local PostgreSQL password into ignored .env and configured host DATABASE_URL/REDIS_URL in ignored .env.local. Credentials were not logged or added to source files. Initialized atlas_records with bun run db:setup.
- Verified healthy containers (PostgreSQL 18.6, Redis 8.10.2), SQL connectivity, Redis PONG and appendonly persistence, and app-level PostgreSQL JSON/Redis cache roundtrips; temporary verification keys were removed.
- Replaced the production preview with Bun development mode at 127.0.0.1:3000. Started the Bun history worker on the host; its first run stored 24 hourly currency snapshots. /api/status confirms both services configured, and /api/history returns all 24 snapshots with HTTP 200.
- Unit suite: 31 pass / 78 assertions. Lint passed. Browser Settings shows both services configured; proof: docs/infra-dev-preview.jpg. GGG OAuth credentials remain unset.

## Ascendancy centering — 2026-10-04

- Root cause: the official export stores ascendancy groups at distant offsets (Titan around x=-18,000), and the canvas fitted them together with the entire base tree. Added a view-only layout that centers the selected group at the base tree's origin and translates orbit centers consistently.
- Large groups scale uniformly into the central opening, including artwork, frames, hit areas, decoration graphics, and connections. The camera fits the selected group with space for controls, and refits it on viewport resize. Base-tree positions, source data, passive IDs, and allocation topology stay unchanged.
- Full-source audit and independent reviewer checks covered all 22 ascendancies with exported nodes: all centered, zero frame/hit collisions. Empty/missing ascendancy data falls back to the base tree.
- Four regression tests were observed failing before the fix, then passed; cover immutable source data, relative geometry/orbit centers, allocation routes, viewport centering, scaled frames, control margins, and empty-data fallback. Final suite: 35 tests / 116 assertions; lint and typecheck pass.
- Browser checks verified switching Titan/Warbringer, fresh mobile load, resizing back to desktop, preserved viewport on selection, and clicking Stone Skin at its centered canvas position. No saved allocations were added or removed. Proof: docs/ascendancy-centered-preview.jpg.
- Final production build passed. The existing preview needed a fresh reload after Fast Refresh warned about the changed effect dependency-array length; fresh-load and resize checks then used the updated renderer. Bun development mode and the Docker databases/history worker remain running.

## Passive rendering performance — 2026-10-04

- Reproduced a full WebGL Application rebuild on every selection: browser renderer-build counter increased from 1 to 2 when selecting Shock Chance. Separated scene lifetime from allocation/highlight updates; selection changes one overlay, allocations swap only changed node textures and redraw the active connections.
- Replaced thousands of per-node Graphics/Container/stencil-mask combinations with single sprites. Circular icons and frames are baked once per distinct artwork/state into shared 2048px atlas pages. Official icons, frame sizes, source positions, orbit connections and ascendancy scales remain intact.
- Added a spatial index for viewport visibility and pointer hits, and a coalescing requestAnimationFrame scheduler. Disabled the continuous Pixi ticker; idle views submit no frames. Dragging uses pointer capture and a movement threshold so panning does not select nodes; wheel and button zoom use the same bounds.
- Reviewer identified abandoned scene initialization during asynchronous asset loading. Load sheets before creating WebGL, and check AbortSignal before loading, after assets and after initialization. Cancellation regressions were observed failing before correction, then passing. Asset textures remain shared; scene-owned atlas/crop textures are explicitly destroyed.
- Browser measurements in the development preview: full-tree selection render submissions 7.1–9.8ms; Titan pan/zoom/selection submissions 0.9–2.1ms. Titan draws 21 nearby passives from 4,110 scene passives at its fitted desktop zoom. Renderer-build count remains unchanged through selection and allocation, and frame count stops while idle. These are CPU render-submission measurements, not a GPU FPS guarantee; initial texture uploads still occur when a scene is built.
- Verified canvas clicks, pan, zoom, fit, official artwork, active path/icon changes, rapid Titan/Warbringer switching with one surviving canvas, and 390px mobile resizing. Temporary ascendancy allocations were removed using the existing ascendancy filter, preserving the original one-passive base plan. Browser warning/error log is empty. Proof: docs/passive-performance-preview.png.
- Final suite: 41 tests / 133 assertions; lint, typecheck and production build pass. Independent follow-up review reports no remaining important findings. Bun development mode and Docker database/history services remain running.

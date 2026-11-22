# Dependencies

## Internal Dependencies

- Route sections depend on feature components. Components depend on `src/lib` for state, models, calculations and client API requests.
- Search Toolkit depends on a pinned or user-selected game snapshot, the compiler, preset storage and trade mapping. Its output can update the Trade workspace.
- Currency comparison, currency market rows and crafting budget lookup share `compareExchangePair`. History uses direct pair data in one quote currency over time.
- HTTP handlers and the history worker share the public digest adapter. Both can use the storage layer. The worker additionally needs the Redis-backed queue.

## External Data and Services

- GGG is the source of OAuth and account data, league and ladder data, public exchange digests and the official passive tree export.
- The repository ships datasets and source notices under `public/data`. Path of Building Community, PoE2DB, RePoE, GGG public trade reference data and official exports supply different catalogue and artwork inputs.
- Server session and snapshot storage use PostgreSQL when configured. Redis supports caching and job execution. The browser stores local workspace data independently.
- GitHub Actions publishes the container to GHCR. Deployment automation targets the existing tailnet server when enabled.

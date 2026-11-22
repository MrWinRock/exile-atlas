# Component Inventory

### Web Shell and Workspace

Routes, navigation, shared components, local storage helpers, backups and settings. Paths start in `src/app`, `src/components/shell.tsx` and `src/lib/workspace-*`.

### Search Toolkit and Trade

`RegexToolkit` manages five category drafts, criteria, copy, testing and presets. `WaystoneRecommendations` applies existing tier 15 property presets. `regex-catalogue-builder.ts` converts an active snapshot into a catalogue. `regex-search.ts` compiles item-search syntax and `regex-trade.ts` checks that the trade handoff is complete. `Trade` and the stat picker manage trade drafts and links.

### Currency Markets

`Currency` fetches current selected-hour and optional historical digests. `CurrencyComparison` handles pair and league selection and swap. `CurrencyMarkets` handles item listing, quote filtering, stock and history. `currency.ts` normalizes GGG rows and compares directional pairs. `currency-market.ts` indexes direct markets and derives market rows.

### Planning, Builds and Filters

Passive, Atlas and Genesis planners handle graph data and allocation state. Build library and comparison workspaces support local plans and imports. The filter editor manages visual rules and raw source, with GGG operations through the server.

### Item, Safety and Crafting Tools

The item catalogue and inspector resolve item details and artwork. Parsed items can move between supported local planning tools. Map safety evaluates configured rules, and crafting tracks steps and budgets using manual or market costs.

### Server and History Worker

The catch-all route uses server adapters for GGG, game snapshots, OAuth, Redis and PostgreSQL. The BullMQ collector shares the completed-hour digest client and persists snapshots. Build and deployment automation packages them with the Bun runtime.

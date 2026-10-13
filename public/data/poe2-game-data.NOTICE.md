# PoE2 game-data snapshot

Game data © Grinding Gear Games. Literal modifier/base tables are extracted from
Path of Building Community PoE2 at the revisions and SHA-256 digests recorded in
the snapshot. The source/license notice in [poe2-trade-stats.NOTICE.md](poe2-trade-stats.NOTICE.md)
applies, including the reproduced Path of Building software license.

Extraction never runs Lua. Hidden bases, rejected base tables and unsupported
modifier structures are retained in diagnostics. Applicability weights describe
source eligibility and are not advertised as crafting probabilities. Tier numbers
are not inferred from modifier ID suffixes.

Regex definitions are independently derived from the attributed trade-stat export.
Tablet and Relic facts are also extracted from public modifier tables at
[PoE2DB Tablet](https://poe2db.tw/us/Tablet) and
[PoE2DB Relics](https://poe2db.tw/us/Relics). Each source has a normalized definition
revision and an HTML SHA-256 receipt. No source JavaScript is executed or distributed.
The eight core currency effects are our summaries of the individually linked PoE2DB
currency pages, manually verified 2026-10-13; this registry requires explicit adapter
maintenance and is not automatically updated with modifier snapshots.
The reference application's code, generated tokens and datasets are not bundled.
Regenerate with `bun run scripts/prepare-game-data.ts`.

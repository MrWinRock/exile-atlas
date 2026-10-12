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
The reference application's code, generated tokens and datasets are not bundled.
Regenerate with `bun run scripts/prepare-game-data.ts`.

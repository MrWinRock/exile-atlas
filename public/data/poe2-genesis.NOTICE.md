# Genesis crafting-tree snapshot

Game data © Grinding Gear Games. Geometry and node/effect records originate from
the public PoE2 game data extraction in PraedythXIV's poe2-build-converter at
revision `27f5dad0d0979aa23a604defd11fcf7ae4668444`.

- [Graph source](https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/27f5dad0d0979aa23a604defd11fcf7ae4668444/src/data/genesisGraph.json)
- [Crafting references](https://raw.githubusercontent.com/PraedythXIV/poe2-build-converter/27f5dad0d0979aa23a604defd11fcf7ae4668444/src/data/genesisCrafting.json)
- [Original provenance notices](https://github.com/PraedythXIV/poe2-build-converter/blob/27f5dad0d0979aa23a604defd11fcf7ae4668444/THIRD-PARTY-NOTICES.md)

Captured 2026-07-04. Source patch identifier: `4.5.4.3`. This is a historical
snapshot: 243 graph records, 239 connections, and five independent Womb roots.
The PoE2DB page inspected 2026-10-12 reports a different passive count (180),
so parity with the current game is not established. Records from the two dates
are not mixed. Breachstones has only its Womb root in this graph.

Source records include conditional choice descriptions. The explorer labels
them as options and does not implement those choice mechanics, unlock state,
real point limits, odds, or profits. User point budgets are planning budgets.
Do not interpret the allocated effect list as an aggregated crafting simulation.
No upstream application or rendering code is included; game data is not
relicensed by the upstream software MIT license or by Exile Atlas.

Node artwork is now retained from the same revision's `genesisIcons.json` and
`src/assets/tree/genesis-icons.webp` (game art © GGG). Every one of the 243
records has a bounded sprite crop. Adding artwork does not change the plan
dataset identity, graph connectivity or effect snapshot. The preparation script
also verifies icon metadata and image SHA-256 digests.

Regenerate with `bun run scripts/prepare-genesis.ts`. The script verifies pinned
SHA-256 digests and validates every root, node ID, connection and branch before
writing. Refer to [current PoE2DB data](https://poe2db.tw/us/The_Genesis_Tree) when
planning against a newer patch. Exile Atlas is not affiliated with GGG.

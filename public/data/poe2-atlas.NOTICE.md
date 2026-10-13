# PoE2 Atlas skill-tree snapshot and artwork

Game data and artwork © Grinding Gear Games. This is a pinned planning snapshot,
not a claim of parity with the live game or a source of detected unlocks/point caps.

- Graph/effects: [RePoE PoE2 Atlas export](https://github.com/repoe-fork/poe2/blob/b818b843337cae43b090b272fd98bbc0fd3a34f3/data/passive_skill_trees/Atlas.json)
  at revision `b818b843337cae43b090b272fd98bbc0fd3a34f3`, commit 2026-09-15,
  source patch identifier `4.5.5.2`.
- Source SHA-256: `7148fa1989e273adfba30fdb5d3fb878a647158d79b4dddfdf4d08ea40632ebd`.
- [Matching artwork metadata](https://github.com/PraedythXIV/poe2-build-converter/blob/27f5dad0d0979aa23a604defd11fcf7ae4668444/src/data/atlasIcons.json)
  and `src/assets/tree/atlas-icons.webp` from revision
  `27f5dad0d0979aa23a604defd11fcf7ae4668444`, captured 2026-07-04, art patch `4.5.4.3`.
- Artwork matching uses exact DDS asset paths. All 575 exported nodes have a crop;
  effects and geometry always come from the September graph, independently of art.

Normalization uses the source orbit radii/index/count for coordinates, strips
display markup from stat text, preserves hash-addressed connections and seven
branch roots, and excludes 38 icon-only illustrations from allocation. Hash
`26306` has two placements in the source; the final placement is displayed as
one logical node with all connections retained, consuming at most one point.
No extra node IDs, options, point caps or simulated outcomes are invented.

Run `bun run scripts/prepare-atlas.ts` to regenerate. The script checks pinned
SHA-256 digests, finite geometry, roots, sprite bounds and connectivity before
writing. No upstream planner or rendering code is copied. Application JSON backups
are independent Atlas plans, not in-game `.build` files. Exile Atlas is not
affiliated with or endorsed by GGG.

# Browser-only PoE2 companion expansion

## Intent and constraints

Extend the existing personal Exile Atlas website with the user's selected tools:
item inspector, complete regex coverage, map safety checker, crafting workbench,
build comparison, patch-aware data updates, and corrected weapon-set tree colors/views.
Every user flow must work in a desktop/mobile browser. No executable download,
game overlay, background clipboard reader, or installed companion is required.
The existing hosted Next.js/Bun service can fetch/cache public game data.

Pasted English item text, user-selected files, and existing saved builds are the
primary inputs. GGG account connection remains optional. Keep existing builds,
regex presets, Genesis plans, and filter drafts intact.

The user selected modifier browsing, saved recipes, and cost budgets as the first
crafting workbench. Probability simulation is outside this release.

## Proposed approach

Use shared parsing and versioned game data so the inspector, regex generators,
safety checker, and workbench interpret the same item/modifier consistently.
This requires more foundation work before new screens, but avoids four separate
interpretations of one pasted item. Independent screen-specific parsers would
ship initial pages earlier but require subsequent reconciliation and migration;
the shared approach is recommended.

Deliver independently testable stages in the current checkout:

1. **Weapon-set view fix:** set I red, set II green, persistent in-canvas switching,
   and a both-sets view. This bounded change can ship first.
2. **Item/data/search foundation:** item inspector, complete reference coverage
   for the other regex categories, and patch-aware dataset status/update handling.
3. **Decision tools:** map safety profiles/checks and the recipe/cost workbench.
4. **Build comparison:** saved/imported build differences with weapon-set identity.

Detailed requirements are split into three subsystem specs:

- [Item/data/search](2026-10-13-item-data-search-design.md)
- [Safety/crafting](2026-10-13-safety-crafting-design.md)
- [Build comparison](2026-10-13-build-comparison-design.md)

Implementation stays in this chat, following the user's existing preference,
with one independent final review. Read installed Next.js guides before product
changes. No new dependency, app account, or external project is required by this design.

## Weapon-set view fix

- Shared allocations retain gold `#dab077`.
- Weapon set I uses red `#e67878`; weapon set II uses green `#74c99a` for node
  frames, paths, legends, mode badges, and counters.
- Shared / Set I / Set II switches remain available alongside the canvas controls
  while the canvas is in use. Switching changes the editing context and visible
  active tree without deleting or reallocating either plan.
- Add a **Show both sets** view toggle. Overlay both independent allocations;
  shared stays gold. A node/edge present in both sets must represent both colors
  rather than being silently reclassified as shared. Identify membership in text
  in the selected-node panel, so color is not the only indicator.
- The active editing set remains explicit in the both-sets view. An allocation or
  refund affects that context only, under existing connection/refund rules.
- Pan/zoom/selection survive view switches; keep the existing renderer instance
  instead of rebuilding the canvas for each switch.
- Preserve current budgets, class/ascendancy behavior, imports, and `.build`
  `weapon_set` values. This request does not change game allocation rules.

Acceptance: colors agree everywhere; both sets remain switchable and inspectable
on desktop/mobile; duplicated set membership displays correctly; switching,
reload, save/export/import, and viewing both never change stored allocations or budgets.

## Shared delivery requirements

- Use existing dark styling, accessible controls, mobile layouts, and recoverable
  local storage. Each new library has clear export/import and explicit deletion.
- Preserve unsupported IDs and unknown text for review. Avoid guessed modifier
  identity, affix tier, prefix/suffix classification, DPS, or crafting odds.
- Source/licence and snapshot metadata accompany extracted game data. Check
  source data before claiming complete coverage, and test copied search tokens
  against modifiers, headers, and permitted numeric formats.
- Existing search budget remains 250 characters. Retain complete output and show
  why copying is unavailable when a configuration exceeds it.
- Verify the original reported weapon-set behavior and each new browser flow;
  meaningful parser/data/logic tests plus desktop/mobile integration tests,
  typecheck, lint, production build, and independent review precede release.

## Implementation plans and review status

The user approved these written specifications on 2026-10-13. Product implementation
has not started. Implementation plans are prepared for review in dependency order:

1. [Weapon-set views](../plans/2026-10-13-weapon-set-views.md)
2. [Item inspection, datasets and regex coverage](../plans/2026-10-13-item-data-search.md)
3. [Map safety and crafting workbench](../plans/2026-10-13-safety-crafting.md)
4. [Build comparison and final release verification](../plans/2026-10-13-build-comparison.md)

After written-plan review, use the already selected direct implementation in this
chat and current checkout, followed by one independent final review. The existing
authorization to merge master for deployment remains the release instruction.


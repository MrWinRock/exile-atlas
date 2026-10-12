# English PoE2 regex coverage

Reference: veiset/poe.re revision `4ae8978f28eb025aa14ba46fc2920c9358285f93`,
PoE2 Tablet, Relic, Item and Vendor pages. Source definitions are independently
extracted from the attributed PoB snapshot and PoE2DB game modifier tables.
Reference code, regex tokens and generated datasets are not distributed.

The control-to-source inventory is `public/data/poe2-regex-coverage.json`.

| Reference category | Distinct controls/effect families | Independently matched |
| --- | ---: | ---: |
| Tablets | 86 | 86 |
| Relics | 31 | 31 |
| Equipment, verified PoE2 classes | 513 | 513 |

Equipment compound reference families use independently sourced constituent
lines; users can select their individual ranges and Any/All membership. The
reference also contains PoE1 Heist, Contracts, Blueprints, Sentinels and inactive
hidden/weapon classes. These are outside the verified PoE2 class inventory;
their presence in an upstream generated file does not establish game availability.

Vendor controls: rarity, corruption, quality, sockets, item/required levels,
base/class, resistances, attributes, life/mana/spirit, movement/attack/cast speed,
physical/spell/elemental damage and skill-level families. Numeric source metadata
drives signed/multi-roll bounds. Decimal properties declare their scale. Unknown
precision stays presence-only; an average trade stat cannot carry per-roll bounds.

Existing Waystone IDs and compact fragments retain their verified parity tests.
New exact tokens retain complete criteria and the 250-character copy guard.
Each dataset identifies its revision/date and rejects unsupported formats during
staging. Public source changes are not silently described as a game patch.

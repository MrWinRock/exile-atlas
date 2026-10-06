# PoE2 trade stat catalogue

Game data (c) Grinding Gear Games.

This catalogue is a literal-data conversion of [TradeSiteStats.lua](https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/bb52d6b368307457eb9c54bb13f1829993d390b1/src/Data/TradeSiteStats.lua) from Path of Building Community PoE2 revision `bb52d6b368307457eb9c54bb13f1829993d390b1`. Its source identifies the original data as the PoE2 trade site's stat catalogue. Regeneration reads only the pinned community repository; it does not call GGG's internal trade endpoints or execute Lua.

The JSON preserves 8,293 source entries in 10 groups, including 80 alternate labels sharing stat IDs (8,213 unique IDs). Consumers should use a compound identity of group, ID and text for list keys while retaining the original stat ID in searches. The catalogue is a snapshot; additions and changes on the official trade website may appear later.

Regenerate with `bun run scripts/prepare-trade-stats.ts`. The script checks the pinned Git blob digest, schema, group list, unique compound entries and expected counts before writing.

The upstream repository's software license is reproduced below. The upstream game-data copyright notice remains applicable to the catalogue; this notice does not relicense GGG's game data.

## Path of Building software license

```text
Path of Building Community:

*******************************************************************************

Copyright (c) 2016 David Gowor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*******************************************************************************
```

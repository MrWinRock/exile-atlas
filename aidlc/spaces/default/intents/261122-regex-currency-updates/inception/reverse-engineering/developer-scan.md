## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**: Application routes, feature components and libraries, server adapters, worker, test surfaces, data preparation scripts, build and deployment definitions, and project documentation across the repository. Followed the Regex and Currency flows from route to data and tests.
- **Skimmed only**: Graphics and generated dataset contents. Inspected data source notices and source adapters.
- **Left out**: AI-DLC install and records, Git internals, ignored environment files, installed dependencies, generated editor assets, build products and test reports.

### Packages Found

- `exile-atlas` is the single private TypeScript web package. The Bun worker shares its currency, configuration and storage modules.

### Build System

- `package.json` and `bun.lock` define the Bun workspace. `next.config.ts`, `tsconfig.json`, `postcss.config.mjs` and `Dockerfile` configure the web build. Compose wires optional PostgreSQL and Redis to the web and history worker.

### APIs Discovered

- `src/app/api/[...path]/route.ts` routes GET and POST. Public surfaces include status, item and tree references, game-data snapshots, and completed-hour exchange digests. OAuth-backed surfaces include characters, filter operations and league data.

### Frameworks & Libraries

- Bun 1.4.2 in Docker, Next.js 16.3.8, React 19.3.0 and TypeScript 5.9.3 in the lockfile. See the stack and dependency inventories for library roles.

### Test Coverage

- `tests/` uses Bun and `e2e/` uses Playwright. No configured coverage floor was found in `package.json`. This scan inspected tests without running them.

### Code Quality Indicators

- ESLint, TypeScript checks and Bun tests run in the publishing workflow. `README.md`, `deploy/README.md` and the shipped data notices document runtime and source boundaries.

### Technical Debt Signals

- `src/components/regex-toolkit.tsx` combines draft editing, presets, recommendation UI, item testing and trade transfer. Its recommendation selection and property mapping are Waystone-specific.
- `src/components/currency-comparison.tsx` and `src/components/currency-markets.tsx` format displayed ranges independently, while `src/lib/currency-market.ts` already derives a range midpoint for charts and automatic quotes.

## Handoff Summary

- **Intent-relevant finding**: The tablet and relic catalogue and tab state already exist. Only the Waystone tab renders the recommendation panel (`src/components/regex-toolkit.tsx:205`). Raw exchange bounds are paired quantities (`src/lib/currency.ts:83`), and the pair comparison renders both endpoints as `1 : low – high` when they differ (`src/components/currency-comparison.tsx:248`).
- **Risks / follow-up**: Preserve snapshot-specific modifier mapping, user drafts and trade transfer behavior. Hourly digests lack a traded-average field. Agree on the derived single-value rule and orientation, and retain the shared bounds used by the crafting workbench.

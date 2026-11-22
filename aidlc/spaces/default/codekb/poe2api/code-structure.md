# Code Structure

| Path | Responsibility |
| --- | --- |
| `src/app/` | App Router route entry points, root layout, global styles, error UI and HTTP handlers |
| `src/components/` | Feature workspaces, shared UI, renders for graphs and item artwork, styles |
| `src/lib/` | Domain schemas and services, search and pricing functions, Zustand stores and client adapters |
| `src/server/` | Configuration, API adapters, logging, OAuth, public request limits, cache, storage and snapshot processing |
| `src/worker/` | Scheduled collection process |
| `scripts/` | Prepare bundled data and editor assets |
| `public/` | Browser assets, pinned game data and attribution notices |
| `tests/` and `e2e/` | Bun tests, fixtures and Playwright scenarios |
| `deploy/` and `.github/workflows/publish.yml` | Deployment configuration, automation and operating instructions |
| `docs/` | Feature design notes and deployment references |

## Patterns

`src/app/[section]/page.tsx` maps URL sections to feature exports. Client workspaces compose domain logic and local CSS modules. App Router API handlers delegate to server modules and return JSON or OAuth redirects. Zod validates game data, browser imports and selected API inputs.

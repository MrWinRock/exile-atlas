# Exile Atlas

A PoE2-only web workspace running on **Bun**, with Next.js and TypeScript.

## Run locally

Requires Bun 1.4.2 or newer.

```powershell
bun install --frozen-lockfile
bun run prepare:assets
bun run dev
```

Open http://127.0.0.1:3000. No account credentials or database are required for the local build/filter editors. Public currency history and the official passive-tree export require network access to GGG/GitHub.

`prepare:assets` copies the installed Monaco editor's static files into `public/monaco`. This keeps the advanced editor independent of an external CDN. Rerun it after updating Monaco.

## Development databases in Docker

The development overlay runs PostgreSQL 18 and Redis 8 in the isolated `poe2api-dev` Compose project, with persistent volumes and localhost-only ports. Run the Bun app on the host.

Set `POSTGRES_PASSWORD` in `.env` to a random hexadecimal password. Set these in `.env.local`, using the same password:

```dotenv
DATABASE_URL=postgres://atlas:YOUR_PASSWORD@127.0.0.1:5432/atlas
REDIS_URL=redis://127.0.0.1:6379
```

```powershell
bun run infra:up
bun run db:setup
bun run dev
```

Run `bun run worker` in another terminal to collect currency history. Check containers with `bun run infra:status`. `bun run infra:down` stops the development containers and keeps their volumes. Local credentials are ignored by Git and excluded from Docker builds.

## Features

- Overview with real counts from your browser workspace.
- Build library: local persistence, validated JSON import, skills/supports, equipment hints, advanced JSON fields, `.build` download.
- Filter editor: rule generator, styling preview, local syntax checks, local persistence, Monaco editor, `.filter` download, authenticated GGG create/update and full validation.
- Passive planner: official export IDs and main-tree coordinates, searchable nodes, zoom/pan, class views, centered ascendancy groups, shortest-path allocation, `.build` export and library save. Selecting an ascendancy focuses the camera on it; larger groups scale uniformly into the central opening, including their frames and curved connections. Batched artwork, viewport culling and redraws on demand keep interaction responsive; selection and allocation updates retain the existing canvas.
- Currency dashboard: completed-hour public digests, league/search filtering, volume sorting, min/max ratio charts, raw market inspection, JSON export, collected trends when the worker is configured.
- Account characters: authenticated profile/list/detail, equipment and skills, import passive allocations to build guides.
- Item gallery: searchable PoE2 base items and unique variants, class/type filters, paginated artwork. Item images also appear on currencies, build gems/supports, and character equipment/socketed items.
- Passive artwork: official active/inactive sprites on the tree canvas, search results, and node details, including jewel-socket frames. Exported mastery graphics render as faint, noninteractive cluster decorations behind real passives. Item-only records stay outside the positioned tree. Connections retain GGG's orbit geometry.
- Leagues and top-1,000 ladders through approved service scopes.

## GGG account setup

GGG currently cannot process new application registrations. You need an existing approved confidential OAuth client. The UI stays explicit about disconnected features; it does not substitute sample account data.

Registration requirements and the authorization flow are documented in [GGG's authorization guide](https://www.pathofexile.com/developer/docs/authorization).

1. Copy `.env.example` to `.env.local`.
2. Set `APP_URL` to your registered HTTPS domain and `POE_REDIRECT_URI` to its `/api/auth/callback` URL. GGG does not accept localhost callbacks for confidential clients.
3. Set `POE_CLIENT_ID`, `POE_CLIENT_SECRET`, `POE_CONTACT`, and a random 32-byte `TOKEN_ENCRYPTION_KEY` encoded as 64 hexadecimal characters.
4. Set `DATABASE_URL`, then run `bun run db:setup`.
5. Restart the application and use **Settings → Connect with Path of Exile**.

For local development, keep these values in the server-only `.env.local` copied from the root `.env.example`. Replace every placeholder with your own configuration; the HTTPS hostname must match the registered application:

```dotenv
APP_URL=https://your-domain.example
POE_CLIENT_ID=your-registered-client
POE_CLIENT_SECRET=your-client-secret
POE_CONTACT=you@example.com
POE_REDIRECT_URI=https://your-domain.example/api/auth/callback
TOKEN_ENCRYPTION_KEY=<64 hexadecimal characters>
DATABASE_URL=postgres://atlas:YOUR_PASSWORD@127.0.0.1:5432/atlas
REDIS_URL=redis://127.0.0.1:6379
```

For the deployed VPS, edit `/opt/stacks/exile-atlas/.env` instead of creating `.env.local`. Follow [deploy/README.md](deploy/README.md) and its environment template; the production Compose file supplies the internal PostgreSQL and Redis connection URLs. Credentials stay on the server, and populated environment files must stay out of Git.

Required account scopes: `account:profile account:characters account:item_filter`. League services need `service:leagues` and `service:leagues:ladder` via client credentials. Never expose secrets as `NEXT_PUBLIC_*` variables. Use HTTPS and persist the same encryption key across restarts. Changing it invalidates saved encrypted tokens.

Sessions are opaque HttpOnly SameSite cookies. OAuth uses state and PKCE. Account tokens are encrypted with AES-256-GCM in PostgreSQL. Mutating API requests require the configured origin. Account fetches are cached per token; upstream request limits and cooldowns are honored. The API User-Agent identifies the application and contact.

## Currency history worker

Configure PostgreSQL and Redis, run `bun run db:setup`, then:

```powershell
bun run worker
```

The separate Bun/BullMQ process backfills up to 24 completed hours at startup, then runs at minute 5 of each UTC hour. Snapshots expire after 90 days. GGG may remove older upstream history; the worker logs failures and retries with backoff. Keep one deployment's web and worker processes on the same Redis instance.

The `/api/status` configuration flags are setup diagnostics. `databaseConfigured` and `redisConfigured` indicate that connection values are present; `oauthConfigured` indicates that the required setup values pass local validation. These flags do not verify a running database, a working Redis connection, a running worker, or GGG approval. Historical trends require the database schema, PostgreSQL, Redis and the worker to be running. The VPS deployment runs schema setup and the worker through Compose services.

## Verification

```powershell
bun run test
bun run typecheck
bun run lint
bun run build
```

The unit suite lives in `tests/`. Browser tests in `e2e/` cover persistence, exports, disconnected states and responsive width. To run those in your environment: `bunx playwright install chromium` and `bun run test:e2e`. These tests expect no GGG credentials and use isolated browser contexts.

## Production

For the GitHub Container Registry workflow and tailnet VPS stack under `/opt/stacks/exile-atlas`, see [deploy/README.md](deploy/README.md).

```powershell
bun run prepare:assets
bun run build
bun run start
```

All Next.js CLI scripts include `bun --bun`; Bun is the runtime, not only the package manager. Production binds to `0.0.0.0` for container networking. Use an HTTPS reverse proxy in front of it.

Docker: set `POSTGRES_PASSWORD` in your shell or Compose `.env`, create `.env.local`, then `docker compose up --build -d`. Initialize the database with `docker compose exec web bun run db:setup`. Enable the worker with `docker compose --profile history up -d worker`. The published web port binds to loopback by default; PostgreSQL and Redis have no host ports. Configure backups for the database volume. Docker uses the same Bun version as development.

## Current boundaries

- OAuth, authenticated endpoints, PostgreSQL and Redis need real credentials/services for live verification.
- Tree allocation is a guide: it does not compute DPS, enforce quest budgets, or implement all class-specific node overrides. Ascendancy nodes can be explored/exported. Choose the correct official IDs when authoring guides.
- Imported character guides copy passive IDs; skills remain visible in the viewer and can be added manually using metadata IDs. GGG's item response does not always supply IDs suitable for `.build` skills.
- Local filter validation checks block structure, quotes and label-size bounds. Only GGG can fully validate against the running game.
- Currency names and images match community metadata where available; unknown currencies retain readable metadata identifiers. The chart shows actual reported ratio bounds, never invented spot prices.
- Artwork is loaded directly from GGG and the [RePoE PoE2 export](https://github.com/repoe-fork/poe2). GGG tree data and sprite sheets use one pinned Git revision; community images are checked against the same revision's file manifest. Metadata is cached for 24 hours. Missing or failed item images show a labelled fallback.
- The community dump includes legacy records. The gallery restricts names to the public PoE2 trade reference lists and excludes the known legacy Inscribed Ultimatum record. These `/api/trade2/data/items` and `/api/trade2/data/static` reference endpoints are public but outside GGG's supported developer API; availability may change. The gallery covers matched exported bases and uniques, not every possible procedural rare-item appearance or non-tradeable quest item. Connected characters use GGG's exact item icons.
- Drafts live in this browser; export portable backups. Server build synchronization/sharing is not implemented.
- PoE2 stash access, unequipped inventory, Atlas allocations, live item-trade search/execution and PvP APIs are not available through these documented endpoints.

Sources: [GGG API reference](https://www.pathofexile.com/developer/docs/reference), [file formats](https://www.pathofexile.com/developer/docs/game), [official tree export](https://github.com/grindinggear/poe2-skilltree-export), [Bun/Next.js guide](https://bun.sh/guides/ecosystem/nextjs).

This product isn't affiliated with or endorsed by Grinding Gear Games in any way.

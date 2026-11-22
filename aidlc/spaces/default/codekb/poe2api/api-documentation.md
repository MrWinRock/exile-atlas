# API Documentation

`src/app/api/[...path]/route.ts` handles these application endpoints. Except for GET status, requests pass through the public request limiter. POST validates origin. Successful GET JSON responses use `Cache-Control: no-store`. Unrecognized paths return 404, and validation or upstream errors use the common response formatter.

| Method and path | Contract and access |
| --- | --- |
| GET `/api/status` | Runtime configuration and current connection state. Public. |
| GET `/api/auth/start` and `/api/auth/callback` | Start or finish GGG OAuth, using redirects. |
| POST `/api/auth/logout` | End the current browser session. |
| GET `/api/characters[/id]`, GET `/api/filters[/id]` | GGG character and PoE2 filter records. Requires an account session. |
| POST `/api/filters[/id]` | Validate and create or update a PoE2 filter using GGG. Requires an account session. |
| GET `/api/leagues[/id]` and `/api/ladder?league=…&offset=…` | GGG league and ladder data. Uses a service token. |
| GET `/api/currency?hour=…` | Eligible completed UTC hour in epoch seconds. Returns source, digest hour, change ID, fetched time and normalized markets. Defaults to the latest completed hour. |
| GET `/api/history` | Returns up to 24 hourly snapshots and whether database history is configured. |
| GET `/api/tree` and `/api/items` | Official tree export and item reference catalogue respectively. Public. |
| GET `/api/game-data/status` and `/api/game-data/snapshot?id=…` | Bundled source metadata or a validated game snapshot. |
| POST `/api/game-data/check` and `/api/game-data/stage` | Check upstream revisions or stage a validated snapshot. Stage accepts a 40-character hexadecimal revision. |

## External Sources

The server consumes GGG account and league APIs, the public PoE2 currency CDN, the official GitHub skill tree, and game-data sources described in `dependencies.md`. The in-browser trade and regex flows can generate search links or criteria from bundled references.

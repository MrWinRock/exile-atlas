# Exile Atlas — PoE2 web workspace

## Intent and authorization

Build all supported PoE2 features discussed in this chat, with Bun replacing Node.js. The user explicitly instructed execution after reviewing the stack. Proceed inline without additional design-approval rounds. No existing repository or files are present. This is a new architectural project.

## Interface

A responsive dark editorial dashboard: charcoal panels, warm amber highlights, serif titles, compact utility typography, fixed desktop navigation. Routes: overview, characters, filters, leagues, currency, planner, builds, settings. Every action either works, explains its prerequisite, or displays a recoverable error. Never portray invented data as live data.

## Functional scope

Public currency history uses the documented PoE2 CDN endpoint with completed-hour timestamps. Passive-tree viewer consumes GGG's official export. Local build and filter editors support browser persistence, JSON import, validation and download. The .build export follows the documented single Build object (name, author, description, ascendancy, passives, skills, inventory_slots). Account characters, profile, item filters, leagues and top-1000 ladders use documented endpoints with an approved OAuth client. Do not expose PoE1-only stash, inventory, Atlas, or trade-search features.

## Architecture

Next.js App Router on Bun; TypeScript across web and worker; React Query for browser requests, Zustand for planner state, Zod for validation. PostgreSQL/Drizzle stores encrypted account sessions and history. Redis coordinates cache, request budgets and queue jobs when configured. Public requests can run without PostgreSQL/Redis; account login needs PostgreSQL and a 32-byte encryption key. BullMQ runs in a separate Bun worker. Editors use Monaco; charts ECharts; tree renderer PixiJS, positioned with official coordinates.

## Security and error behavior

OAuth authorization code + PKCE + state, fixed configured redirect URI, server-only secrets, opaque HttpOnly SameSite cookies, encrypted tokens, refresh locks. Same-origin checks for mutating routes, owner-scoped filter operations, maximum document size. Cache account requests per session. Respect Retry-After and returned limit headers; avoid automatic retry loops for 4xx. OAuth configuration failures produce human-readable setup states. Tokens, secrets and upstream sensitive bodies never appear in logs or client responses.

## Delivery and validation

Bun dev/build/start/test/worker scripts; example environment configuration; Docker deployment and README. Unit tests cover build roundtrip and invalid inputs, filter syntax, completed-hour bounds, currency normalization, PoE2 URL encoding, rate-limit cooldowns, token encryption and state validation. Browser tests cover navigation, editor persistence/export and disconnected states; manually inspect desktop/mobile. OAuth live verification requires user's registered credentials and is reported separately.

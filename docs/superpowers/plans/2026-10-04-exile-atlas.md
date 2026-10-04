# Exile Atlas Implementation Plan

> Use superpowers:executing-plans to implement this plan inline, task by task.

**Goal:** Deliver a usable Bun-powered PoE2 workspace for the supported API and file features.
**Architecture:** Next.js web/API app and optional BullMQ worker. Public tools and browser drafts work without credentials; PostgreSQL and Redis provide production persistence and coordination.
**Tech Stack:** Bun, TypeScript, Next.js, React, Tailwind, React Query, Zustand, Zod, PostgreSQL/Drizzle, Redis/BullMQ, oauth4webapi, Monaco, PixiJS, ECharts.
**Spec:** docs/superpowers/specs/2026-10-04-exile-atlas-design.md

## Global Constraints

- PoE2 only. Bun dev/build/start/worker runtime.
- Never portray invented data as live data.
- No secrets in browser responses or logs.
- Local draft tools usable without OAuth, PostgreSQL, or Redis.
- Upstream failures are visible and recoverable.

## Review Focus

- Malformed imported .build files must not overwrite a valid draft.
- Unicode character/league names must be URL-encoded as one segment.
- Currency timestamps must reject current/future hours.
- Missing configuration must produce setup guidance, not an internal crash.
- OAuth state mismatches and cross-origin mutations must be rejected.

## Task 1: Domain and export contracts

Files: src/lib/{build,filter,currency,poe,tree}.ts; tests/domain.test.ts.
Interfaces: parseBuild(text): Build; exportBuild(build): string; generateFilter(settings): string; completedHour(now): number; normalizeMarket(raw): Market; poePath(resource,name?): string; normalizeTree(raw): Tree.

- [x] Write failing tests for roundtrip, bad input, realm enforcement, cooldown and encryption.
- [x] Run `bun test`; confirm RED.
- [x] Implement domain modules and run `bun test`; confirm GREEN.

## Task 2: Server integration

Files: src/server/{config,crypto,storage,poe-client,oauth,responses}.ts; src/app/api/[...path]/route.ts; src/server/db/{schema,setup}.ts; src/worker/index.ts.
Interfaces: API GET status/characters/filters/leagues/ladder/currency/tree; POST filters; OAuth start/callback/logout. Session access never returns tokens.

- [x] Add failing tests for request path, same-origin checks, rate limits, token roundtrip/tampering.
- [x] Implement secure server integration, optional shared cache/database/worker and rerun suite.

## Task 3: Usable frontend

Files: src/app/{layout,page,globals.css}.tsx; src/components/{shell,dashboard,characters,filters,leagues,currency,planner,builds,settings,ui}.tsx; src/components/providers.tsx.

- [x] Create responsive shell and routed pages with explicit source/setup indicators.
- [x] Implement local persistence, imports, downloads, charts, tree allocation and API actions.
- [x] Verify build/typecheck/lint and fix failures.

## Task 4: Delivery and browser verification

Files: README.md; Dockerfile; compose.yaml; playwright.config.ts; e2e/workspace.spec.ts.

- [x] Write browser tests for navigation, filter/build downloads and disconnected account flow.
- [x] Run full Bun unit suite, typecheck, lint, production build and manual browser checks. Authored Playwright suite remains unexecuted; see implementation log.
- [x] Inspect desktop/mobile, review security and limits, preserve evidence in implementation log.
- [x] Start production server with Bun and open in Codex.


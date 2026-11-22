# Build Instructions

## Prerequisites

Use the Bun runtime and dependencies from the repository's lockfile. When preparing a fresh checkout, install dependencies with `bun install --frozen-lockfile`. This checkout already has its dependencies. The local build and fixture-driven browser checks do not need a running database or a live exchange feed.

## Build and verify

Run from the workspace root.

```powershell
bun run build
bun run lint
bun run test --coverage
```

A successful build finishes Next.js compilation, TypeScript checking, and route generation. The lint and test commands should each exit successfully. The application build is written under `.next`.

## Browser verification

Run the focused commands in [Unit Test Instructions](../code-generation/unit-test-instructions.md). Use a Playwright-compatible Chromium installation. If the bundled browser is unavailable, select an installed Chrome executable in a temporary local Playwright configuration. Build and Test can point both configured screen sizes at the built application by starting it on a loopback port with `bun --bun next start --hostname 127.0.0.1 --port 3719`. Preserve the repository's browser profiles and fixture routes.

## Troubleshooting

If PowerShell cannot launch Bun in a restricted session, run the same command with access to the installed Bun executable. If the local browser server port is in use, select a free loopback port and use it for the server and Playwright base URL.

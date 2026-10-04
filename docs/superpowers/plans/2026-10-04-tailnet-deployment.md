# Tailnet deployment implementation plan

**Goal:** Publish Exile Atlas through GitHub Actions on pushes to master, pull the image from GHCR on the authorized VPS, and serve the app only inside the tailnet.

**Architecture:** GitHub-hosted CI checks and builds the existing Bun Docker image. A dedicated repository deployment runner on the VPS pulls the exact published digest with the job's temporary GITHUB_TOKEN. The production Compose stack lives at /opt/stacks/exile-atlas, with persistent PostgreSQL/Redis volumes and a web listener bound only to the VPS's Tailscale IPv4 address.

**Requirements:** Existing public repository MrWinRock/exile-atlas; master is the requested branch. SSH target nonglab@100.106.177.94:2222. Do not replace other stacks, expose databases, copy local secrets/drafts, enable GGG login without approved credentials, or allow pull requests to execute on the deployment runner.

- [x] Prepare a digest-based production Compose stack, deployment script, server environment template and operations guide; validate Compose and shell syntax.
- [x] Add SHA-pinned master/manual GitHub workflow: Bun checks, image build/publish, then a deployment job enabled only after its dedicated runner is ready. Generate Next route types before CI typecheck.
- [ ] Inspect VPS architecture, ports, Docker/Tailscale and stack-directory ownership. Prepare fresh server-only secrets and repository-specific runner; keep GitHub tokens out of logs/files.
- [ ] Commit the existing application plus deployment files without ignored/private files; push master and set it as repository default. Verify Actions and GHCR artifact.
- [ ] Deploy under /opt/stacks/exile-atlas, initialize the schema, confirm container health/history, verify tailnet-only binding and actual website/API access, and record deployment/redeployment/rollback details.

Initial findings: repository exists and is empty; GitHub CLI has repository/workflow access. Both currently discovered SSH keys were rejected by the VPS. User was asked for the correct key path/alias; server-dependent tasks remain pending that information.

Pre-push checks: 43 tests / 139 assertions pass, lint/typecheck pass, production Compose validates with dummy values and binds only 100.106.177.94:3210 with no PostgreSQL/Redis host ports. Shell syntax and unsafe-path/digest rejection tests pass. Official Bun 1.4.2 image supports Linux AMD64 and ARM64. Independent review identified a failed-rollout recovery documentation issue; corrected to recover from the current last-healthy image.env, and cached private digests now work without expired registry credentials.

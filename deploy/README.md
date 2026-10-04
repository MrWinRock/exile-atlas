# Tailnet production deployment

Repository: https://github.com/MrWinRock/exile-atlas. Pushes to `master` run Bun tests, lint and generated Next route type checks, build the Docker image and publish `ghcr.io/mrwinrock/exile-atlas` with `master` and full commit-SHA tags. The build performs Next production compilation inside the Dockerfile. Registry actions are pinned to commit SHAs.

The VPS stack lives at `/opt/stacks/exile-atlas`. It pulls a published image digest; it does not build source on the VPS. PostgreSQL and Redis are internal-only with named persistent volumes. A schema setup container completes before web/worker startup. Web binds to the exact Tailscale IPv4 address on configurable port 3210; there is no public-interface binding. GGG account OAuth remains unconfigured until an approved client and registered HTTPS domain exist.

## Server preparation

On the authorized VPS, verify Docker Compose, Tailscale, curl, Python 3, openssl and flock are installed; verify the selected port is free and the runner user can run Docker. Create `/opt/stacks/exile-atlas` owned by the deployment user, copy `.env.example` into its `.env`, and restrict the environment to mode 600. Generate a fresh PostgreSQL password and token-encryption key using `openssl rand -hex 32`; never print them or commit the populated environment. Set `APP_URL`, `TAILNET_IP` and `WEB_PORT` to the actual tailnet endpoint. Preserve these values and data volumes across updates.

Deployment runs on a GitHub-hosted runner. It joins the tailnet as an ephemeral `tag:ci` device using Tailscale OIDC, then uses the dedicated repository SSH key to connect as `nongwin` on private port 2222. The key disables forwarding and PTY allocation. The verified VPS Ed25519 host key is pinned in `deploy/known_hosts`; host-key changes must be verified through the existing trusted administration connection before updating that file. The workflow has no pull-request trigger.

Set repository variables `TS_OAUTH_CLIENT_ID` and `TS_AUDIENCE`, and secret `DEPLOY_SSH_KEY`. The Tailscale trust credential needs Auth Keys write access for `tag:ci`, whose tailnet policy must permit TCP 2222 to the VPS. This repository's verified immutable subject is `repo:MrWinRock@78248227/exile-atlas@1404447651:ref:refs/heads/master`. Generate a dedicated Ed25519 key, keep its private half in the GitHub secret, and supply its public half as `EXILE_DEPLOY_PUBLIC_KEY` when running `deploy/bootstrap.sh` on the VPS. Bootstrap creates fresh secrets only when `.env` does not exist and preserves other authorized keys.

Once the environment and key are ready, set repository variable `TAILNET_DEPLOY_ENABLED=true`. `deploy/ssh-deploy.sh` copies only the deployment Compose and update script, then passes the job's short-lived, repository-scoped registry token through encrypted SSH stdin. A permanent registry PAT is unnecessary. Registry credentials use a temporary Docker config which is cleaned after the job. Packages can retain their default private visibility.

The VPS architecture was verified as x86_64; the published app image targets Linux AMD64.

## Deployment and rollback

`deploy/update.sh /opt/stacks/exile-atlas` requires `EXILE_ATLAS_IMAGE=ghcr.io/mrwinrock/exile-atlas@sha256:<64 hex digits>`. In CI the workflow supplies this exact digest. It locks the stack, copies Compose, validates its configuration, pulls images, waits for container health and verifies the tailnet API. A successful image is recorded in `image.env`; the previous successful image is kept in `previous-image.env`.

For manual operations on the VPS:

```sh
cd /opt/stacks/exile-atlas
docker compose --env-file .env --env-file image.env ps
docker compose --env-file .env --env-file image.env logs --tail 50 web worker db-setup
```

After a **failed deployment**, recover with the digest in `image.env`: it still records the most recent healthy release. After a **successful deployment**, roll back to the earlier healthy release using `previous-image.env`. Supply the chosen digest to `deploy/update.sh`. A locally cached digest needs no registry token; an uncached private image requires registry credentials. If the first-ever deployment fails there is no earlier release to restore. Do not use `down -v`: database/history volumes are persistent. Back up PostgreSQL before schema-changing deployments. Browser drafts remain in each browser's local storage; they are not copied from the development machine to the VPS.

## Current setup state

Live site: http://100.106.177.94:3210/ (connect to the tailnet first). Stack: `/opt/stacks/exile-atlas/compose.yaml`.

[Build and deployment run 37217272177](https://github.com/MrWinRock/exile-atlas/actions/runs/37217272177) passed: GitHub OIDC login, private SSH, GHCR pull, database setup and application startup. Deployed app commit: `752a1fc7478f4847b33dc1731964f9115300a691`. Image digest: `sha256:10ab7b6f6febbecf4769591f11b0d79f048dba7be2f64615cc898fd2a4bc1b32`.

Verified from the connected Windows peer: API status HTTP 200 with Bun 1.4.2, configured PostgreSQL/Redis, and the official passive planner rendered in the browser. The history API returned 24 persisted snapshots. Web/PostgreSQL/Redis are healthy; worker is running; all four have zero restarts. Docker inspection confirms the only published app port is `100.106.177.94:3210` and both database services have no host ports. Temporary local deployment-key copies were removed; the private key is retained only as the encrypted GitHub repository secret. GGG OAuth remains unconfigured.

# Tailnet production deployment

Repository: https://github.com/MrWinRock/exile-atlas. Pushes to `master` run Bun tests, lint and generated Next route type checks, build the Docker image and publish `ghcr.io/mrwinrock/exile-atlas` with `master` and full commit-SHA tags. The build performs Next production compilation inside the Dockerfile. Registry actions are pinned to commit SHAs.

The VPS stack lives at `/opt/stacks/exile-atlas`. It pulls a published image digest; it does not build source on the VPS. PostgreSQL and Redis are internal-only with named persistent volumes. A schema setup container completes before web/worker startup. Web binds to the exact Tailscale IPv4 address on configurable port 3210; there is no public-interface binding. GGG account OAuth remains unconfigured until an approved client and registered HTTPS domain exist.

## Server preparation

On the authorized VPS, verify Docker Compose, Tailscale, curl, Python 3, openssl and flock are installed; verify the selected port is free and the runner user can run Docker. Create `/opt/stacks/exile-atlas` owned by the deployment user, copy `.env.example` into its `.env`, and restrict the environment to mode 600. Generate a fresh PostgreSQL password and token-encryption key using `openssl rand -hex 32`; never print them or commit the populated environment. Set `APP_URL`, `TAILNET_IP` and `WEB_PORT` to the actual tailnet endpoint. Preserve these values and data volumes across updates.

Register a dedicated **repository-specific** GitHub Actions Linux runner on this VPS, labelled `exile-atlas`, as the deployment user with Docker access. Keep runner files/work directories separate from the stack. Install its official systemd service. GitHub registration tokens must be passed without logging them. This runner runs trusted master deployment jobs; the workflow has no pull-request trigger. Repository access controls determine who can execute code on the deployment host.

Once the runner and environment are ready, set repository Actions variable `TAILNET_DEPLOY_ENABLED=true`. The deploy job uses its short-lived, repository-scoped `GITHUB_TOKEN` to pull the package; a permanent registry PAT is unnecessary. Registry credentials use a temporary Docker config which is cleaned after the job. Packages can retain their default private visibility.

On ARM64, update the hosted image platform and deployment runner architecture together before enabling deployment. The initial configuration targets Linux AMD64/X64; confirm the actual VPS architecture during setup.

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

The GitHub repository and master branch are identified. VPS deployment is pending working SSH authentication; initial connection attempts with the two available local keys were rejected. No VPS changes have been made yet.

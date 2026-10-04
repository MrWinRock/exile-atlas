#!/usr/bin/env bash
set -euo pipefail

stack="${1:-/opt/stacks/exile-atlas}"
if [[ ! "$stack" =~ ^/opt/stacks/[a-zA-Z0-9_-]+$ ]]; then
  echo "Stack path must be a single directory under /opt/stacks/" >&2
  exit 1
fi
if [[ ! "${EXILE_ATLAS_IMAGE:-}" =~ ^ghcr\.io/mrwinrock/exile-atlas@sha256:[a-f0-9]{64}$ ]]; then
  echo "Use an immutable digest from ghcr.io/mrwinrock/exile-atlas" >&2
  exit 1
fi
if [[ "$(realpath -m "$stack")" != "$stack" ]]; then
  echo "Stack directory must not resolve through a symlink" >&2
  exit 1
fi
if [[ ! -f "$stack/.env" ]]; then
  echo "Create the server-only environment at $stack/.env before deployment" >&2
  exit 1
fi

export EXILE_ATLAS_IMAGE
exec 9>"$stack/.deploy.lock"
flock -w 600 9
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
install -m 644 "$script_dir/compose.yaml" "$stack/compose.yaml"

compose() {
  local args=(--project-directory "$stack" --env-file "$stack/.env")
  if [[ -f "$stack/image.env" ]]; then args+=(--env-file "$stack/image.env"); fi
  docker compose "${args[@]}" -f "$stack/compose.yaml" "$@"
}
compose config --quiet

# Isolate temporary registry credentials from the VPS user's Docker login.
if [[ -n "${GHCR_TOKEN:-}" ]]; then
  export DOCKER_CONFIG
  DOCKER_CONFIG="$(mktemp -d)"
  cleanup_registry() {
    rm -f -- "$DOCKER_CONFIG/config.json"
    rmdir -- "$DOCKER_CONFIG" 2>/dev/null || true
  }
  trap cleanup_registry EXIT
  printf '%s\n' "$GHCR_TOKEN" | docker login ghcr.io --username "${GHCR_USER:?Set GHCR_USER}" --password-stdin
fi

if docker image inspect "$EXILE_ATLAS_IMAGE" >/dev/null 2>&1; then
  # Keep recovery possible with a previously pulled private digest, even after
  # the deployment job's short-lived registry token has expired.
  compose pull --quiet postgres redis
else
  compose pull --quiet web worker db-setup postgres redis
fi
compose up -d --wait --wait-timeout 180 web worker

app_url="$(compose config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["web"]["environment"]["APP_URL"])')"
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-connrefused "$app_url/api/status"
printf '\n'

if [[ -f "$stack/image.env" ]]; then cp -- "$stack/image.env" "$stack/previous-image.env"; fi
printf 'EXILE_ATLAS_IMAGE=%s\n' "$EXILE_ATLAS_IMAGE" > "$stack/image.env.tmp"
mv -- "$stack/image.env.tmp" "$stack/image.env"
compose ps

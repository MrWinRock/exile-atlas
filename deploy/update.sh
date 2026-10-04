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
install -m 644 "$script_dir/compose.yaml" "$stack/docker-compose.yml"
# Compose prefers compose.yaml; retire the legacy name after installing the
# requested filename so plain commands always use the current definition.
if [[ -f "$stack/compose.yaml" ]]; then
  mv -- "$stack/compose.yaml" "$stack/deploy/legacy-compose.yaml"
fi

compose() {
  local args=(--project-directory "$stack" --env-file "$stack/.env")
  docker compose "${args[@]}" -f "$stack/docker-compose.yml" "$@"
}
compose config --quiet

readarray -t endpoint < <(compose config --format json | python3 -c '
import json,sys
from urllib.parse import urlsplit
web=json.load(sys.stdin)["services"]["web"]
url=web["environment"]["APP_URL"]
parsed=urlsplit(url)
assert parsed.scheme == "https" and parsed.hostname == "labs.tail262442.ts.net", "Configure the private HTTPS APP_URL"
assert parsed.port and 1 <= parsed.port <= 65535, "Configure a dedicated HTTPS port"
binding=web["ports"][0]
assert binding["host_ip"] == "127.0.0.1", "Keep the app backend on loopback"
print(url)
print(parsed.port)
print(binding["published"])
')
app_url="${endpoint[0]:?Configure APP_URL}"

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

tailscale serve --bg --https="${endpoint[1]}" "http://127.0.0.1:${endpoint[2]}"
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-connrefused "$app_url/api/status"
printf '\n'

python3 "$script_dir/record-image.py" "$stack" "$EXILE_ATLAS_IMAGE"
compose ps

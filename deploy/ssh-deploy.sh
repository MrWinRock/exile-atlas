#!/usr/bin/env bash
set -euo pipefail

if [[ ! "${EXILE_ATLAS_IMAGE:-}" =~ ^ghcr\.io/mrwinrock/exile-atlas@sha256:[a-f0-9]{64}$ ]]; then
  echo "Use an immutable digest from ghcr.io/mrwinrock/exile-atlas" >&2
  exit 1
fi
if [[ ! "${GHCR_USER:-}" =~ ^[a-zA-Z0-9_-]+(\[bot\])?$ ]]; then
  echo "Invalid registry user" >&2
  exit 1
fi
: "${DEPLOY_SSH_KEY:?Set DEPLOY_SSH_KEY}" "${GHCR_TOKEN:?Set GHCR_TOKEN}"

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
key_dir="$(mktemp -d)"
cleanup_key() { rm -f -- "$key_dir/key"; rmdir -- "$key_dir"; }
trap cleanup_key EXIT
umask 077
printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' > "$key_dir/key"
unset DEPLOY_SSH_KEY
ssh_options=(-i "$key_dir/key" -o IdentitiesOnly=yes -o BatchMode=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$script_dir/known_hosts"
  -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)

scp "${ssh_options[@]}" -P 2222 "$script_dir/compose.yaml" "$script_dir/update.sh" "$script_dir/record-image.py" \
  nongwin@100.106.177.94:/opt/stacks/exile-atlas/deploy/
# The short-lived registry token travels through encrypted stdin, never as a
# command argument or a permanent credential on the deployment host.
printf '%s\n' "$GHCR_TOKEN" | ssh "${ssh_options[@]}" -p 2222 nongwin@100.106.177.94 \
  "read -r GHCR_TOKEN; export GHCR_TOKEN; export GHCR_USER='$GHCR_USER' EXILE_ATLAS_IMAGE='$EXILE_ATLAS_IMAGE'; bash /opt/stacks/exile-atlas/deploy/update.sh /opt/stacks/exile-atlas"

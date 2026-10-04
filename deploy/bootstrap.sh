#!/usr/bin/env bash
set -euo pipefail

stack=/opt/stacks/exile-atlas
if [[ "$(realpath -m "$stack")" != "$stack" ]]; then
  echo "Stack directory must not resolve through a symlink" >&2
  exit 1
fi
if [[ ! "${EXILE_DEPLOY_PUBLIC_KEY:-}" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+\ exile-atlas-github-actions$ ]]; then
  echo "Supply the dedicated Exile Atlas deployment public key" >&2
  exit 1
fi
install -d -m 700 "$stack" "$stack/deploy"
if [[ ! -e "$stack/.env" ]]; then
  umask 077
  postgres_password="$(openssl rand -hex 32)"
  encryption_key="$(openssl rand -hex 32)"
  cat > "$stack/.env" <<EOF
APP_URL=https://poe2.nonglabs.cloud
TAILNET_URL=https://labs.tail262442.ts.net:3211
TRUST_PROXY=true
WEB_PORT=3210
POSTGRES_PASSWORD=$postgres_password
TOKEN_ENCRYPTION_KEY=$encryption_key
POE_CLIENT_ID=
POE_CLIENT_SECRET=
POE_CONTACT=
POE_REDIRECT_URI=
EOF
  unset postgres_password encryption_key
fi
chmod 600 "$stack/.env"
python3 - <<'PY'
import os
from pathlib import Path
ssh = Path.home() / '.ssh'
ssh.mkdir(mode=0o700, exist_ok=True)
keys = ssh / 'authorized_keys'
line = 'restrict ' + os.environ['EXILE_DEPLOY_PUBLIC_KEY']
existing = keys.read_text() if keys.exists() else ''
if line not in existing.splitlines():
    with keys.open('a') as target:
        if existing and not existing.endswith('\n'):
            target.write('\n')
        target.write(line + '\n')
keys.chmod(0o600)
PY
printf 'Server environment and dedicated deployment key prepared at %s\n' "$stack"

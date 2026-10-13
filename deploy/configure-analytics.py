"""Apply an optional CI-provided analytics ID without rewriting other settings."""

import os
from pathlib import Path
import re
import sys
import tempfile

ID = re.compile(r"[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}")
SETTING = re.compile(r"^\s*(?:export\s+)?UMAMI_WEBSITE_ID\s*=")


def atomic_write(path: Path, text: str) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
            output.write(text)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def configure_analytics(stack: Path, website_id: str) -> None:
    if not website_id:
        return
    if not ID.fullmatch(website_id):
        raise ValueError("UMAMI_WEBSITE_ID must be a UUID")
    environment = stack / ".env"
    original = environment.read_text(encoding="utf-8")
    kept = "".join(line for line in original.splitlines(keepends=True) if not SETTING.match(line))
    if kept and not kept.endswith("\n"):
        kept += "\n"
    atomic_write(environment, kept + f"UMAMI_WEBSITE_ID={website_id}\n")


if __name__ == "__main__":
    try:
        configure_analytics(Path(sys.argv[1]), os.environ.get("UMAMI_WEBSITE_ID", ""))
    except (IndexError, OSError, ValueError) as error:
        print(f"Could not configure analytics: {error}", file=sys.stderr)
        sys.exit(1)

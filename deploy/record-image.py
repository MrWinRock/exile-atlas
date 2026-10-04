"""Record a healthy release without rewriting unrelated server secrets."""

import os
from pathlib import Path
import re
import shlex
import sys
import tempfile

DIGEST = re.compile(r"ghcr\.io/mrwinrock/exile-atlas@sha256:[a-f0-9]{64}")
IMAGE_LINE = re.compile(r"^\s*(?:export\s+)?EXILE_ATLAS_IMAGE\s*=")


def image_value(line: str) -> str | None:
    try:
        words = shlex.split(line.split("=", 1)[1], comments=True)
    except ValueError:
        return None
    return words[0] if len(words) == 1 and DIGEST.fullmatch(words[0]) else None


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


def record_image(stack: Path, image: str) -> None:
    if not DIGEST.fullmatch(image):
        raise ValueError("Use an immutable digest from ghcr.io/mrwinrock/exile-atlas")
    environment = stack / ".env"
    original = environment.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)
    previous = None
    for line in lines:
        if IMAGE_LINE.match(line):
            previous = image_value(line)
    legacy = stack / "image.env"
    if previous is None and legacy.exists():
        for line in legacy.read_text(encoding="utf-8").splitlines():
            if IMAGE_LINE.match(line):
                previous = image_value(line)

    kept = "".join(line for line in lines if not IMAGE_LINE.match(line))
    if kept and not kept.endswith("\n"):
        kept += "\n"
    if previous and previous != image:
        atomic_write(stack / "previous-image.env", f"EXILE_ATLAS_IMAGE={previous}\n")
    atomic_write(legacy, f"EXILE_ATLAS_IMAGE={image}\n")
    # Commit the canonical pointer last. Plain `docker compose` now finds it.
    atomic_write(environment, kept + f"EXILE_ATLAS_IMAGE={image}\n")


if __name__ == "__main__":
    try:
        record_image(Path(sys.argv[1]), sys.argv[2])
    except (IndexError, OSError, ValueError) as error:
        print(f"Could not record release: {error}", file=sys.stderr)
        sys.exit(1)

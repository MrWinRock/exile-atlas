#!/usr/bin/env python3
"""Validate Compose endpoints without disclosing the service environment."""

import json
import re
import sys
from urllib.parse import urlsplit


def https_origin(value, name):
    if not isinstance(value, str) or any(character.isspace() for character in value):
        raise ValueError(f"Configure {name} as a plain HTTPS origin")
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        raise ValueError(f"Configure {name} as a plain HTTPS origin") from None
    hostname = parsed.hostname or ""
    labels = hostname.split(".")
    if (
        not value.startswith("https://")
        or parsed.scheme != "https"
        or not hostname
        or len(hostname) > 253
        or any(
            not re.fullmatch(r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?", label)
            for label in labels
        )
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or "?" in value
        or "#" in value
        or parsed.netloc.endswith(":")
        or (port is not None and not 1 <= port <= 65535)
    ):
        raise ValueError(f"Configure {name} as a plain HTTPS origin")
    return parsed


def main():
    web = json.load(sys.stdin)["services"]["web"]
    environment = web["environment"]
    https_origin(environment["APP_URL"], "APP_URL")
    tailnet_url = environment["TAILNET_URL"]
    tailnet = https_origin(tailnet_url, "TAILNET_URL")
    if tailnet.hostname != "labs.tail262442.ts.net" or tailnet.port is None:
        raise ValueError("Configure TAILNET_URL with the dedicated labs HTTPS port")
    ports = web["ports"]
    if (
        len(ports) != 1
        or ports[0]["host_ip"] != "127.0.0.1"
        or ports[0]["target"] != 3000
    ):
        raise ValueError("Keep the app backend on loopback port 3000")
    backend_port = int(ports[0]["published"])
    if not 1 <= backend_port <= 65535:
        raise ValueError("Configure a valid loopback WEB_PORT")
    print(tailnet_url.rstrip("/"))
    print(tailnet.port)
    print(backend_port)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, TypeError, IndexError) as error:
        if isinstance(error, ValueError):
            print(f"Invalid deployment endpoints: {error}", file=sys.stderr)
        else:
            print(
                "Invalid deployment endpoints: missing or malformed Compose configuration",
                file=sys.stderr,
            )
        sys.exit(1)

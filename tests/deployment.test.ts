import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
const python = process.platform === "win32" ? "python" : "python3";
const digest = (character: string) =>
  "ghcr.io/mrwinrock/exile-atlas@sha256:" + character.repeat(64);
function recordImage(stack: string, image: string) {
  return spawnSync(python, ["deploy/record-image.py", stack, image], { encoding: "utf8" });
}
function validateEndpoints(appUrl: string, tailnetUrl: string, hostIp = "127.0.0.1") {
  return spawnSync(python, ["deploy/validate-endpoints.py"], {
    encoding: "utf8",
    input: JSON.stringify({
      services: {
        web: {
          environment: { APP_URL: appUrl, TAILNET_URL: tailnetUrl },
          ports: [{ host_ip: hostIp, published: "3210", target: 3000 }],
        },
      },
    }),
  });
}
function removeTestStack(stack: string) {
  const target = realpathSync(stack);
  if (dirname(target) !== realpathSync(tmpdir()) || !basename(target).startsWith("exile-atlas-"))
    throw new Error("Refusing to remove a directory outside the temporary test stacks");
  rmSync(target, { recursive: true, force: true });
}

test("deployment refuses paths outside the named stack before touching Docker", () => {
  const result = spawnSync(bash, ["deploy/update.sh", "/opt/stacks/../other"], {
    encoding: "utf8",
    env: {
      ...process.env,
      EXILE_ATLAS_IMAGE: "ghcr.io/mrwinrock/exile-atlas@sha256:" + "a".repeat(64),
    },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Stack path must be a single directory under /opt/stacks/");
});

test("deployment refuses mutable tags and images from another repository", () => {
  for (const image of [
    "ghcr.io/mrwinrock/exile-atlas:master",
    "ghcr.io/other/project@sha256:" + "a".repeat(64),
  ]) {
    const result = spawnSync(bash, ["deploy/update.sh", "/opt/stacks/exile-atlas"], {
      encoding: "utf8",
      env: { ...process.env, EXILE_ATLAS_IMAGE: image },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Use an immutable digest from ghcr.io/mrwinrock/exile-atlas");
  }
});

test("private SSH deployment rejects unsafe image and registry arguments before connecting", () => {
  for (const input of [
    {
      image: "ghcr.io/mrwinrock/exile-atlas:master",
      user: "MrWinRock",
      error: "Use an immutable digest",
    },
    {
      image: "ghcr.io/mrwinrock/exile-atlas@sha256:" + "a".repeat(64),
      user: "user'; echo unsafe",
      error: "Invalid registry user",
    },
  ]) {
    const result = spawnSync(bash, ["deploy/ssh-deploy.sh"], {
      encoding: "utf8",
      env: { ...process.env, EXILE_ATLAS_IMAGE: input.image, GHCR_USER: input.user },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(input.error);
  }
});

test.skipIf(
  spawnSync("docker", ["compose", "version"], {
    env: { ...process.env, DOCKER_CONFIG: tmpdir() },
  }).status !== 0,
)("plain Compose commands resolve the recorded digest and keep databases private", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-compose-"));
  const image = "ghcr.io/mrwinrock/exile-atlas@sha256:" + "a".repeat(64);
  try {
    copyFileSync(resolve("deploy/compose.yaml"), join(stack, "docker-compose.yml"));
    writeFileSync(
      join(stack, ".env"),
      [
        "EXILE_ATLAS_IMAGE=" + image,
        "APP_URL=https://poe2.nonglabs.cloud",
        "TAILNET_URL=https://labs.tail262442.ts.net:3211",
        "TRUST_PROXY=true",
        "WEB_PORT=3210",
        "POSTGRES_PASSWORD=compose-test-password",
        "TOKEN_ENCRYPTION_KEY=" + "b".repeat(64),
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    const env: NodeJS.ProcessEnv = { ...process.env, DOCKER_CONFIG: stack };
    for (const name of [
      "EXILE_ATLAS_IMAGE",
      "APP_URL",
      "TAILNET_URL",
      "TRUST_PROXY",
      "WEB_PORT",
      "POSTGRES_PASSWORD",
    ])
      delete env[name];
    const result = spawnSync("docker", ["compose", "config", "--format", "json"], {
      cwd: stack,
      encoding: "utf8",
      env,
    });
    expect(result.status).toBe(0);
    const configuration = JSON.parse(result.stdout);
    const services = configuration.services;
    for (const name of ["web", "worker", "db-setup"]) expect(services[name].image).toBe(image);
    expect(services.web.environment.APP_URL).toBe("https://poe2.nonglabs.cloud");
    expect(services.web.environment.TAILNET_URL).toBe("https://labs.tail262442.ts.net:3211");
    expect(services.web.environment.TRUST_PROXY).toBe("true");
    expect(configuration.networks.shared).toMatchObject({ name: "shared", external: true });
    expect(Object.keys(services.web.networks).sort()).toEqual(["default", "shared"]);
    expect(services.web.networks.shared.aliases).toContain("exile-atlas");
    for (const name of ["worker", "db-setup", "postgres", "redis"])
      expect(Object.keys(services[name].networks)).toEqual(["default"]);
    expect(services.web.ports).toHaveLength(1);
    expect(services.web.ports[0]).toMatchObject({
      host_ip: "127.0.0.1",
      published: "3210",
      target: 3000,
    });
    expect(services.postgres.ports ?? []).toHaveLength(0);
    expect(services.redis.ports ?? []).toHaveLength(0);
  } finally {
    removeTestStack(stack);
  }
});

test("deployment verifies private HTTPS independently of the public NPM origin", () => {
  const result = validateEndpoints(
    "https://poe2.nonglabs.cloud/",
    "https://labs.tail262442.ts.net:3211/",
  );
  expect(result.status).toBe(0);
  expect(result.stdout.replace(/\r\n/g, "\n")).toBe(
    "https://labs.tail262442.ts.net:3211\n3211\n3210\n",
  );
});

test("deployment rejects public URLs that are not a plain HTTPS origin", () => {
  for (const appUrl of [
    "http://poe2.nonglabs.cloud",
    "https://user:secret@poe2.nonglabs.cloud",
    "https://poe2.nonglabs.cloud/planner",
    "https://poe2.nonglabs.cloud?query=value",
    "https://poe2.nonglabs.cloud#fragment",
    "https://poe2.nonglabs.cloud:0",
    "https://poe2.nonglabs.cloud:65536",
    "https://poe2.nonglabs.cloud:",
    "https://poe2.nonglabs.cloud\n",
    "https://bad host",
  ]) {
    const result = validateEndpoints(appUrl, "https://labs.tail262442.ts.net:3211");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Invalid deployment endpoints:");
  }
});

test("deployment rejects unintended Serve endpoints and exposed host bindings", () => {
  for (const tailnetUrl of [
    "https://other.tail262442.ts.net:3211",
    "https://labs.tail262442.ts.net",
    "https://labs.tail262442.ts.net:0",
    "https://labs.tail262442.ts.net:3211/api/status",
  ]) {
    const result = validateEndpoints("https://poe2.nonglabs.cloud", tailnetUrl);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Invalid deployment endpoints:");
  }
  const exposed = validateEndpoints(
    "https://poe2.nonglabs.cloud",
    "https://labs.tail262442.ts.net:3211",
    "0.0.0.0",
  );
  expect(exposed.status).not.toBe(0);
  expect(exposed.stdout).toBe("");
  expect(exposed.stderr).toContain("Keep the app backend on loopback");
});

test("recording a healthy image preserves environment content and replaces duplicate image values", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-record-"));
  const untouched = [
    "# EXILE_ATLAS_IMAGE=keep-this-comment",
    "APP_URL=https://labs.tail262442.ts.net:3211",
    "POSTGRES_PASSWORD='dummy=with#symbols'",
    "TOKEN_ENCRYPTION_KEY=" + "d".repeat(64),
    "",
  ].join("\n");
  try {
    writeFileSync(
      join(stack, ".env"),
      untouched +
        "EXILE_ATLAS_IMAGE=" +
        digest("a") +
        "\n" +
        "EXILE_ATLAS_IMAGE=" +
        digest("b") +
        "\n",
    );
    const result = recordImage(stack, digest("c"));
    expect(result.status).toBe(0);
    const recorded = readFileSync(join(stack, ".env"), "utf8");
    expect(recorded).toContain(untouched);
    expect(recorded.match(/^EXILE_ATLAS_IMAGE=/gm)).toHaveLength(1);
    expect(recorded).toContain("EXILE_ATLAS_IMAGE=" + digest("c") + "\n");
    expect(readFileSync(join(stack, "previous-image.env"), "utf8")).toBe(
      "EXILE_ATLAS_IMAGE=" + digest("b") + "\n",
    );
    if (process.platform !== "win32")
      expect(statSync(join(stack, ".env")).mode & 0o777).toBe(0o600);
  } finally {
    removeTestStack(stack);
  }
});

test("repeating the current healthy digest keeps the earlier rollback target", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-repeat-"));
  try {
    writeFileSync(join(stack, ".env"), "EXILE_ATLAS_IMAGE=" + digest("b") + "\n");
    writeFileSync(join(stack, "previous-image.env"), "EXILE_ATLAS_IMAGE=" + digest("a") + "\n");
    const result = recordImage(stack, digest("b"));
    expect(result.status).toBe(0);
    expect(readFileSync(join(stack, "previous-image.env"), "utf8")).toBe(
      "EXILE_ATLAS_IMAGE=" + digest("a") + "\n",
    );
  } finally {
    removeTestStack(stack);
  }
});

test("recording rejects unsafe image references without altering environment or rollback files", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-reject-"));
  const original = "POSTGRES_PASSWORD=dummy\nEXILE_ATLAS_IMAGE=" + digest("b") + "\n";
  const previous = "EXILE_ATLAS_IMAGE=" + digest("a") + "\n";
  try {
    writeFileSync(join(stack, ".env"), original);
    writeFileSync(join(stack, "previous-image.env"), previous);
    for (const image of [
      "ghcr.io/mrwinrock/exile-atlas:master",
      "ghcr.io/other/project@sha256:" + "c".repeat(64),
    ]) {
      expect(recordImage(stack, image).status).not.toBe(0);
      expect(readFileSync(join(stack, ".env"), "utf8")).toBe(original);
      expect(readFileSync(join(stack, "previous-image.env"), "utf8")).toBe(previous);
    }
  } finally {
    removeTestStack(stack);
  }
});

test("the last healthy dotenv digest takes priority over legacy image records", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-migration-"));
  try {
    writeFileSync(join(stack, ".env"), "EXILE_ATLAS_IMAGE=" + digest("b") + "\n");
    writeFileSync(join(stack, "image.env"), "EXILE_ATLAS_IMAGE=" + digest("a") + "\n");
    expect(recordImage(stack, digest("c")).status).toBe(0);
    expect(readFileSync(join(stack, "previous-image.env"), "utf8")).toBe(
      "EXILE_ATLAS_IMAGE=" + digest("b") + "\n",
    );
    writeFileSync(join(stack, ".env"), "POSTGRES_PASSWORD=dummy\n");
    writeFileSync(join(stack, "image.env"), "EXILE_ATLAS_IMAGE=" + digest("a") + "\n");
    expect(recordImage(stack, digest("b")).status).toBe(0);
    expect(readFileSync(join(stack, "previous-image.env"), "utf8")).toBe(
      "EXILE_ATLAS_IMAGE=" + digest("a") + "\n",
    );
  } finally {
    removeTestStack(stack);
  }
});

test("quoted dotenv image values with comments remain the healthy rollback source", () => {
  const stack = mkdtempSync(join(tmpdir(), "exile-atlas-comment-"));
  try {
    writeFileSync(
      join(stack, ".env"),
      "EXILE_ATLAS_IMAGE='" + digest("b") + "' # healthy release\n",
    );
    writeFileSync(join(stack, "image.env"), "EXILE_ATLAS_IMAGE=" + digest("a") + "\n");
    expect(recordImage(stack, digest("c")).status).toBe(0);
    expect(readFileSync(join(stack, "previous-image.env"), "utf8")).toBe(
      "EXILE_ATLAS_IMAGE=" + digest("b") + "\n",
    );
  } finally {
    removeTestStack(stack);
  }
});

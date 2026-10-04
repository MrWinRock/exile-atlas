import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";

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
    { image: "ghcr.io/mrwinrock/exile-atlas:master", user: "MrWinRock", error: "Use an immutable digest" },
    { image: "ghcr.io/mrwinrock/exile-atlas@sha256:" + "a".repeat(64), user: "user'; echo unsafe", error: "Invalid registry user" },
  ]) {
    const result = spawnSync(bash, ["deploy/ssh-deploy.sh"], {
      encoding: "utf8",
      env: { ...process.env, EXILE_ATLAS_IMAGE: input.image, GHCR_USER: input.user },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(input.error);
  }
});

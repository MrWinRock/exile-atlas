import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const windows = process.platform === "win32";
const launcher = join(
  homedir(), ".gemini", "skills", "impeccable", "scripts",
  windows ? "impeccable.cmd" : "impeccable",
);

if (!existsSync(launcher)) {
  console.log("{}");
} else {
  const result = windows
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", '""%IMPECCABLE_GEMINI_HOOK%" hook"'], {
        env: { ...process.env, IMPECCABLE_GEMINI_HOOK: launcher },
        stdio: "inherit",
        windowsVerbatimArguments: true,
      })
    : spawnSync(launcher, ["hook"], { stdio: "inherit" });

  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}

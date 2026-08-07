import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(repositoryRoot, "dist");

export function preparePublishedPackageBaseline(): void {
  rmSync(distDirectory, { recursive: true, force: true });
  assert.equal(
    existsSync(distDirectory),
    false,
    "the expected package baseline must start without dist",
  );
  execFileSync("pnpm", ["run", "build"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    stdio: "inherit",
  });
  assert.equal(
    existsSync(resolve(distDirectory, "index.js")),
    true,
    "the expected package baseline must build dist/index.js",
  );
  assert.equal(
    existsSync(resolve(distDirectory, "index.d.ts")),
    true,
    "the expected package baseline must build dist/index.d.ts",
  );
}

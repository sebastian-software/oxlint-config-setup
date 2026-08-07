import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { runCommand } from "./published-package-timeouts.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(repositoryRoot, "dist");

export function preparePublishedPackageBaseline(): void {
  rmSync(distDirectory, { recursive: true, force: true });
  assert.equal(
    existsSync(distDirectory),
    false,
    "the expected package baseline must start without dist",
  );
  runCommand("build the expected package baseline", "pnpm", ["run", "build"], {
    cwd: repositoryRoot,
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

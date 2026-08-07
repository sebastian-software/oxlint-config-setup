import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { preparePublishedPackageBaseline } from "./prepare-published-package-baseline.js";
import { runCommand } from "./published-package-timeouts.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(
  resolve(tmpdir(), "oxlint-config-published-baseline-"),
);

try {
  preparePublishedPackageBaseline();
  const output = runCommand(
    "pack the fresh expected package baseline",
    "npm",
    [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temporaryRoot,
      ".",
    ],
    { cwd: repositoryRoot },
  );
  const packed = JSON.parse(output) as Array<{ filename?: string }>;
  const filename = packed[0]?.filename;
  assert(filename, "npm pack did not return a tarball filename");
  const files = runCommand(
    "list the fresh expected package baseline",
    "tar",
    ["-tzf", resolve(temporaryRoot, filename)],
  )
    .trim()
    .split("\n");
  assert(files.includes("package/dist/index.js"));
  assert(files.includes("package/dist/index.d.ts"));
  assert(files.some((file) => file.startsWith("package/dist/configs/")));
  assert(files.some((file) => file.startsWith("package/dist/standalone/")));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log("Fresh published-package baseline includes the built dist artifact.");

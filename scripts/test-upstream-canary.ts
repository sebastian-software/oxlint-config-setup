import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(
  resolve(tmpdir(), "oxlint-upstream-canary-test-"),
);

function run(
  script: string,
  args: string[],
  environment: NodeJS.ProcessEnv = {},
) {
  return spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...environment },
  });
}

try {
  const expectedPath = resolve(temporaryRoot, "expected-snapshot.json");
  const expected = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, "fixtures/snapshots/effective-configs.json"),
      "utf8",
    ),
  ) as Record<string, { rules?: Record<string, unknown> }>;
  expected.default.rules!["constructor-super"] = "allow";
  writeFileSync(expectedPath, `${JSON.stringify(expected, null, 2)}\n`);

  const artifactDirectory = resolve(temporaryRoot, "artifacts");
  const surface = run(resolve(repositoryRoot, "scripts/native-surface.ts"), [
    "--expected",
    expectedPath,
    "--output",
    artifactDirectory,
    "--fail-on-diff",
  ]);
  assert.notEqual(
    surface.status,
    0,
    "surface drift must fail the snapshot stage",
  );
  assert(
    existsSync(resolve(artifactDirectory, "native-category-surface.json")),
  );
  const report = readFileSync(
    resolve(artifactDirectory, "native-category-surface.diff.md"),
    "utf8",
  );
  assert.match(report, /## default/u);
  assert.match(report, /changed rules: `constructor-super`/u);

  const harness = run(resolve(repositoryRoot, "scripts/test-harness.ts"), [], {
    CANARY_NATIVE_ONLY: "true",
    CANARY_SKIP_SNAPSHOTS: "true",
  });
  assert.equal(
    harness.status,
    0,
    harness.stderr || harness.stdout || "canary harness must skip snapshots",
  );

  const versions = Object.fromEntries(
    ["oxlint", "oxlint-tsgolint", "typescript"].map((packageName) => {
      const manifest = JSON.parse(
        readFileSync(
          resolve(repositoryRoot, "node_modules", packageName, "package.json"),
          "utf8",
        ),
      ) as { version: string };
      return [packageName, manifest.version];
    }),
  );
  const versionsPath = resolve(temporaryRoot, "expected-versions.json");
  writeFileSync(versionsPath, `${JSON.stringify(versions, null, 2)}\n`);
  const verification = run(
    resolve(repositoryRoot, "scripts/upstream-toolchain.ts"),
    ["--verify", versionsPath, "--output", artifactDirectory],
  );
  assert.equal(
    verification.status,
    0,
    verification.stderr || verification.stdout || "upstream graph must verify",
  );
  assert(
    existsSync(resolve(artifactDirectory, "verified-upstream-versions.json")),
  );

  versions.oxlint = "0.0.0";
  writeFileSync(versionsPath, `${JSON.stringify(versions, null, 2)}\n`);
  const mismatch = run(
    resolve(repositoryRoot, "scripts/upstream-toolchain.ts"),
    ["--verify", versionsPath],
  );
  assert.notEqual(
    mismatch.status,
    0,
    "upstream graph verification must reject an unexpected installed version",
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(
  "Upstream canary resolver and snapshot artifact regressions verified.",
);

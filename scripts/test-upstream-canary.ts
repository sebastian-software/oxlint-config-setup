import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
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

function workflowStep(name: string): { body: string; run: string } {
  const lines = readFileSync(
    resolve(repositoryRoot, ".github/workflows/upstream-canary.yml"),
    "utf8",
  ).split("\n");
  const nameIndex = lines.findIndex(
    (line) =>
      line.trim() === `- name: ${name}` || line.trim() === `name: ${name}`,
  );
  const start = lines.findLastIndex(
    (line, index) => index <= nameIndex && line.startsWith("      - "),
  );
  assert.notEqual(start, -1, `workflow must contain the ${name} step`);
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith("      - "),
  );
  const step = lines.slice(start, end === -1 ? undefined : end);
  const runIndex = step.findIndex((line) => line.trim() === "run: |");
  const inlineRun = step.find((line) => line.trim().startsWith("run: "));
  const run =
    runIndex === -1
      ? (inlineRun?.trim().slice("run: ".length) ?? "")
      : step
          .slice(runIndex + 1)
          .filter((line) => line.startsWith("          "))
          .map((line) => line.slice(10))
          .join("\n");
  assert.notEqual(run, "", `${name} must execute commands`);
  return { body: step.join("\n"), run };
}

function runCleanWorkflowCommand(
  command: string,
  workingDirectory: string,
  fakePnpmDirectory: string,
  environment: NodeJS.ProcessEnv = {},
) {
  return spawnSync("sh", ["-c", command], {
    cwd: workingDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakePnpmDirectory}:${process.env.PATH}`,
      ...environment,
    },
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

  const experimentalInstall = workflowStep(
    "Install pinned experimental workspace dependencies",
  );
  const experimentalDetection = workflowStep(
    "Detect JavaScript-plugin profiles",
  );
  const experimentalFixtures = workflowStep(
    "Run isolated JavaScript-plugin fixtures",
  );
  assert.match(
    experimentalInstall.body,
    /if: steps\.profiles\.outputs\.present == 'true'/u,
  );
  assert.match(
    experimentalFixtures.body,
    /if: steps\.profiles\.outputs\.present == 'true'/u,
  );
  const workflow = readFileSync(
    resolve(repositoryRoot, ".github/workflows/upstream-canary.yml"),
    "utf8",
  );
  const experimentalJob = workflow.slice(
    workflow.indexOf("  experimental-js-plugin:"),
  );
  assert(
    experimentalJob.indexOf("actions/setup-node") <
      experimentalJob.indexOf(
        "Install pinned experimental workspace dependencies",
      ) &&
      experimentalJob.indexOf(
        "Install pinned experimental workspace dependencies",
      ) < experimentalJob.indexOf("Run isolated JavaScript-plugin fixtures"),
    "experimental workspace installation must follow Node setup and precede TypeScript scripts",
  );

  const cleanRunner = resolve(temporaryRoot, "clean-experimental-runner");
  const fakePnpmDirectory = resolve(cleanRunner, "fake-bin");
  mkdirSync(fakePnpmDirectory, { recursive: true });
  mkdirSync(resolve(cleanRunner, "src"), { recursive: true });
  writeFileSync(
    resolve(cleanRunner, "src", "ledger.ts"),
    'export const profile = { executionPath: "javascript-plugin" };\n',
  );
  writeFileSync(
    resolve(fakePnpmDirectory, "pnpm"),
    `#!/bin/sh
if [ "$1" = "install" ] && [ "$2" = "--frozen-lockfile" ]; then
  mkdir -p node_modules/.bin
  : > node_modules/.bin/tsx
  chmod +x node_modules/.bin/tsx
  exit 0
fi
if [ "$1" = "run" ] || [ "$1" = "update" ]; then
  if [ ! -x node_modules/.bin/tsx ]; then
    echo "tsx is unavailable before the workspace install" >&2
    exit 86
  fi
  exit 0
fi
exit 0
`,
  );
  chmodSync(resolve(fakePnpmDirectory, "pnpm"), 0o755);
  const profileOutput = resolve(cleanRunner, "profile-output");
  const detectedProfile = runCleanWorkflowCommand(
    experimentalDetection.run,
    cleanRunner,
    fakePnpmDirectory,
    { GITHUB_OUTPUT: profileOutput },
  );
  assert.equal(
    detectedProfile.status,
    0,
    detectedProfile.stderr || detectedProfile.stdout,
  );
  assert.match(readFileSync(profileOutput, "utf8"), /present=true/u);
  const beforeInstall = runCleanWorkflowCommand(
    experimentalFixtures.run,
    cleanRunner,
    fakePnpmDirectory,
  );
  assert.equal(
    beforeInstall.status,
    86,
    "the clean experimental runner must expose a missing tsx before installation",
  );
  const installed = runCleanWorkflowCommand(
    experimentalInstall.run,
    cleanRunner,
    fakePnpmDirectory,
  );
  assert.equal(installed.status, 0, installed.stderr || installed.stdout);
  const experimental = runCleanWorkflowCommand(
    experimentalFixtures.run,
    cleanRunner,
    fakePnpmDirectory,
  );
  assert.equal(
    experimental.status,
    0,
    experimental.stderr ||
      experimental.stdout ||
      "the installed experimental workspace must run the isolated workflow",
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(
  "Upstream canary resolver, snapshot artifact, and clean experimental workflow regressions verified.",
);

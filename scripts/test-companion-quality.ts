import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const templateDirectory = resolve(repositoryRoot, "templates/companion-quality");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-companion-quality-"));

type Executable = "git" | "npm" | "pnpm";
type PackageManager = Exclude<Executable, "git">;
const requestedPackageManager = process.env.COMPANION_PACKAGE_MANAGER;
assert(
  requestedPackageManager === undefined ||
    requestedPackageManager === "npm" ||
    requestedPackageManager === "pnpm",
  "COMPANION_PACKAGE_MANAGER must be npm or pnpm when set",
);
const packageManagers =
  requestedPackageManager === undefined
    ? (["npm", "pnpm"] as const)
    : ([requestedPackageManager] as const);

interface RunResult {
  readonly command: string;
  readonly output: string;
  readonly status: number | null;
}

function run(
  packageManager: Executable,
  args: readonly string[],
  cwd: string,
): RunResult {
  const result = spawnSync(packageManager, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 120_000,
  });
  const command = `${packageManager} ${args.join(" ")}`;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.equal(result.error, undefined, `${command} failed to start: ${output}`);
  return { command, output, status: result.status };
}

function assertSuccess(result: RunResult): void {
  assert.equal(
    result.status,
    0,
    `${result.command} failed with ${String(result.status)}:\n${result.output}`,
  );
}

function assertFailure(result: RunResult, concern: string): void {
  assert.notEqual(
    result.status,
    0,
    `${concern} defect unexpectedly passed: ${result.command}\n${result.output}`,
  );
}

function copyFixture(packageManager: PackageManager): string {
  const target = resolve(temporaryRoot, packageManager);
  cpSync(templateDirectory, target, {
    recursive: true,
    filter(source) {
      const segments = source.split(sep);
      return !segments.includes("generated") && !segments.includes("node_modules");
    },
  });
  return target;
}

function installFixture(packageManager: PackageManager, cwd: string): void {
  const args =
    packageManager === "npm"
      ? ["ci", "--no-audit", "--no-fund"]
      : ["install", "--frozen-lockfile"];
  assertSuccess(run(packageManager, args, cwd));
}

function initializeFixtureGit(cwd: string): void {
  assertSuccess(run("git", ["init", "--quiet"], cwd));
}

function runQuality(packageManager: PackageManager, cwd: string): RunResult {
  return run(packageManager, ["run", "quality"], cwd);
}

function writeIgnoredGeneratedArtifacts(cwd: string): void {
  const generatedDirectory = resolve(cwd, "generated");
  mkdirSync(generatedDirectory, { recursive: true });
  writeFileSync(
    resolve(generatedDirectory, "malformed.ts"),
    "export const = ;\n",
  );
  writeFileSync(
    resolve(generatedDirectory, "malformed.md"),
    "# Duplicate\n\n# Duplicate\n\nZxqvplm\n",
  );
  writeFileSync(resolve(generatedDirectory, "malformed.json"), '{"broken":\n');
}

function verifyPreCommit(packageManager: PackageManager, cwd: string): void {
  assertSuccess(run("git", ["config", "user.email", "fixture@example.test"], cwd));
  assertSuccess(run("git", ["config", "user.name", "Companion Fixture"], cwd));
  assert.equal(
    run("git", ["config", "--get", "core.hooksPath"], cwd).output.trim(),
    ".husky/_",
    `${packageManager} install must enable Husky's installed hooks path`,
  );

  const hookPath = resolve(cwd, ".husky/pre-commit");
  assert.equal(
    readFileSync(hookPath, "utf8"),
    "#!/usr/bin/env sh\nnpx --no lint-staged\n",
    `${packageManager} fixture must keep the distributed pre-commit hook content`,
  );
  assert.notEqual(
    statSync(hookPath).mode & 0o111,
    0,
    `${packageManager} fixture must keep the distributed pre-commit hook executable`,
  );

  assertSuccess(run("git", ["add", "--all"], cwd));
  assertSuccess(
    run("git", ["commit", "--quiet", "-m", "Adopt companion template"], cwd),
  );

  writeFileSync(hookPath, "#!/usr/bin/env sh\nthis-is-not-a-command\n");
  chmodSync(hookPath, 0o755);
  writeFileSync(
    resolve(cwd, "src/commit-proof.ts"),
    "export const commitProof = false;\n",
  );
  assertSuccess(run("git", ["add", "src/commit-proof.ts"], cwd));
  assertFailure(
    run("git", ["commit", "--quiet", "-m", "Reject malformed companion hook"], cwd),
    `${packageManager} malformed distributed pre-commit hook`,
  );
}

function verifyFailures(packageManager: PackageManager, cwd: string): void {
  writeFileSync(
    resolve(cwd, "src/example.ts"),
    'import { basename } from "node:path";\nexport function displayName(path:string){return basename(path)}\n',
  );
  assertFailure(
    run(packageManager, ["run", "quality:format"], cwd),
    "formatting/import organization",
  );

  writeFileSync(
    resolve(cwd, "README.md"),
    "# Duplicate headings\n\n# Duplicate headings\n",
  );
  assertFailure(
    run(packageManager, ["run", "quality:markdown"], cwd),
    "Markdown",
  );
  writeFileSync(
    resolve(cwd, "README.md"),
    "# Companion quality template\n\nMarkdown is valid again.\n",
  );
  writeFileSync(
    resolve(cwd, "guide.mdx"),
    "# Duplicate MDX headings\n\n# Duplicate MDX headings\n",
  );
  assertFailure(
    run(packageManager, ["run", "quality:markdown"], cwd),
    "MDX",
  );

  writeFileSync(
    resolve(cwd, "guide.mdx"),
    "# Misspelling\n\nZxqvplm fails the spelling check.\n",
  );
  assertFailure(
    run(packageManager, ["run", "quality:spelling"], cwd),
    "spelling/prose",
  );

  writeFileSync(
    resolve(cwd, "config/app.json"),
    '{"enabled":"yes","name":""}\n',
  );
  assertFailure(
    run(packageManager, ["run", "quality:json"], cwd),
    "JSON syntax/schema",
  );
  writeFileSync(resolve(cwd, "config/app.json"), '{"enabled":true,\n');
  assertFailure(
    run(packageManager, ["run", "quality:json"], cwd),
    "JSON syntax",
  );

  const manifestPath = resolve(cwd, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, name: "not a valid package name" }, null, 2)}\n`,
  );
  assertFailure(
    run(packageManager, ["run", "quality:package"], cwd),
    "package metadata",
  );
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      Object.fromEntries([
        ["version", manifest.version],
        ["name", manifest.name],
        ...Object.entries(manifest).filter(
          ([key]) => key !== "name" && key !== "version",
        ),
      ]),
      null,
      2,
    )}\n`,
  );
  assertFailure(
    run(packageManager, ["run", "quality:package"], cwd),
    "package metadata ordering",
  );
}

try {
  for (const packageManager of packageManagers) {
    console.log(`Checking clean ${packageManager} companion fixture...`);
    const fixture = copyFixture(packageManager);
    initializeFixtureGit(fixture);
    installFixture(packageManager, fixture);
    writeIgnoredGeneratedArtifacts(fixture);
    assertSuccess(runQuality(packageManager, fixture));
    verifyPreCommit(packageManager, fixture);
    verifyFailures(packageManager, fixture);
  }
  console.log(
    `Companion-quality template passes clean ${packageManagers.join(" and ")} fixture${packageManagers.length === 1 ? "" : "s"}.`,
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}

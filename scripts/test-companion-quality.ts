import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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
      return !source.split(sep).includes("node_modules");
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

function runQuality(packageManager: PackageManager, cwd: string): RunResult {
  return run(packageManager, ["run", "quality"], cwd);
}

function verifyPreCommit(packageManager: PackageManager, cwd: string): void {
  assertSuccess(run("git", ["init", "--quiet"], cwd));
  assertSuccess(run("git", ["add", "src/example.ts"], cwd));
  const args =
    packageManager === "npm"
      ? ["exec", "--", "lint-staged"]
      : ["exec", "lint-staged"];
  assertSuccess(run(packageManager, args, cwd));
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
    installFixture(packageManager, fixture);
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

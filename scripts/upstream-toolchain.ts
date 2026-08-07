import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const packages = ["oxlint", "oxlint-tsgolint", "typescript"] as const;
const recordArgument = process.argv.indexOf("--record");
const verifyArgument = process.argv.indexOf("--verify");
const outputArgument = process.argv.indexOf("--output");

function argumentValue(index: number, name: string): string {
  const value = process.argv[index + 1];
  assert(value !== undefined, `${name} requires a path`);
  return resolve(repositoryRoot, value);
}

function latestVersion(packageName: string): string {
  const output = execFileSync(
    "pnpm",
    ["view", `${packageName}@latest`, "version", "--json"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  const version = JSON.parse(output) as unknown;
  if (typeof version !== "string") {
    throw new TypeError(`${packageName} latest version is invalid`);
  }
  return version;
}

function installedVersion(packageName: string): string {
  const manifest = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, "node_modules", packageName, "package.json"),
      "utf8",
    ),
  ) as { version?: unknown };
  if (typeof manifest.version !== "string") {
    throw new TypeError(`${packageName} is not installed`);
  }
  return manifest.version;
}

if (recordArgument !== -1) {
  const versions = Object.fromEntries(
    packages.map((packageName) => [packageName, latestVersion(packageName)]),
  );
  writeFileSync(
    argumentValue(recordArgument, "--record"),
    `${JSON.stringify(versions, null, 2)}\n`,
  );
  console.log(`Recorded latest versions for ${packages.join(", ")}.`);
} else if (verifyArgument !== -1) {
  const expected = JSON.parse(
    readFileSync(argumentValue(verifyArgument, "--verify"), "utf8"),
  ) as Record<string, unknown>;
  const installed = Object.fromEntries(
    packages.map((packageName) => [packageName, installedVersion(packageName)]),
  );
  for (const packageName of packages) {
    assert.equal(
      installed[packageName],
      expected[packageName],
      `${packageName} must resolve to the recorded latest version`,
    );
  }
  if (outputArgument !== -1) {
    const outputDirectory = argumentValue(outputArgument, "--output");
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      resolve(outputDirectory, "verified-upstream-versions.json"),
      `${JSON.stringify({ expected, installed }, null, 2)}\n`,
    );
  }
  console.log(`Verified installed latest versions for ${packages.join(", ")}.`);
} else {
  throw new Error("Provide exactly one of --record or --verify.");
}

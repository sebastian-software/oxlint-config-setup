import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { preparePublishedPackageBaseline } from "./prepare-published-package-baseline.js";

interface PackageManifest {
  name: string;
  version: string;
}

interface RegistryPackage {
  "dist-tags"?: Record<string, string>;
  dist?: {
    attestations?: {
      provenance?: {
        predicateType?: string;
      };
    };
  };
  version?: string;
}

interface GitHubRelease {
  tag_name?: string;
  target_commitish?: string;
}

interface GitHubTag {
  object?: {
    sha?: string;
  };
}

interface AuditResult {
  verified?: Array<{
    attestations?: {
      provenance?: {
        predicateType?: string;
      };
    };
    attestationBundles?: Array<{
      bundle?: {
        dsseEnvelope?: {
          payload?: string;
        };
      };
      predicateType?: string;
    }>;
    name?: string;
    version?: string;
  }>;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
) as PackageManifest;
const packageSpecifier = `${manifest.name}@${manifest.version}`;
const repository = process.env.GITHUB_REPOSITORY;
const distTag = process.env.NPM_DIST_TAG ?? "latest";
const workflowPath = ".github/workflows/publish.yml";
const expectedTag = `${manifest.name}-v${manifest.version}`;
const expectedCommit = process.env.GITHUB_SHA;
const retryAttempts = 10;
const retryDelayMilliseconds = 15_000;

assert(repository, "GITHUB_REPOSITORY is required to verify the release");
assert(expectedCommit, "GITHUB_SHA is required to verify the release");

function run(binary: string, args: string[], cwd?: string): string {
  return execFileSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function pack(directory: string, destination: string): string {
  const output = run(
    "npm",
    [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      destination,
      directory,
    ],
    repositoryRoot,
  );
  const value = JSON.parse(output) as Array<{ filename?: string }>;
  const filename = value[0]?.filename;
  assert(filename, "npm pack did not return a tarball filename");
  return resolve(destination, filename);
}

function tarFiles(tarball: string): string[] {
  return run("tar", ["-tzf", tarball])
    .trim()
    .split("\n")
    .filter((file) => file.length > 0 && !file.endsWith("/"))
    .toSorted();
}

function readRegistryPackage(): RegistryPackage {
  return JSON.parse(
    run("npm", ["view", packageSpecifier, "--json"]),
  ) as RegistryPackage;
}

function registryIsReady(value: RegistryPackage): boolean {
  return (
    value.version === manifest.version &&
    value["dist-tags"]?.[distTag] === manifest.version &&
    value.dist?.attestations?.provenance?.predicateType ===
      "https://slsa.dev/provenance/v1"
  );
}

async function waitForRegistry(): Promise<RegistryPackage> {
  let lastFailure = "the registry did not return a package document";
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const registryPackage = readRegistryPackage();
      if (registryIsReady(registryPackage)) return registryPackage;
      lastFailure =
        `received version ${registryPackage.version ?? "none"} and ${distTag}=` +
        (registryPackage["dist-tags"]?.[distTag] ?? "none");
    } catch (error: unknown) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    if (attempt < retryAttempts) {
      console.log(
        `npm registry propagation attempt ${attempt}/${retryAttempts} was not ready: ${lastFailure}`,
      );
      await new Promise((resolveDelay) => {
        setTimeout(resolveDelay, retryDelayMilliseconds);
      });
    }
  }
  throw new Error(
    `npm registry did not make ${packageSpecifier} available with ${distTag} after ${retryAttempts} attempts: ${lastFailure}`,
  );
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });
  assert.equal(response.ok, true, `GitHub API request failed: ${path}`);
  return (await response.json()) as T;
}

async function verifyGitHubRelease(): Promise<void> {
  const [release, tag] = await Promise.all([
    githubJson<GitHubRelease>(
      `/repos/${repository}/releases/tags/${expectedTag}`,
    ),
    githubJson<GitHubTag>(`/repos/${repository}/git/ref/tags/${expectedTag}`),
  ]);
  assert.equal(release.tag_name, expectedTag);
  assert.equal(release.target_commitish, expectedCommit);
  assert.equal(tag.object?.sha, expectedCommit);
}

function verifyConsumer(consumerRoot: string): void {
  writeFileSync(
    resolve(consumerRoot, "verify.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import { readFileSync } from "node:fs";',
      'import { getOxlintConfig, getSyntaxOnlyOxlintConfig } from "oxlint-config-setup";',
      "assert(getOxlintConfig().rules);",
      "assert.equal(getSyntaxOnlyOxlintConfig().options.typeAware, false);",
      'assert(getOxlintConfig({ react: true }).plugins.includes("react"));',
      'const jsonPath = new URL(import.meta.resolve("oxlint-config-setup/json/react"));',
      "assert(JSON.parse(readFileSync(jsonPath, \"utf8\")).rules);",
      "",
    ].join("\n"),
  );
  run("node", ["verify.mjs"], consumerRoot);
}

function verifyConsumers(temporaryRoot: string): void {
  const npmConsumer = resolve(temporaryRoot, "npm-consumer");
  mkdirSync(npmConsumer);
  writeFileSync(
    resolve(npmConsumer, "package.json"),
    '{"name":"npm-registry-consumer","private":true,"type":"module"}\n',
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      "--omit=optional",
      packageSpecifier,
    ],
    npmConsumer,
  );
  verifyConsumer(npmConsumer);

  const pnpmConsumer = resolve(temporaryRoot, "pnpm-consumer");
  mkdirSync(pnpmConsumer);
  writeFileSync(
    resolve(pnpmConsumer, "package.json"),
    '{"name":"pnpm-registry-consumer","private":true,"type":"module"}\n',
  );
  run(
    "pnpm",
    ["add", "--ignore-scripts", "--no-optional", packageSpecifier],
    pnpmConsumer,
  );
  verifyConsumer(pnpmConsumer);
}

function decodeProvenance(audit: AuditResult): Record<string, unknown> {
  const verified = audit.verified?.find(
    (entry) =>
      entry.name === manifest.name && entry.version === manifest.version,
  );
  assert(verified, `${packageSpecifier} was not signature verified by npm`);
  assert.equal(
    verified.attestations?.provenance?.predicateType,
    "https://slsa.dev/provenance/v1",
  );
  const bundle = verified.attestationBundles?.find(
    (entry) => entry.predicateType === "https://slsa.dev/provenance/v1",
  );
  assert(bundle?.bundle?.dsseEnvelope?.payload, "npm returned no SLSA bundle");
  return JSON.parse(
    Buffer.from(bundle.bundle.dsseEnvelope.payload, "base64url").toString(
      "utf8",
    ),
  ) as Record<string, unknown>;
}

function verifyProvenance(npmConsumer: string): void {
  const audit = JSON.parse(
    run(
      "npm",
      ["audit", "signatures", "--json", "--include-attestations"],
      npmConsumer,
    ),
  ) as AuditResult;
  const provenance = decodeProvenance(audit);
  const predicate = provenance.predicate as {
    buildDefinition?: {
      externalParameters?: {
        workflow?: {
          path?: string;
          repository?: string;
        };
      };
    };
  };
  assert.equal(
    predicate.buildDefinition?.externalParameters?.workflow?.repository,
    `https://github.com/${repository}`,
  );
  assert.equal(
    predicate.buildDefinition?.externalParameters?.workflow?.path,
    workflowPath,
  );
}

function writeSummary(): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(
    summaryPath,
    [
      "## Published npm artifact verified",
      "",
      `- Package: \`${packageSpecifier}\``,
      `- Dist-tag: \`${distTag}\``,
      `- GitHub Release and tag: \`${expectedTag}\` at \`${expectedCommit}\``,
      "- Consumers: clean npm and pnpm installs passed root, syntax-only, React, and JSON-export smoke checks.",
      "- Provenance: npm verified a SLSA attestation from this repository's publish workflow.",
      "",
    ].join("\n"),
  );
}

await waitForRegistry();
await verifyGitHubRelease();
console.log("Building the clean expected release artifact.");
preparePublishedPackageBaseline();

const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-config-published-"));
try {
  const expectedRoot = resolve(temporaryRoot, "expected");
  const publishedRoot = resolve(temporaryRoot, "published");
  mkdirSync(expectedRoot);
  mkdirSync(publishedRoot);
  const expectedTarball = pack(".", expectedRoot);
  const publishedTarball = pack(packageSpecifier, publishedRoot);
  assert.deepEqual(tarFiles(publishedTarball), tarFiles(expectedTarball));
  const extractedPackage = resolve(publishedRoot, "package");
  mkdirSync(extractedPackage);
  run("tar", ["-xzf", publishedTarball, "-C", extractedPackage]);
  assert.equal(
    readFileSync(resolve(repositoryRoot, "README.md"), "utf8"),
    readFileSync(resolve(extractedPackage, "package", "README.md"), "utf8"),
  );
  verifyConsumers(temporaryRoot);
  verifyProvenance(resolve(temporaryRoot, "npm-consumer"));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

writeSummary();
console.log(
  `Published npm artifact verified: ${packageSpecifier} (${distTag}, ${expectedTag}).`,
);

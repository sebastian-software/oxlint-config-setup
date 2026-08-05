import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { OxlintConfig } from "oxlint";

import {
  AI_SPIKE_RULE,
  createConfig,
} from "../packages/shared-config/src/config.js";
import {
  allConfigOptions,
  configFileName,
  type ConfigOptions,
} from "../packages/shared-config/src/options.js";

interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  files?: string[];
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface PackResult {
  filename: string;
}

interface PublicPackageApi {
  getOxlintConfig(options?: ConfigOptions): OxlintConfig;
}

const spikeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(spikeRoot, "../..");
const packageRoot = join(spikeRoot, "packages/shared-config");
const buildArtifactDirectory = join(packageRoot, "dist/configs");
const directConfigPath = join(spikeRoot, "fixtures/direct-json/.oxlintrc.json");
const typescriptConfigPath = join(
  spikeRoot,
  "fixtures/typescript/oxlint.config.ts",
);
const typescriptExtendsConfigPath = join(
  spikeRoot,
  "fixtures/typescript-extends/oxlint.config.ts",
);
const validFixturePath = join(spikeRoot, "fixtures/project/src/valid.ts");
const invalidFixturePath = join(spikeRoot, "fixtures/project/src/invalid.ts");
const aiMarkerFixturePath = join(
  spikeRoot,
  "fixtures/project/src/ai-marker.ts",
);
const nodePackageBinary = join(spikeRoot, "node_modules/.bin/oxlint");
const requireFromTsgolint = createRequire(
  import.meta.resolve("oxlint-tsgolint/package.json"),
);
const tsgolintPackage = `@oxlint-tsgolint/${process.platform}-${process.arch}`;
const tsgolintExecutable = `tsgolint${
  process.platform === "win32" ? ".exe" : ""
}`;
const tsgolintBinaryPath = requireFromTsgolint.resolve(
  `${tsgolintPackage}/${tsgolintExecutable}`,
);

const standaloneBinaries = new Map<string, string>([
  ["darwin-arm64", "oxlint-aarch64-apple-darwin"],
  ["darwin-x64", "oxlint-x86_64-apple-darwin"],
  ["linux-arm64", "oxlint-aarch64-unknown-linux-gnu"],
  ["linux-x64", "oxlint-x86_64-unknown-linux-gnu"],
]);

function nativeBinaryPath(): string {
  if (process.env.OXLINT_STANDALONE) {
    return resolve(process.env.OXLINT_STANDALONE);
  }

  const executable = standaloneBinaries.get(
    `${process.platform}-${process.arch}`,
  );
  assert(
    executable,
    `unsupported spike platform: ${process.platform}-${process.arch}`,
  );
  return join(spikeRoot, ".cache/standalone", executable);
}

function run(binary: string, args: string[], options: RunOptions = {}) {
  return spawnSync(binary, args, {
    cwd: options.cwd ?? spikeRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...options.env },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJson(source: string): unknown {
  return JSON.parse(source) as unknown;
}

function readManifest(path: string): PackageManifest {
  const value = parseJson(readFileSync(path, "utf8"));
  assert(isRecord(value), `${path} must contain a JSON object`);
  return value as PackageManifest;
}

function parseOxlintConfig(source: string): OxlintConfig {
  const value = parseJson(source);
  assert(isRecord(value), "Oxlint config JSON must contain an object");
  return value as OxlintConfig;
}

function parsePackResult(source: string): PackResult {
  const trimmed = source.trim();
  const starts = [
    0,
    trimmed.lastIndexOf("\n{") + 1,
    trimmed.lastIndexOf("\n[") + 1,
  ]
    .filter((start, index, values) => start >= 0 && values.indexOf(start) === index)
    .toSorted((left, right) => right - left);
  let value: unknown;
  for (const start of starts) {
    try {
      value = parseJson(trimmed.slice(start));
      break;
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }
  assert(value !== undefined, "pnpm pack did not return valid JSON");
  const candidate = Array.isArray(value) ? value[0] : value;
  assert(isRecord(candidate), "pnpm pack must return a JSON object");
  assert(
    typeof candidate.filename === "string",
    "pnpm pack must return a tarball filename",
  );
  return { filename: candidate.filename };
}

async function importPublicPackage(specifier: string): Promise<PublicPackageApi> {
  const value: unknown = await import(specifier);
  assert(isRecord(value), "the built package must export a module object");
  assert.equal(
    typeof value.getOxlintConfig,
    "function",
    "the public package must expose getOxlintConfig(options)",
  );
  return value as unknown as PublicPackageApi;
}

function printConfig(
  binary: string,
  configPath: string,
  options: RunOptions = {},
): OxlintConfig {
  const result = run(
    binary,
    ["--config", configPath, "--print-config", validFixturePath],
    options,
  );
  assert.equal(
    result.status,
    0,
    `print-config failed for ${configPath}:\n${result.stderr}`,
  );
  return parseOxlintConfig(result.stdout);
}

function assertBehavior(
  binary: string,
  configPath: string,
  options: RunOptions = {},
): void {
  const valid = run(binary, ["--config", configPath, validFixturePath], options);
  assert.equal(valid.status, 0, valid.stderr);

  const invalid = run(
    binary,
    ["--config", configPath, invalidFixturePath],
    options,
  );
  assert.equal(invalid.status, 1, invalid.stderr);
  const diagnostics = `${invalid.stdout}\n${invalid.stderr}`;
  assert.match(diagnostics, /no-debugger/u);
  assert.match(diagnostics, /no-console/u);
  assert.match(diagnostics, /typescript\(no-floating-promises\)/u);
}

function assertAiBehavior(
  binary: string,
  withoutAiConfigPath: string,
  withAiConfigPath: string,
): void {
  const withoutAi = run(binary, [
    "--config",
    withoutAiConfigPath,
    aiMarkerFixturePath,
  ]);
  assert.equal(withoutAi.status, 0, withoutAi.stderr);
  assert.doesNotMatch(
    `${withoutAi.stdout}\n${withoutAi.stderr}`,
    /no-warning-comments/u,
  );

  const withAi = run(binary, [
    "--config",
    withAiConfigPath,
    aiMarkerFixturePath,
  ]);
  assert.equal(withAi.status, 0, withAi.stderr);
  assert.match(
    `${withAi.stdout}\n${withAi.stderr}`,
    /no-warning-comments/u,
  );
}

function assertNoEslintRuntime(): void {
  for (const manifestPath of [
    join(spikeRoot, "package.json"),
    join(packageRoot, "package.json"),
  ]) {
    const manifest = readManifest(manifestPath);
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ] as const) {
      for (const dependency of Object.keys(manifest[field] ?? {})) {
        assert.equal(
          dependency.includes("eslint"),
          false,
          `${manifestPath} has ESLint runtime dependency ${dependency}`,
        );
      }
    }
  }

  const lockfile = readFileSync(join(spikeRoot, "pnpm-lock.yaml"), "utf8");
  assert.doesNotMatch(lockfile, /(?:^|\/)eslint(?:@|:|\/)/mu);
}

assertNoEslintRuntime();

const trackedSpikeFiles = execFileSync(
  "git",
  ["ls-files", "--", "spikes/config-packaging"],
  { cwd: repositoryRoot, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const legacyJavaScriptScripts = trackedSpikeFiles.filter(
  (file) => file.includes("/scripts/") && file.endsWith(".mjs"),
);
assert.deepEqual(
  legacyJavaScriptScripts,
  [],
  "all internal spike scripts must be typed TypeScript sources",
);

const trackedGeneratedArtifacts = execFileSync(
  "git",
  [
    "ls-files",
    "--",
    "spikes/config-packaging/packages/shared-config/generated/*.json",
    "spikes/config-packaging/packages/shared-config/dist/**",
  ],
  { cwd: repositoryRoot, encoding: "utf8" },
).trim();
assert.equal(
  trackedGeneratedArtifacts,
  "",
  "config build output must be ignored, not tracked source",
);

const packageApi = await importPublicPackage(
  "@oxlint-config-setup/spike-config",
);
assert.equal(
  "recommended" in packageApi,
  false,
  "the public API must select prebuilt permutations instead of exporting a profile",
);

const spikeManifest = readManifest(join(spikeRoot, "package.json"));
const packageManifest = readManifest(join(packageRoot, "package.json"));
assert.equal(spikeManifest.devDependencies?.["oxlint-tsgolint"], "7.0.2001");
assert.equal(
  packageManifest.peerDependencies?.["oxlint-tsgolint"],
  "7.0.2001",
);
assert.equal(spikeManifest.devDependencies?.tsx, "4.23.8");
assert.equal(packageManifest.devDependencies?.tsx, "4.23.8");
assert.equal(packageManifest.devDependencies?.tsdown, "0.22.14");
assert.match(
  spikeManifest.scripts?.["typecheck:scripts"] ?? "",
  /tsc.+--noEmit/u,
);
assert.match(
  spikeManifest.scripts?.typecheck ?? "",
  /typecheck:scripts.+spike-config.+typecheck/u,
);
assert.match(packageManifest.scripts?.build ?? "", /typecheck.+tsdown.+tsx/u);
assert.deepEqual(packageManifest.files, ["dist"]);

const permutations = allConfigOptions();
assert.equal(permutations.length, 8);
const expectedArtifactNames = [
  "config-6e5e7d225541.json",
  "config-a53f054eadae.json",
  "config-0906d8f2bc55.json",
  "config-b6b7f7bf8051.json",
  "config-50a80845ac2f.json",
  "config-5d4ac567d473.json",
  "config-f4874d816c7b.json",
  "config-a8b1b44dc3f7.json",
];
const artifactNames = permutations.map(configFileName);
assert.deepEqual(
  artifactNames,
  expectedArtifactNames,
  "the stable option-bit mapping or namespaced hashes changed",
);
assert.deepEqual(
  permutations.map(configFileName),
  artifactNames,
  "config artifact hashes are not deterministic",
);
assert.equal(new Set(artifactNames).size, 8, "config hashes must be unique");
assert.deepEqual(
  readdirSync(buildArtifactDirectory)
    .filter((name) => name.endsWith(".json"))
    .toSorted(),
  artifactNames.toSorted(),
  "the build must emit exactly all react/node/ai permutations",
);

for (const [index, options] of permutations.entries()) {
  const artifactPath = join(buildArtifactDirectory, artifactNames[index]);
  const artifactText = readFileSync(artifactPath, "utf8");
  const artifact = parseOxlintConfig(artifactText);
  assert.equal(
    artifactText,
    `${JSON.stringify(createConfig(options), null, 2)}\n`,
    `${artifactNames[index]} does not match its build-time config`,
  );
  assert.deepEqual(
    packageApi.getOxlintConfig(options),
    artifact,
    `the loader did not select ${artifactNames[index]}`,
  );
  assert.equal(
    artifact.options?.typeAware,
    true,
    `${artifactNames[index]} is not type-aware`,
  );
  assert.deepEqual(
    artifact.plugins,
    [
      "typescript",
      ...(options.react ? ["react"] : []),
      ...(options.node ? ["node"] : []),
    ],
    `${artifactNames[index]} does not reflect its React and Node options`,
  );
  assert.equal(
    Object.hasOwn(artifact.rules ?? {}, AI_SPIKE_RULE),
    options.ai,
    `${artifactNames[index]} does not reflect the AI permutation`,
  );
  assert.equal(
    printConfig(nodePackageBinary, artifactPath, {
      env: { OXLINT_TSGOLINT_PATH: tsgolintBinaryPath },
    }).options?.typeAware,
    true,
    `${artifactNames[index]} is not a valid effective type-aware config`,
  );
}

function cleanBuild(): Record<string, string> {
  rmSync(join(packageRoot, "dist"), { recursive: true, force: true });
  execFileSync(
    "pnpm",
    ["--filter", "@oxlint-config-setup/spike-config", "run", "build"],
    {
      cwd: spikeRoot,
      env: { ...process.env, CI: "true" },
      stdio: "pipe",
    },
  );
  assert.deepEqual(
    readdirSync(buildArtifactDirectory).toSorted(),
    artifactNames.toSorted(),
    "a clean build must emit exactly the eight config artifacts",
  );
  return Object.fromEntries(
    artifactNames.map((name) => [
      name,
      readFileSync(join(buildArtifactDirectory, name), "utf8"),
    ]),
  );
}

const firstBuild = cleanBuild();
const secondBuild = cleanBuild();
assert.deepEqual(
  secondBuild,
  firstBuild,
  "two clean builds must emit byte-identical config artifacts",
);

const packDirectory = mkdtempSync(join(tmpdir(), "oxlint-config-pack-"));
rmSync(join(packageRoot, "dist"), { recursive: true, force: true });
const packOutput = execFileSync(
  "pnpm",
  ["pack", "--pack-destination", packDirectory, "--json"],
  {
    cwd: packageRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  },
);
const packResult = parsePackResult(packOutput);
const tarballPath = resolve(packDirectory, packResult.filename);
const packedEntries = execFileSync("tar", ["-tzf", tarballPath], {
  encoding: "utf8",
})
  .trim()
  .split("\n");
const packedConfigEntries = packedEntries
  .filter(
    (entry: string) =>
      entry.startsWith("package/dist/configs/") && entry.endsWith(".json"),
  )
  .toSorted();
assert.deepEqual(
  packedConfigEntries,
  artifactNames
    .map((name) => `package/dist/configs/${name}`)
    .toSorted(),
  "a fresh package tarball must contain all eight config artifacts",
);
assert.deepEqual(
  packedEntries.toSorted(),
  [
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    ...artifactNames.map((name) => `package/dist/configs/${name}`),
  ].toSorted(),
  "the tarball must contain only the public library and generated configs",
);
assert(packedEntries.includes("package/dist/index.js"));
assert(packedEntries.includes("package/dist/index.d.ts"));
assert.equal(
  packedEntries.some(
    (entry: string) =>
      entry.includes("/src/") ||
      entry.includes("/scripts/") ||
      (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) ||
      entry.endsWith("tsdown.config.ts") ||
      entry.endsWith(".mjs"),
  ),
  false,
  "the package must not publish TypeScript sources or internal scripts",
);

const unpackDirectory = mkdtempSync(join(tmpdir(), "oxlint-config-unpack-"));
execFileSync("tar", ["-xzf", tarballPath, "-C", unpackDirectory]);
const packedApi = await importPublicPackage(
  `${pathToFileURL(join(unpackDirectory, "package/dist/index.js")).href}?packed`,
);
assert.deepEqual(packedApi.getOxlintConfig(), packageApi.getOxlintConfig());

assert.deepEqual(packageApi.getOxlintConfig(), packageApi.getOxlintConfig({}));
assert.throws(
  () =>
    packageApi.getOxlintConfig({ ai: "yes" } as unknown as ConfigOptions),
  /option ai must be a boolean/u,
);
assert.throws(
  () =>
    packageApi.getOxlintConfig({ future: true } as unknown as ConfigOptions),
  /Unsupported Oxlint config option: future/u,
);

async function assertArtifactFailure(
  kind: string,
  source: string | undefined,
  expectedMessage: RegExp,
): Promise<void> {
  const copiedPackage = mkdtempSync(join(tmpdir(), `oxlint-config-${kind}-`));
  cpSync(join(packageRoot, "dist"), join(copiedPackage, "dist"), {
    recursive: true,
  });
  const copiedArtifact = join(
    copiedPackage,
    "dist/configs",
    artifactNames[0],
  );
  rmSync(copiedArtifact);
  if (source !== undefined) {
    writeFileSync(copiedArtifact, source);
  }
  const copiedApi = await importPublicPackage(
    `${pathToFileURL(join(copiedPackage, "dist/index.js")).href}?case=${kind}`
  );
  assert.throws(() => copiedApi.getOxlintConfig(), expectedMessage);
}

await assertArtifactFailure(
  "missing",
  undefined,
  /Unable to load prebuilt Oxlint config artifact/u,
);
await assertArtifactFailure(
  "corrupt",
  "{",
  /is not valid JSON/u,
);
await assertArtifactFailure(
  "syntax-only",
  '{"options":{"typeAware":false}}',
  /violates the mandatory type-aware contract/u,
);

const generatedConfigPath = join(buildArtifactDirectory, artifactNames[0]);
const aiConfigPath = join(buildArtifactDirectory, artifactNames[4]);

const nativeBinary = nativeBinaryPath();
const stagedConsumer = mkdtempSync(join(tmpdir(), "oxlint-json-consumer-"));
const stagedConfigPath = join(stagedConsumer, ".oxlintrc.json");
cpSync(generatedConfigPath, stagedConfigPath);
const standaloneOptions = {
  env: { OXLINT_TSGOLINT_PATH: tsgolintBinaryPath },
};
const stagedStandaloneOptions = {
  cwd: stagedConsumer,
  env: { OXLINT_TSGOLINT_PATH: tsgolintBinaryPath },
};

const typescriptEffective = printConfig(
  nodePackageBinary,
  typescriptConfigPath,
);
const typescriptExtendsEffective = printConfig(
  nodePackageBinary,
  typescriptExtendsConfigPath,
);
const generatedEffective = printConfig(
  nativeBinary,
  stagedConfigPath,
  stagedStandaloneOptions,
);
const directEffective = printConfig(
  nativeBinary,
  directConfigPath,
  standaloneOptions,
);

assert.deepEqual(generatedEffective, typescriptEffective);
assert.deepEqual(generatedEffective, directEffective);
assert.equal(
  generatedEffective.options?.typeAware,
  true,
  "Oxlint did not activate mandatory type-aware mode",
);
assert.deepEqual(generatedEffective.rules, typescriptExtendsEffective.rules);
assert.notDeepEqual(
  generatedEffective.plugins,
  typescriptExtendsEffective.plugins,
);
assert.notDeepEqual(
  generatedEffective.categories,
  typescriptExtendsEffective.categories,
);

assertBehavior(nodePackageBinary, typescriptConfigPath);
assertBehavior(nativeBinary, stagedConfigPath, stagedStandaloneOptions);
assertBehavior(nativeBinary, directConfigPath, standaloneOptions);
assertAiBehavior(nodePackageBinary, generatedConfigPath, aiConfigPath);

const standaloneVersion = execFileSync(nativeBinary, ["--version"], {
  encoding: "utf8",
}).trim();
const packageVersion = execFileSync(nodePackageBinary, ["--version"], {
  encoding: "utf8",
}).trim();
assert.equal(standaloneVersion, "Version: 1.77.0");
assert.equal(packageVersion, "Version: 1.77.0");
console.log(
  `verified TypeScript, generated JSON, and direct JSON with ${standaloneVersion}`,
);

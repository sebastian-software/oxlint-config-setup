import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const spikeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(spikeRoot, "packages/shared-config");
const generatedDirectory = join(packageRoot, "generated");
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

const standaloneBinaries = new Map([
  ["darwin-arm64", "oxlint-aarch64-apple-darwin"],
  ["darwin-x64", "oxlint-x86_64-apple-darwin"],
  ["linux-arm64", "oxlint-aarch64-unknown-linux-gnu"],
  ["linux-x64", "oxlint-x86_64-unknown-linux-gnu"],
]);

function nativeBinaryPath() {
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

function run(binary, args, options = {}) {
  const { env, ...spawnOptions } = options;
  return spawnSync(binary, args, {
    cwd: spikeRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...env },
    ...spawnOptions,
  });
}

function printConfig(binary, configPath, options = {}) {
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
  return JSON.parse(result.stdout);
}

function assertBehavior(binary, configPath, options = {}) {
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

function assertAiBehavior(binary, withoutAiConfigPath, withAiConfigPath) {
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

function assertNoEslintRuntime() {
  for (const manifestPath of [
    join(spikeRoot, "package.json"),
    join(packageRoot, "package.json"),
  ]) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
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

const packageApi = await import("@oxlint-config-setup/spike-config");
const { createConfig, AI_SPIKE_RULE } = await import(
  join(packageRoot, "dist/config.js")
);
const { allConfigOptions, configFileName } = await import(
  join(packageRoot, "dist/options.js")
);
assert.equal(
  typeof packageApi.getOxlintConfig,
  "function",
  "the public package must expose getOxlintConfig(options)",
);
assert.equal(
  "recommended" in packageApi,
  false,
  "the public API must select prebuilt permutations instead of exporting a profile",
);

const spikeManifest = JSON.parse(
  readFileSync(join(spikeRoot, "package.json"), "utf8"),
);
const packageManifest = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
);
assert.equal(spikeManifest.devDependencies["oxlint-tsgolint"], "7.0.2001");
assert.equal(packageManifest.peerDependencies["oxlint-tsgolint"], "7.0.2001");

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
  readdirSync(generatedDirectory)
    .filter((name) => name.endsWith(".json"))
    .toSorted(),
  artifactNames.toSorted(),
  "the build must emit exactly all react/node/ai permutations",
);

for (const [index, options] of permutations.entries()) {
  const artifactPath = join(generatedDirectory, artifactNames[index]);
  const artifactText = readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactText);
  assert.equal(
    artifactText,
    `${JSON.stringify(createConfig(options), null, 2)}\n`,
    `${artifactNames[index]} has drifted from its build-time config`,
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
    Object.hasOwn(artifact.rules, AI_SPIKE_RULE),
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

assert.deepEqual(packageApi.getOxlintConfig(), packageApi.getOxlintConfig({}));
assert.throws(
  () => packageApi.getOxlintConfig({ ai: "yes" }),
  /option ai must be a boolean/u,
);
assert.throws(
  () => packageApi.getOxlintConfig({ future: true }),
  /Unsupported Oxlint config option: future/u,
);

async function assertArtifactFailure(kind, source, expectedMessage) {
  const copiedPackage = mkdtempSync(join(tmpdir(), `oxlint-config-${kind}-`));
  cpSync(join(packageRoot, "dist"), join(copiedPackage, "dist"), {
    recursive: true,
  });
  if (source !== undefined) {
    const copiedGenerated = join(copiedPackage, "generated");
    mkdirSync(copiedGenerated);
    writeFileSync(join(copiedGenerated, artifactNames[0]), source);
  }
  const copiedApi = await import(
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

const generatedConfigPath = join(generatedDirectory, artifactNames[0]);
const aiConfigPath = join(generatedDirectory, artifactNames[4]);

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

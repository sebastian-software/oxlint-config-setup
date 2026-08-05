import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const spikeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(spikeRoot, "packages/shared-config");
const generatedConfigPath = join(packageRoot, "generated/recommended.json");
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
const nodePackageBinary = join(spikeRoot, "node_modules/.bin/oxlint");

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
  return spawnSync(binary, args, {
    cwd: spikeRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    ...options,
  });
}

function printConfig(binary, configPath) {
  const result = run(binary, [
    "--config",
    configPath,
    "--print-config",
    validFixturePath,
  ]);
  assert.equal(
    result.status,
    0,
    `print-config failed for ${configPath}:\n${result.stderr}`,
  );
  return JSON.parse(result.stdout);
}

function assertBehavior(binary, configPath) {
  const valid = run(binary, ["--config", configPath, validFixturePath]);
  assert.equal(valid.status, 0, valid.stderr);

  const invalid = run(binary, ["--config", configPath, invalidFixturePath]);
  assert.equal(invalid.status, 1, invalid.stderr);
  const diagnostics = `${invalid.stdout}\n${invalid.stderr}`;
  assert.match(diagnostics, /no-debugger/u);
  assert.match(diagnostics, /no-console/u);
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

const generatedConfigText = readFileSync(generatedConfigPath, "utf8");
assert.equal(
  fileURLToPath(
    import.meta.resolve("@oxlint-config-setup/spike-config/recommended.json"),
  ),
  generatedConfigPath,
  "the generated JSON artifact is not exposed through the package export map",
);
const { recommended } = await import(join(packageRoot, "dist/index.js"));
assert.equal(
  generatedConfigText,
  `${JSON.stringify(recommended, null, 2)}\n`,
  "generated JSON has drifted from the TypeScript profile",
);

const nativeBinary = nativeBinaryPath();
const stagedConsumer = mkdtempSync(join(tmpdir(), "oxlint-json-consumer-"));
const stagedConfigPath = join(stagedConsumer, ".oxlintrc.json");
cpSync(generatedConfigPath, stagedConfigPath);

const typescriptEffective = printConfig(
  nodePackageBinary,
  typescriptConfigPath,
);
const typescriptExtendsEffective = printConfig(
  nodePackageBinary,
  typescriptExtendsConfigPath,
);
const generatedEffective = printConfig(nativeBinary, stagedConfigPath);
const directEffective = printConfig(nativeBinary, directConfigPath);

assert.deepEqual(generatedEffective, typescriptEffective);
assert.deepEqual(generatedEffective, directEffective);
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
assertBehavior(nativeBinary, stagedConfigPath);
assertBehavior(nativeBinary, directConfigPath);

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

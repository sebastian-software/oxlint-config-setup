import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { OxlintConfig } from "oxlint";

import {
  allConfigOptions,
  configFileName,
  type ConfigOptions,
} from "../src/options.js";

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  exports?: Record<string, unknown>;
  files?: string[];
  name?: string;
  optionalDependencies?: Record<string, string>;
  packageManager?: string;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  sideEffects?: boolean;
  type?: string;
  version?: string;
}

interface PackResult {
  filename: string;
}

interface PublicPackageApi {
  getOxlintConfig(options?: ConfigOptions): OxlintConfig;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(repositoryRoot, "dist");
const configDirectory = resolve(distDirectory, "configs");
const manifestPath = resolve(repositoryRoot, "package.json");
const expectedConfigFiles = [
  "config-6e5e7d225541.json",
  "config-a53f054eadae.json",
  "config-0906d8f2bc55.json",
  "config-b6b7f7bf8051.json",
  "config-50a80845ac2f.json",
  "config-5d4ac567d473.json",
  "config-f4874d816c7b.json",
  "config-a8b1b44dc3f7.json",
];
const trackedDiffBefore = run("git", ["diff", "--binary"]);

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

function run(binary: string, args: string[], cwd = repositoryRoot): string {
  return execFileSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parsePackResult(source: string): PackResult {
  const trimmed = source.trim();
  const starts = [
    0,
    trimmed.lastIndexOf("\n{") + 1,
    trimmed.lastIndexOf("\n[") + 1,
  ]
    .filter(
      (start, index, values) => start >= 0 && values.indexOf(start) === index,
    )
    .toSorted((left, right) => right - left);
  let value: unknown;
  for (const start of starts) {
    try {
      value = parseJson(trimmed.slice(start));
      break;
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }

  assert(value !== undefined, "package manager pack did not return valid JSON");
  const candidate = Array.isArray(value) ? value[0] : value;
  assert(isRecord(candidate), "package manager pack must return an object");
  assert(
    typeof candidate.filename === "string",
    "package manager pack must return a tarball filename",
  );
  return { filename: candidate.filename };
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(directory, resolve(entry.parentPath, entry.name)).replaceAll(
        "\\",
        "/",
      ),
    )
    .toSorted();
}

function snapshot(directory: string): Map<string, string> {
  return new Map(
    listFiles(directory).map((file) => [
      file,
      readFileSync(resolve(directory, file), "utf8"),
    ]),
  );
}

async function importPublicPackage(
  specifier: string,
): Promise<PublicPackageApi> {
  const value: unknown = await import(specifier);
  assert(isRecord(value), "the built package must export a module object");
  assert.deepEqual(
    Object.keys(value).toSorted(),
    ["getOxlintConfig"],
    "the production skeleton must expose only the initial public loader",
  );
  assert.equal(typeof value.getOxlintConfig, "function");
  return value as unknown as PublicPackageApi;
}

function packDependency(packagePath: string, destination: string): string {
  const output = run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", destination],
    packagePath,
  );
  const result = parsePackResult(output);
  return resolve(destination, result.filename);
}

const manifest = readManifest(manifestPath);
assert.equal(manifest.name, "oxlint-config-setup");
assert.equal(manifest.type, "module");
assert.equal(manifest.sideEffects, false);
assert.deepEqual(manifest.files, ["dist"]);
assert.deepEqual(manifest.exports, {
  ".": {
    types: "./dist/index.d.ts",
    default: "./dist/index.js",
  },
});
assert.equal(manifest.engines?.node, "^22.18.0 || >=24.0.0");
assert.equal(manifest.packageManager, "pnpm@11.20.0");
assert.deepEqual(manifest.dependencies, undefined);
assert.deepEqual(manifest.optionalDependencies, undefined);
assert.deepEqual(manifest.peerDependencies, {
  oxlint: "1.77.0",
  "oxlint-tsgolint": "7.0.2001",
});
assert.equal(manifest.devDependencies?.oxlint, "1.77.0");
assert.equal(manifest.devDependencies?.["oxlint-tsgolint"], "7.0.2001");
assert.equal(manifest.devDependencies?.tsdown, "0.22.14");
assert.equal(manifest.devDependencies?.tsx, "4.23.8");
assert.equal(manifest.devDependencies?.typescript, "7.0.2");
const tsdownManifest = readManifest(
  resolve(repositoryRoot, "node_modules/tsdown/package.json"),
);
assert.equal(
  tsdownManifest.engines?.node,
  "^22.18.0 || >=24.11.0",
  "the build-only Node contract must stay distinct from the consumer engine",
);
assert.equal(run("pnpm", ["--version"]).trim(), "11.20.0");
assert(
  [10, 11].includes(Number.parseInt(run("npm", ["--version"]), 10)),
  "clean npm consumer tests support npm 10 and 11",
);
for (const lifecycle of ["install", "postinstall", "prepare"]) {
  assert.equal(
    manifest.scripts?.[lifecycle],
    undefined,
    `published consumers must not execute a ${lifecycle} script`,
  );
}

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
      `the package must not depend on ESLint (${field}.${dependency})`,
    );
  }
}
assert.doesNotMatch(
  readFileSync(resolve(repositoryRoot, "pnpm-lock.yaml"), "utf8"),
  /(?:^|\/)eslint(?:@|:|\/)/mu,
  "the production lockfile must not introduce an ESLint package",
);

const trackedGenerated = run("git", ["ls-files", "--", "dist/**"]).trim();
assert.equal(trackedGenerated, "", "dist output must never be committed");
const trackedScripts = run("git", ["ls-files", "--", "scripts"])
  .trim()
  .split("\n")
  .filter(Boolean);
assert(
  trackedScripts.every((file) => file.endsWith(".ts")),
  "all production package scripts must be TypeScript",
);

assert.deepEqual(
  allConfigOptions().map(configFileName),
  expectedConfigFiles,
  "the production package must preserve the reviewed option-to-artifact map",
);

rmSync(distDirectory, { recursive: true, force: true });
run("pnpm", ["run", "build"]);
const firstBuild = snapshot(distDirectory);
assert.deepEqual(
  [...firstBuild.keys()],
  ["configs", "index.d.ts", "index.js"]
    .flatMap((entry) =>
      entry === "configs"
        ? expectedConfigFiles.map((file) => `configs/${file}`)
        : [entry],
    )
    .toSorted(),
);

for (const [index, options] of allConfigOptions().entries()) {
  const value = parseJson(
    readFileSync(resolve(configDirectory, expectedConfigFiles[index]), "utf8"),
  );
  assert(isRecord(value));
  const config = value as {
    options?: { typeAware?: unknown };
    plugins?: unknown[];
    rules?: Record<string, unknown>;
  };
  assert.equal(config.options?.typeAware, true);
  assert.deepEqual(
    config.rules,
    options.ai ? { "no-warning-comments": "warn" } : {},
    "AI must remain a first-class behavior, not only an artifact-name bit",
  );
  assert.deepEqual(config.plugins, [
    "typescript",
    ...(options.react ? ["react"] : []),
    ...(options.node ? ["node"] : []),
  ]);
}

const effectiveConfig = parseJson(
  run(resolve(repositoryRoot, "node_modules/.bin/oxlint"), [
    "--config",
    resolve(configDirectory, expectedConfigFiles[0]),
    "--print-config",
    resolve(repositoryRoot, "src/index.ts"),
  ]),
);
assert(isRecord(effectiveConfig));
assert.equal(
  (effectiveConfig as { options?: { typeAware?: unknown } }).options?.typeAware,
  true,
  "the tested Oxlint peer must accept the generated type-aware root config",
);

const declarationSource = readFileSync(
  resolve(distDirectory, "index.d.ts"),
  "utf8",
);
assert.match(declarationSource, /interface ConfigOptions/u);
assert.match(declarationSource, /getOxlintConfig/u);
assert.doesNotMatch(declarationSource, /(?:\.\.\/|\/src\/|private\/tmp)/u);
const javascriptSource = readFileSync(
  resolve(distDirectory, "index.js"),
  "utf8",
);
assert.doesNotMatch(javascriptSource, /from\s+["'][^"']+\.ts["']/u);
assert.doesNotMatch(javascriptSource, /(?:\.\.\/src\/|private\/tmp)/u);

const publicApi = await importPublicPackage(
  `${pathToFileURL(resolve(distDirectory, "index.js")).href}?build=first`,
);
for (const options of allConfigOptions()) {
  const loaded = publicApi.getOxlintConfig(options);
  assert.equal(loaded.options?.typeAware, true);
  assert.deepEqual(
    loaded.rules,
    options.ai ? { "no-warning-comments": "warn" } : {},
  );
}
assert.throws(
  () => publicApi.getOxlintConfig({ unknown: true } as never),
  /Unsupported Oxlint config option: unknown/u,
);
assert.throws(
  () => publicApi.getOxlintConfig({ ai: "yes" } as never),
  /Oxlint config option ai must be a boolean/u,
);

rmSync(distDirectory, { recursive: true, force: true });
run("pnpm", ["run", "build"]);
assert.deepEqual(
  snapshot(distDirectory),
  firstBuild,
  "two clean production builds must be byte-identical",
);

const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-config-package-"));
try {
  const packOutput = run("pnpm", [
    "pack",
    "--json",
    "--pack-destination",
    temporaryRoot,
  ]);
  const packResult = parsePackResult(packOutput);
  const tarballPath = resolve(temporaryRoot, packResult.filename);
  const packedFiles = run("tar", ["-tzf", tarballPath])
    .trim()
    .split("\n")
    .filter((file) => !file.endsWith("/"))
    .toSorted();
  assert.deepEqual(
    packedFiles,
    [
      "package/LICENSE",
      "package/README.md",
      "package/package.json",
      "package/dist/index.d.ts",
      "package/dist/index.js",
      ...expectedConfigFiles.map((file) => `package/dist/configs/${file}`),
    ].toSorted(),
    "the package tarball must contain exactly the reviewed release files",
  );
  assert(
    packedFiles.every(
      (file) => !file.endsWith(".ts") || file.endsWith(".d.ts"),
    ),
    "the package tarball must not ship TypeScript source",
  );

  const oxlintTarball = packDependency(
    resolve(repositoryRoot, "node_modules/oxlint"),
    temporaryRoot,
  );
  const tsgolintTarball = packDependency(
    resolve(repositoryRoot, "node_modules/oxlint-tsgolint"),
    temporaryRoot,
  );
  const consumerRoot = resolve(temporaryRoot, "consumer");
  mkdirSync(consumerRoot);
  writeFileSync(
    resolve(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "clean-consumer", private: true, type: "module" }, null, 2)}\n`,
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
      tarballPath,
      oxlintTarball,
      tsgolintTarball,
    ],
    consumerRoot,
  );

  writeFileSync(
    resolve(consumerRoot, "consumer.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import { getOxlintConfig } from "oxlint-config-setup";',
      "const config = getOxlintConfig({ react: true, node: true, ai: true });",
      "assert.equal(config.options?.typeAware, true);",
      'assert.deepEqual(config.plugins, ["typescript", "react", "node"]);',
      "",
    ].join("\n"),
  );
  run("node", ["consumer.mjs"], consumerRoot);

  writeFileSync(
    resolve(consumerRoot, "consumer.ts"),
    [
      'import { getOxlintConfig, type ConfigOptions } from "oxlint-config-setup";',
      "const options = { react: true, ai: true } satisfies ConfigOptions;",
      "export default getOxlintConfig(options);",
      "",
    ].join("\n"),
  );
  writeFileSync(
    resolve(consumerRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
          target: "ES2023",
        },
        include: ["consumer.ts"],
      },
      null,
      2,
    )}\n`,
  );
  run(
    resolve(repositoryRoot, "node_modules/.bin/tsc"),
    ["-p", "tsconfig.json", "--noEmit"],
    consumerRoot,
  );

  const installedManifest = readManifest(
    resolve(consumerRoot, "node_modules/oxlint-config-setup/package.json"),
  );
  assert.equal(installedManifest.version, manifest.version);
  assert.deepEqual(
    listFiles(resolve(consumerRoot, "node_modules/oxlint-config-setup")),
    packedFiles.map((file) => file.replace(/^package\//u, "")).toSorted(),
  );

  const pnpmConsumerRoot = resolve(temporaryRoot, "pnpm-consumer");
  mkdirSync(pnpmConsumerRoot);
  writeFileSync(
    resolve(pnpmConsumerRoot, "package.json"),
    `${JSON.stringify({ name: "clean-pnpm-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  run(
    "pnpm",
    [
      "add",
      "--offline",
      "--ignore-scripts",
      "--no-optional",
      tarballPath,
      oxlintTarball,
      tsgolintTarball,
    ],
    pnpmConsumerRoot,
  );
  writeFileSync(
    resolve(pnpmConsumerRoot, "consumer.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import { getOxlintConfig } from "oxlint-config-setup";',
      "const config = getOxlintConfig({ ai: true });",
      "assert.equal(config.options?.typeAware, true);",
      'assert.equal(config.rules?.["no-warning-comments"], "warn");',
      "",
    ].join("\n"),
  );
  run("node", ["consumer.mjs"], pnpmConsumerRoot);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

const trackedDiffAfter = run("git", ["diff", "--binary"]);
assert.equal(
  trackedDiffAfter,
  trackedDiffBefore,
  "build and package verification must not change tracked sources",
);

console.log("Production package contract verified.");

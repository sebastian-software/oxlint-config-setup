import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { OxlintConfig } from "oxlint";

import { allConfigArtifacts, NAMED_ARTIFACTS } from "../src/artifacts.js";
import {
  allConfigOptions,
  configFileName,
  type ConfigOptions,
} from "../src/options.js";
import type { RuleSeverity } from "../src/rule-helpers.js";

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
  publishConfig?: Record<string, unknown>;
  scripts?: Record<string, string>;
  sideEffects?: boolean;
  type?: string;
  version?: string;
}

interface PackResult {
  filename: string;
}

interface PublicPackageApi {
  addRule(
    config: OxlintConfig,
    ruleName: string,
    severity: RuleSeverity,
    options?: readonly unknown[],
  ): void;
  configureRule(
    config: OxlintConfig,
    ruleName: string,
    options: readonly unknown[],
  ): void;
  disableAllRulesBut(config: OxlintConfig, keepRuleName: string): void;
  disableRule(config: OxlintConfig, ruleName: string): void;
  getExperimentalReactCompilerOxlintConfig(): OxlintConfig;
  getJestOxlintConfig(): OxlintConfig;
  getOxlintConfig(options?: ConfigOptions): OxlintConfig;
  getSyntaxOnlyOxlintConfig(): OxlintConfig;
  getVitestOxlintConfig(): OxlintConfig;
  setRuleSeverity(
    config: OxlintConfig,
    ruleName: string,
    severity: RuleSeverity,
  ): void;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(repositoryRoot, "dist");
const configDirectory = resolve(distDirectory, "configs");
const standaloneDirectory = resolve(distDirectory, "standalone");
const manifestPath = resolve(repositoryRoot, "package.json");
const workspaceSettingsPath = resolve(repositoryRoot, "pnpm-workspace.yaml");
const goldenStrictConfigFiles = [
  "config-6e5e7d225541.json",
  "config-a53f054eadae.json",
  "config-0906d8f2bc55.json",
  "config-b6b7f7bf8051.json",
  "config-50a80845ac2f.json",
  "config-5d4ac567d473.json",
  "config-f4874d816c7b.json",
  "config-a8b1b44dc3f7.json",
];
const goldenEssentialConfigFiles = [
  "config-82509afeef3f.json",
  "config-acf63cf99b5d.json",
  "config-8f62aab4e978.json",
  "config-f24164be786a.json",
  "config-e92f768e23b7.json",
  "config-c2c3c0abfc15.json",
  "config-1046d925e8f9.json",
  "config-0198ac2734f5.json",
];
const goldenRecommendedConfigFiles = [
  "config-2f3c4ec11c30.json",
  "config-a9ce253eb945.json",
  "config-804226b181d5.json",
  "config-9c8973d3e28e.json",
  "config-c2ce4a229fa1.json",
  "config-caa6192628d4.json",
  "config-9ca4275ddbb3.json",
  "config-fb9bc4bcf5ce.json",
];
const publicApiNames = [
  "addRule",
  "configureRule",
  "disableAllRulesBut",
  "disableRule",
  "getExperimentalReactCompilerOxlintConfig",
  "getJestOxlintConfig",
  "getOxlintConfig",
  "getSyntaxOnlyOxlintConfig",
  "getVitestOxlintConfig",
  "setRuleSeverity",
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
  assert(isRecord(candidate));
  if (typeof candidate.filename !== "string") {
    throw new TypeError("package manager pack result requires filename");
  }
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

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function importPublicPackage(
  specifier: string,
): Promise<PublicPackageApi> {
  const value: unknown = await import(specifier);
  assert(isRecord(value));
  assert.deepEqual(Object.keys(value).toSorted(), publicApiNames);
  for (const name of publicApiNames) assert.equal(typeof value[name], "function");
  return value as unknown as PublicPackageApi;
}

function packDependency(packagePath: string, destination: string): string {
  const output = run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", destination],
    packagePath,
  );
  return resolve(destination, parsePackResult(output).filename);
}

const manifest = readManifest(manifestPath);
assert.equal(manifest.name, "oxlint-config-setup");
assert.equal(manifest.type, "module");
assert.equal(manifest.sideEffects, false);
assert.deepEqual(manifest.files, ["dist"]);
assert.equal(manifest.engines?.node, ">=24.11.0");
assert.equal(manifest.packageManager, "pnpm@11.20.0");
assert.deepEqual(manifest.publishConfig, { access: "public", provenance: true });
assert.deepEqual(manifest.dependencies, undefined);
assert.deepEqual(manifest.optionalDependencies, undefined);
assert.deepEqual(manifest.peerDependencies, {
  oxlint: "1.77.0",
  "oxlint-tsgolint": "7.0.2001",
});
assert.equal(manifest.devDependencies?.oxlint, "1.77.0");
assert.equal(manifest.devDependencies?.["oxlint-tsgolint"], "7.0.2001");
assert.equal(manifest.devDependencies?.typescript, "7.0.2");
assert.equal(manifest.devDependencies?.tsdown, "0.22.14");
assert.equal(manifest.devDependencies?.tsx, "4.23.8");
assert.deepEqual(manifest.exports?.["."], {
  types: "./dist/index.d.ts",
  default: "./dist/index.js",
});
for (const artifact of allConfigArtifacts()) {
  assert.equal(
    manifest.exports?.[`./json/${artifact.publicName}`],
    `./dist/standalone/${artifact.publicName}.json`,
  );
}

const tsdownManifest = readManifest(
  resolve(repositoryRoot, "node_modules/tsdown/package.json"),
);
assert.equal(tsdownManifest.engines?.node, "^22.18.0 || >=24.11.0");
assert.equal(run("pnpm", ["--version"]).trim(), "11.20.0");
assert([10, 11].includes(Number.parseInt(run("npm", ["--version"]), 10)));
const pnpmConfig = parseJson(run("pnpm", ["config", "list", "--json"]));
assert(isRecord(pnpmConfig));
assert.equal(pnpmConfig.engineStrict, true);
assert.equal(pnpmConfig.autoInstallPeers, false);
const workspaceSettings = readFileSync(workspaceSettingsPath, "utf8");
assert.match(workspaceSettings, /^engineStrict: true$/mu);
assert.match(workspaceSettings, /^autoInstallPeers: false$/mu);
for (const lifecycle of ["install", "postinstall", "prepare"]) {
  assert.equal(manifest.scripts?.[lifecycle], undefined);
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
);
assert.equal(run("git", ["ls-files", "--", "dist/**"]).trim(), "");
assert(
  run("git", ["ls-files", "--", "scripts"])
    .trim()
    .split("\n")
    .filter(Boolean)
    .every((file) => file.endsWith(".ts")),
);
assert.deepEqual(
  allConfigOptions()
    .filter((options) => options.level === "strict")
    .map(configFileName),
  goldenStrictConfigFiles,
  "the reviewed three-bit strict artifact mapping must stay stable",
);
assert.deepEqual(
  allConfigOptions()
    .filter((options) => options.level === "essential")
    .map(configFileName),
  goldenEssentialConfigFiles,
  "the reviewed three-bit essential artifact mapping must stay stable",
);
assert.deepEqual(
  allConfigOptions()
    .filter((options) => options.level === "recommended")
    .map(configFileName),
  goldenRecommendedConfigFiles,
  "the reviewed three-bit recommended artifact mapping must stay stable",
);
assert.equal(allConfigOptions().length, 24);

rmSync(distDirectory, { recursive: true, force: true });
run("pnpm", ["run", "build"]);
const artifacts = allConfigArtifacts();
const expectedConfigFiles = artifacts.map((artifact) => artifact.fileName).toSorted();
const expectedStandaloneFiles = artifacts
  .map((artifact) => `${artifact.publicName}.json`)
  .toSorted();
const firstBuild = snapshot(distDirectory);
assert.deepEqual(
  [...firstBuild.keys()],
  [
    "index.d.ts",
    "index.js",
    ...expectedConfigFiles.map((file) => `configs/${file}`),
    ...expectedStandaloneFiles.map((file) => `standalone/${file}`),
  ].toSorted(),
);

for (const artifact of artifacts) {
  const internal = parseJson(
    readFileSync(resolve(configDirectory, artifact.fileName), "utf8"),
  );
  const standalone = parseJson(
    readFileSync(
      resolve(standaloneDirectory, `${artifact.publicName}.json`),
      "utf8",
    ),
  );
  assert.deepEqual(internal, artifact.config);
  assert.deepEqual(standalone, internal);
  assert.equal(
    (internal as { options?: { typeAware?: unknown } }).options?.typeAware,
    artifact.typeAware,
  );
}

const declarationSource = readFileSync(resolve(distDirectory, "index.d.ts"), "utf8");
for (const name of [
  "ConfigLevel",
  "ConfigOptions",
  "RuleSeverity",
  ...publicApiNames,
]) {
  assert.match(declarationSource, new RegExp(name, "u"));
}
assert.doesNotMatch(declarationSource, /(?:\.\.\/|\/src\/|private\/tmp)/u);
const javascriptSource = readFileSync(resolve(distDirectory, "index.js"), "utf8");
assert.doesNotMatch(javascriptSource, /from\s+["'][^"']+\.ts["']/u);
assert.doesNotMatch(javascriptSource, /(?:\.\.\/src\/|private\/tmp)/u);

const publicApi = await importPublicPackage(
  `${pathToFileURL(resolve(distDirectory, "index.js")).href}?build=first`,
);
for (const options of allConfigOptions()) {
  const loaded = publicApi.getOxlintConfig(options);
  const expected = artifacts.find(
    (artifact) => artifact.fileName === configFileName(options),
  );
  assert(expected);
  assert.deepEqual(loaded, expected.config);
}
assert.equal(publicApi.getSyntaxOnlyOxlintConfig().options?.typeAware, false);
assert(publicApi.getVitestOxlintConfig().plugins?.includes("vitest"));
assert(publicApi.getJestOxlintConfig().plugins?.includes("jest"));
assert.equal(
  publicApi.getExperimentalReactCompilerOxlintConfig().rules?.[
    "react/react-compiler"
  ],
  "warn",
);
assert.throws(
  () => publicApi.getOxlintConfig({ unknown: true } as never),
  /Unsupported Oxlint config option: unknown/u,
);
assert.throws(
  () => publicApi.getOxlintConfig({ ai: "yes" } as never),
  /Oxlint config option ai must be a boolean/u,
);
assert.throws(
  () => publicApi.getOxlintConfig({ level: "relaxed" } as never),
  /Oxlint config option level must be one of: essential, recommended, strict/u,
);
const essential = publicApi.getOxlintConfig({
  level: "essential",
  react: true,
  node: true,
  ai: true,
});
assert.equal(essential.rules?.["typescript/no-floating-promises"], "error");
assert.equal(essential.rules?.["typescript/switch-exhaustiveness-check"], undefined);
assert.equal(essential.plugins?.includes("import"), false);
assert.equal(essential.rules?.["eslint/no-warning-comments"], "warn");
assert.deepEqual(essential.rules?.["eslint/valid-typeof"], [
  "error",
  { requireStringLiterals: true },
]);
const recommended = publicApi.getOxlintConfig();
assert.equal(recommended.rules?.["import/no-duplicates"], "error");
assert.equal(recommended.rules?.["import/no-self-import"], undefined);
const strict = publicApi.getOxlintConfig({ level: "strict" });
assert.equal(strict.rules?.["import/no-self-import"], "error");
assert.equal(strict.rules?.["eslint/no-warning-comments"], undefined);
const customized = publicApi.getOxlintConfig({ ai: true });
publicApi.setRuleSeverity(
  customized,
  "eslint/no-warning-comments",
  "error",
);
publicApi.configureRule(customized, "eslint/valid-typeof", [
  { requireStringLiterals: false },
]);
publicApi.disableRule(customized, "import/no-duplicates");
publicApi.addRule(customized, "eslint/no-alert", "warn");
assert.equal(customized.rules?.["eslint/no-warning-comments"], "error");
assert.deepEqual(customized.rules?.["eslint/valid-typeof"], [
  "error",
  { requireStringLiterals: false },
]);
assert.equal(customized.rules?.["import/no-duplicates"], "off");
assert.equal(customized.rules?.["eslint/no-alert"], "warn");
assert.equal(
  publicApi.getOxlintConfig({ ai: true }).rules?.[
    "eslint/no-warning-comments"
  ],
  "warn",
  "customizing one loader result must not mutate later results",
);
publicApi.disableAllRulesBut(customized, "eslint/valid-typeof");
assert.deepEqual(customized.rules?.["eslint/valid-typeof"], [
  "error",
  { requireStringLiterals: false },
]);
assert.equal(customized.rules?.["eslint/no-alert"], "off");

const mergedOptions: OxlintConfig = {
  rules: {
    "custom/detailed-options": [
      "error",
      {
        allow: ["warn"],
        limits: { max: 10, min: 1 },
        mode: "safe",
      },
      "tail",
    ],
  },
};
publicApi.configureRule(mergedOptions, "custom/detailed-options", [
  { allow: ["error"], limits: { max: 20 } },
]);
assert.deepEqual(mergedOptions.rules?.["custom/detailed-options"], [
  "error",
  {
    allow: ["error"],
    limits: { max: 20, min: 1 },
    mode: "safe",
  },
  "tail",
]);

rmSync(distDirectory, { recursive: true, force: true });
run("pnpm", ["run", "build"]);
assert.deepEqual(snapshot(distDirectory), firstBuild);

const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-config-package-"));
try {
  const packOutput = run("pnpm", [
    "pack",
    "--json",
    "--pack-destination",
    temporaryRoot,
  ]);
  const tarballPath = resolve(
    temporaryRoot,
    parsePackResult(packOutput).filename,
  );
  const firstTarballHash = sha256(tarballPath);
  const secondPackRoot = resolve(temporaryRoot, "second-pack");
  mkdirSync(secondPackRoot);
  const secondTarballPath = resolve(
    secondPackRoot,
    parsePackResult(
      run("pnpm", ["pack", "--json", "--pack-destination", secondPackRoot]),
    ).filename,
  );
  assert.equal(
    sha256(secondTarballPath),
    firstTarballHash,
    "two clean release tarballs must be byte-identical",
  );

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
      ...expectedStandaloneFiles.map(
        (file) => `package/dist/standalone/${file}`,
      ),
    ].toSorted(),
  );
  assert(
    packedFiles.every(
      (file) => !file.endsWith(".ts") || file.endsWith(".d.ts"),
    ),
  );

  const oxlintPackageRoot = realpathSync(resolve(repositoryRoot, "node_modules/oxlint"));
  const bindingRoot = resolve(oxlintPackageRoot, "../@oxlint");
  const bindingName = readdirSync(bindingRoot).find((name) =>
    name.startsWith("binding-"),
  );
  assert(bindingName, "the installed Oxlint peer must include its platform binding");
  const oxlintTarball = packDependency(oxlintPackageRoot, temporaryRoot);
  const bindingTarball = packDependency(
    realpathSync(resolve(bindingRoot, bindingName)),
    temporaryRoot,
  );
  const tsgolintTarball = packDependency(
    realpathSync(resolve(repositoryRoot, "node_modules/oxlint-tsgolint")),
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
      bindingTarball,
      tsgolintTarball,
    ],
    consumerRoot,
  );

  writeFileSync(
    resolve(consumerRoot, "consumer.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import { copyFileSync } from "node:fs";',
      'import { addRule, configureRule, disableAllRulesBut, disableRule, getExperimentalReactCompilerOxlintConfig, getJestOxlintConfig, getOxlintConfig, getSyntaxOnlyOxlintConfig, getVitestOxlintConfig, setRuleSeverity } from "oxlint-config-setup";',
      'assert(getOxlintConfig({ react: true, node: true, ai: true }).plugins.includes("react"));',
      'assert.equal(getOxlintConfig({ level: "essential" }).rules["typescript/switch-exhaustiveness-check"], undefined);',
      'assert.equal(getOxlintConfig().rules["import/no-self-import"], undefined);',
      'assert.equal(getOxlintConfig({ level: "strict" }).rules["import/no-self-import"], "error");',
      'assert.equal(getSyntaxOnlyOxlintConfig().options.typeAware, false);',
      'assert(getVitestOxlintConfig().plugins.includes("vitest"));',
      'assert(getJestOxlintConfig().plugins.includes("jest"));',
      'assert.equal(getExperimentalReactCompilerOxlintConfig().rules["react/react-compiler"], "warn");',
      'const customized = getOxlintConfig({ ai: true });',
      'setRuleSeverity(customized, "eslint/no-warning-comments", "error");',
      'configureRule(customized, "eslint/valid-typeof", [{ requireStringLiterals: false }]);',
      'disableRule(customized, "import/no-duplicates");',
      'addRule(customized, "eslint/no-alert", "warn");',
      'assert.equal(customized.rules["eslint/no-warning-comments"], "error");',
      'assert.deepEqual(customized.rules["eslint/valid-typeof"], ["error", { requireStringLiterals: false }]);',
      'assert.equal(customized.rules["import/no-duplicates"], "off");',
      'const mergedOptions = { rules: { "custom/detailed-options": ["error", { allow: ["warn"], limits: { max: 10, min: 1 }, mode: "safe" }, "tail"] } };',
      'configureRule(mergedOptions, "custom/detailed-options", [{ allow: ["error"], limits: { max: 20 } }]);',
      'assert.deepEqual(mergedOptions.rules["custom/detailed-options"], ["error", { allow: ["error"], limits: { max: 20, min: 1 }, mode: "safe" }, "tail"]);',
      'disableAllRulesBut(customized, "eslint/valid-typeof");',
      'assert.equal(customized.rules["eslint/no-alert"], "off");',
      'copyFileSync(new URL(import.meta.resolve("oxlint-config-setup/json/default")), ".oxlintrc.json");',
      "",
    ].join("\n"),
  );
  run("node", ["consumer.mjs"], consumerRoot);
  writeFileSync(
    resolve(consumerRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          target: "ES2023",
        },
        include: ["*.ts"],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    resolve(consumerRoot, "valid.ts"),
    "export async function complete(): Promise<void> { await Promise.resolve(); }\nawait complete();\n",
  );
  writeFileSync(
    resolve(consumerRoot, "invalid.ts"),
    "async function save(): Promise<void> { await Promise.resolve(); }\nsave();\n",
  );
  const consumerOxlint = resolve(consumerRoot, "node_modules/.bin/oxlint");
  run(consumerOxlint, ["--config", ".oxlintrc.json", "valid.ts"], consumerRoot);
  assert.throws(
    () => run(consumerOxlint, ["--config", ".oxlintrc.json", "invalid.ts"], consumerRoot),
    (error: unknown) =>
      error instanceof Error &&
      /no-floating-promises/u.test(
        String((error as Error & { stdout?: string }).stdout),
      ),
  );

  writeFileSync(
    resolve(consumerRoot, "oxlint.config.ts"),
    'import { getOxlintConfig } from "oxlint-config-setup";\nexport default getOxlintConfig({ react: true, node: true });\n',
  );
  const printed = parseJson(
    run(
      consumerOxlint,
      ["--config", "oxlint.config.ts", "--print-config", "valid.ts"],
      consumerRoot,
    ),
  );
  assert(isRecord(printed));
  assert.equal(
    (printed as { options?: { typeAware?: unknown } }).options?.typeAware,
    true,
  );

  writeFileSync(
    resolve(consumerRoot, "consumer.ts"),
    [
      'import { getOxlintConfig, getVitestOxlintConfig, setRuleSeverity, type ConfigLevel, type ConfigOptions, type RuleSeverity } from "oxlint-config-setup";',
      'const level: ConfigLevel = "essential";',
      'const severity: RuleSeverity = "warn";',
      "const options = { level, react: true, ai: true } satisfies ConfigOptions;",
      "void getVitestOxlintConfig();",
      "const config = getOxlintConfig(options);",
      'setRuleSeverity(config, "eslint/no-warning-comments", severity);',
      "export default config;",
      "",
    ].join("\n"),
  );
  run(
    resolve(repositoryRoot, "node_modules/.bin/tsc"),
    ["-p", "tsconfig.json", "--noEmit"],
    consumerRoot,
  );

  const installedRoot = resolve(
    consumerRoot,
    "node_modules/oxlint-config-setup",
  );
  assert.deepEqual(
    listFiles(installedRoot),
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
  copyFileSync(
    resolve(pnpmConsumerRoot, "node_modules/oxlint-config-setup/dist/standalone/ai.json"),
    resolve(pnpmConsumerRoot, ".oxlintrc.json"),
  );
  const aiConfig = parseJson(
    readFileSync(resolve(pnpmConsumerRoot, ".oxlintrc.json"), "utf8"),
  );
  assert.equal(
    (aiConfig as { rules?: Record<string, unknown> }).rules?.[
      "eslint/no-warning-comments"
    ],
    "warn",
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

assert.equal(run("git", ["diff", "--binary"]), trackedDiffBefore);
console.log(
  `Production package verified: ${allConfigOptions().length} configurable + ${NAMED_ARTIFACTS.length} named artifacts.`,
);

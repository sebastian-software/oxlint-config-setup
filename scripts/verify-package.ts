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

import type { OxlintConfig, OxlintOverride } from "oxlint";

import {
  expectedDependencies,
  expectedPackageManager,
  expectedPeerDependencies,
  expectedVersions,
} from "./expected-toolchain.js";
import { allConfigArtifacts, NAMED_ARTIFACTS } from "../src/artifacts.js";
import {
  allConfigOptions,
  configFileName,
  type ConfigLevel,
  type ConfigOptions,
} from "../src/options.js";
import type { RuleSeverity } from "../src/rule-helpers.js";

interface PackageManifest {
  author?: {
    name?: string;
    url?: string;
  };
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  exports?: Record<string, unknown>;
  files?: string[];
  funding?: {
    type?: string;
    url?: string;
  };
  homepage?: string;
  keywords?: string[];
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
  getComposedOxlintConfig(options?: {
    ai?: boolean;
    level?: ConfigLevel;
    overrides?: readonly OxlintOverride[];
    scopes?: readonly ("react" | "node" | "vitest" | "jest" | "scripts" | "config" | "declarations" | { files?: readonly string[]; scope: "react" | "node" | "vitest" | "jest" | "scripts" | "config" | "declarations" })[];
  }): OxlintConfig;
  getOxlintConfig(options?: ConfigOptions): OxlintConfig;
  getSyntaxOnlyOxlintConfig(): OxlintConfig;
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
  "config-52e6793e6c93.json",
  "config-dc471286f051.json",
  "config-63031013708b.json",
  "config-e7e1aaadf7f2.json",
  "config-fb86e16760f7.json",
  "config-e726676209a2.json",
  "config-4352036c232f.json",
  "config-bae2ef7973d1.json",
];
const goldenEssentialConfigFiles = [
  "config-82322083e7bf.json",
  "config-dadb0daa6205.json",
  "config-00d52200f3e0.json",
  "config-189735ef89aa.json",
  "config-352c2037d43f.json",
  "config-5742048c56ae.json",
  "config-125ec151f6e6.json",
  "config-3382d55694bf.json",
];
const goldenRecommendedConfigFiles = [
  "config-eb20a29e746f.json",
  "config-57bab470d5b3.json",
  "config-2f248429ffd2.json",
  "config-a984a81622ad.json",
  "config-3e78a430ec30.json",
  "config-e5c8cd1bc830.json",
  "config-ccc3defe84cc.json",
  "config-ac42a9240369.json",
];
const publicApiNames = [
  "addRule",
  "configureRule",
  "disableAllRulesBut",
  "disableRule",
  "getComposedOxlintConfig",
  "getExperimentalReactCompilerOxlintConfig",
  "getOxlintConfig",
  "getSyntaxOnlyOxlintConfig",
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
  for (const name of publicApiNames)
    assert.equal(typeof value[name], "function");
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
const allowPinnedPeerMismatch =
  process.env.CANARY_ALLOW_PINNED_PEER_MISMATCH === "true";
assert.equal(manifest.name, "oxlint-config-setup");
assert.equal(
  manifest.description,
  "Opinionated, prebuilt, type-aware Oxlint configurations for modern TypeScript projects.",
);
assert.equal(
  manifest.homepage,
  "https://sebastian-software.github.io/oxlint-config-setup/",
);
assert.deepEqual(manifest.keywords, [
  "oxlint",
  "typescript",
  "javascript",
  "linting",
  "static-analysis",
  "code-quality",
  "react",
  "nodejs",
  "ai",
]);
assert.equal(manifest.type, "module");
assert.equal(manifest.sideEffects, false);
assert.deepEqual(manifest.files, ["dist"]);
assert.equal(manifest.engines?.node, `>=${expectedVersions.node}`);
assert.equal(manifest.packageManager, expectedPackageManager);
assert.deepEqual(manifest.author, {
  name: "Sebastian Software GmbH",
  url: "https://sebastian-software.com",
});
assert.deepEqual(manifest.funding, {
  type: "github",
  url: "https://github.com/sponsors/sebastian-software",
});
assert.deepEqual(manifest.publishConfig, {
  access: "public",
  provenance: true,
});
assert.deepEqual(manifest.dependencies, expectedDependencies);
assert.deepEqual(manifest.optionalDependencies, undefined);
assert.deepEqual(manifest.peerDependencies, expectedPeerDependencies);
assert.equal(
  manifest.devDependencies?.oxlint,
  expectedPeerDependencies.oxlint,
);
assert.equal(
  manifest.devDependencies?.["oxlint-tsgolint"],
  expectedPeerDependencies["oxlint-tsgolint"],
);
assert.equal(manifest.devDependencies?.typescript, expectedVersions.typescript);
assert.equal(manifest.devDependencies?.tsdown, expectedVersions.tsdown);
assert.equal(manifest.devDependencies?.tsx, expectedVersions.tsx);
assert.deepEqual(manifest.exports?.["."], {
  types: "./dist/index.d.ts",
  default: "./dist/index.js",
});
assert.deepEqual(
  Object.keys(manifest.exports ?? {}).toSorted(),
  [
    ".",
    ...allConfigArtifacts().map((artifact) => `./json/${artifact.publicName}`),
  ].toSorted(),
);
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
if (process.env.CANARY_ALLOW_PNPM_VERSION !== "true") {
  assert.equal(run("pnpm", ["--version"]).trim(), expectedVersions.pnpm);
}
assert([10, 11].includes(Number.parseInt(run("npm", ["--version"]), 10)));
const pnpmConfig = parseJson(run("pnpm", ["config", "list", "--json"]));
assert(isRecord(pnpmConfig));
assert.equal(pnpmConfig.engineStrict, true);
assert.equal(pnpmConfig.autoInstallPeers, false);
const workspaceSettings = readFileSync(workspaceSettingsPath, "utf8");
assert.match(workspaceSettings, /^engineStrict: true$/mu);
assert.match(workspaceSettings, /^autoInstallPeers: false$/mu);
for (const packageName of [
  "project-service",
  "tsconfig-utils",
  "typescript-estree",
  "utils",
]) {
  assert.match(
    workspaceSettings,
    new RegExp(
      `^    "@typescript-eslint/${packageName}>typescript": "${expectedVersions.typescript.replaceAll(".", "\\.")}"$`,
      "mu",
    ),
  );
}
for (const lifecycle of ["install", "postinstall", "prepare"]) {
  assert.equal(manifest.scripts?.[lifecycle], undefined);
}

assert.equal(manifest.devDependencies?.eslint, undefined);
assert.equal(manifest.devDependencies?.["eslint-plugin-testing-library"], undefined);
assert.equal(manifest.devDependencies?.["eslint-plugin-playwright"], undefined);
assert.equal(manifest.devDependencies?.["eslint-plugin-sonarjs"], undefined);
assert.equal(manifest.devDependencies?.["eslint-plugin-storybook"], undefined);
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
const expectedConfigFiles = artifacts
  .map((artifact) => artifact.fileName)
  .toSorted();
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

const declarationSource = readFileSync(
  resolve(distDirectory, "index.d.ts"),
  "utf8",
);
for (const name of [
  "ConfigLevel",
  "ConfigOptions",
  "ComposedConfigOptions",
  "ScopedConfig",
  "ScopedConfigInput",
  "ScopedConfigSelection",
  "RuleTarget",
  "RuleSeverity",
  ...publicApiNames,
]) {
  assert.match(declarationSource, new RegExp(name, "u"));
}
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
  const expected = artifacts.find(
    (artifact) => artifact.fileName === configFileName(options),
  );
  assert(expected);
  assert.deepEqual(
    loaded.jsPlugins?.map((plugin) =>
      typeof plugin === "string" ? plugin : plugin.name,
    ),
    ["sonarjs"],
  );
  assert.equal(loaded.rules?.["sonarjs/no-duplicated-branches"], "error");
  const sonarRuleNames = Object.keys(loaded.rules ?? {}).filter((rule) =>
    rule.startsWith("sonarjs/"),
  );
  assert.equal(sonarRuleNames.length, options.ai ? 19 : 13);
  assert.equal(loaded.rules?.["sonarjs/no-hardcoded-secrets"], "warn");
  assert.deepEqual(
    loaded.rules?.["sonarjs/max-union-size"],
    options.ai ? ["error", { threshold: 5 }] : undefined,
  );
  const testingLibraryOverride = loaded.overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) =>
        typeof plugin !== "string" && plugin.name === "testing-library",
    ),
  );
  const playwrightOverride = loaded.overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "playwright",
    ),
  );
  const storybookOverride = loaded.overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "storybook",
    ),
  );
  assert.deepEqual(playwrightOverride?.files, [
    "**/*.spec.ts",
  ]);
  assert.equal(playwrightOverride?.jsPlugins?.length, 1);
  assert.equal(Object.keys(playwrightOverride?.rules ?? {}).length, 37);
  assert.equal(playwrightOverride?.rules?.["playwright/no-focused-test"], "error");
  assert.equal(playwrightOverride?.globals?.AbortController, "readonly");
  assert.deepEqual(storybookOverride?.files, ["**/*.stories.{ts,tsx}"]);
  assert.equal(storybookOverride?.jsPlugins?.length, 1);
  assert.equal(Object.keys(storybookOverride?.rules ?? {}).length, 11);
  assert.equal(storybookOverride?.rules?.["storybook/default-exports"], "error");
  assert.deepEqual(testingLibraryOverride?.files, [
    "**/*.test.{ts,tsx}",
    "**/__tests__/**/*.{ts,tsx}",
  ]);
  assert.equal(testingLibraryOverride?.jsPlugins?.length, 1);
  assert.equal(
    Object.keys(testingLibraryOverride?.rules ?? {}).length,
    options.react ? 22 : 15,
  );
  assert.deepEqual(
    testingLibraryOverride?.rules?.["testing-library/await-async-events"],
    ["error", { eventModule: "userEvent" }],
  );
  assert.deepEqual(
    testingLibraryOverride?.rules?.["testing-library/no-dom-import"],
    options.react ? ["error", "react"] : undefined,
  );
  const loadedCore = { ...loaded, rules: { ...loaded.rules } };
  delete loadedCore.overrides;
  delete loadedCore.jsPlugins;
  if (loadedCore.rules !== undefined) {
    for (const rule of sonarRuleNames) delete loadedCore.rules[rule];
  }
  assert.deepEqual(loadedCore, expected.config);
}
assert.equal(
  publicApi.getComposedOxlintConfig().rules?.[
    "sonarjs/no-duplicated-branches"
  ],
  "error",
);
assert.equal(
  publicApi.getOxlintConfig({ ai: true }).rules?.[
    "sonarjs/no-duplicated-branches"
  ],
  publicApi.getOxlintConfig().rules?.["sonarjs/no-duplicated-branches"],
  "AI must retain the automatic base SonarJS policy",
);
assert.equal(
  publicApi.getOxlintConfig().rules?.["sonarjs/no-nested-switch"],
  undefined,
);
assert.equal(
  publicApi.getOxlintConfig({ ai: true }).rules?.[
    "sonarjs/no-nested-switch"
  ],
  "error",
);
assert.deepEqual(
  publicApi.getComposedOxlintConfig({ ai: true }).rules?.[
    "sonarjs/no-duplicate-string"
  ],
  ["error", { threshold: 3 }],
);
const syntaxOnly = publicApi.getSyntaxOnlyOxlintConfig();
assert.equal(syntaxOnly.options?.typeAware, false);
assert.equal(syntaxOnly.rules?.["sonarjs/no-duplicated-branches"], "error");
assert.equal(
  publicApi.getExperimentalReactCompilerOxlintConfig().rules?.[
    "sonarjs/no-duplicated-branches"
  ],
  "error",
);
const composedVitest = publicApi.getComposedOxlintConfig({
  scopes: ["vitest"],
});
const composedJest = publicApi.getComposedOxlintConfig({ scopes: ["jest"] });
assert(composedVitest.plugins?.includes("vitest"));
assert(composedJest.plugins?.includes("jest"));
assert.deepEqual(
  composedVitest.overrides?.find((override) => override.env?.vitest)?.files,
  ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
);
assert.deepEqual(
  composedJest.overrides?.find((override) => override.env?.jest)?.files,
  ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
);
assert.equal(
  Object.keys(
    publicApi
      .getComposedOxlintConfig()
      .overrides?.find((override) =>
        override.jsPlugins?.some(
          (plugin) =>
            typeof plugin !== "string" && plugin.name === "testing-library",
        ),
      )?.rules ?? {},
  ).length,
  15,
);
assert.deepEqual(
  publicApi
    .getComposedOxlintConfig({ scopes: ["react"] })
    .overrides?.find((override) =>
      override.jsPlugins?.some(
        (plugin) =>
          typeof plugin !== "string" && plugin.name === "testing-library",
      ),
    )?.rules?.["testing-library/no-dom-import"],
  ["error", "react"],
);
assert.equal(
  publicApi
    .getComposedOxlintConfig()
    .overrides?.find((override) =>
      override.jsPlugins?.some(
        (plugin) => typeof plugin !== "string" && plugin.name === "playwright",
      ),
    )?.rules?.["playwright/no-focused-test"],
  "error",
);
const firstPlaywrightRules = publicApi
  .getOxlintConfig()
  .overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "playwright",
    ),
  )?.rules;
const secondPlaywrightRules = publicApi
  .getOxlintConfig()
  .overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "playwright",
    ),
  )?.rules;
assert.notEqual(firstPlaywrightRules, secondPlaywrightRules);
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
  () => publicApi.getOxlintConfig({ sonarjs: true } as never),
  /Unsupported Oxlint config option: sonarjs/u,
);
assert.throws(
  () => publicApi.getComposedOxlintConfig({ sonarjs: true } as never),
  /Unsupported composed Oxlint config option: sonarjs/u,
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
assert.equal(
  essential.rules?.["typescript/switch-exhaustiveness-check"],
  "off",
);
assert.equal(essential.plugins?.includes("import"), true);
assert.equal(essential.rules?.["eslint/no-warning-comments"], "warn");
assert.deepEqual(essential.rules?.["eslint/valid-typeof"], [
  "error",
  { requireStringLiterals: true },
]);
const recommended = publicApi.getOxlintConfig();
assert.equal(recommended.rules?.["import/no-duplicates"], "error");
assert.equal(recommended.rules?.["import/no-self-import"], "off");
const strict = publicApi.getOxlintConfig({ level: "strict" });
assert.equal(strict.rules?.["import/no-self-import"], "error");
assert.equal(strict.rules?.["eslint/no-warning-comments"], "off");
const composed = publicApi.getComposedOxlintConfig({
  scopes: [
    { scope: "react", files: ["packages/web/**/*.{jsx,tsx}"] },
    "vitest",
    "scripts",
  ],
  overrides: [
    {
      files: ["**/*.test.tsx"],
      plugins: ["jsx-a11y"],
      rules: { "react/jsx-key": "off" },
    },
  ],
});
assert.equal(composed.options?.typeAware, true);
assert(composed.plugins?.includes("vitest"));
assert(composed.plugins?.includes("node"));
assert.deepEqual(
  composed.overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "testing-library",
    ),
  )
    ?.rules?.["testing-library/no-dom-import"],
  ["error", "react"],
);
assert.equal(
  composed.overrides?.find((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "playwright",
    ),
  )?.rules?.["playwright/no-focused-test"],
  "error",
);
assert.deepEqual(composed.overrides?.at(-1)?.plugins, composed.plugins);
const customized = publicApi.getOxlintConfig({ ai: true });
publicApi.setRuleSeverity(customized, "eslint/no-warning-comments", "error");
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
  publicApi.getOxlintConfig({ ai: true }).rules?.["eslint/no-warning-comments"],
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
  const packedManifest = parseJson(
    run("tar", ["-xOf", tarballPath, "package/package.json"]),
  );
  assert(isRecord(packedManifest));
  assert.deepEqual(packedManifest.author, manifest.author);
  assert.deepEqual(packedManifest.funding, manifest.funding);
  const packedReadme = run("tar", ["-xOf", tarballPath, "package/README.md"]);
  assert.match(
    packedReadme,
    /The package is published but remains pre-1\.0 rather than stable or mature\./u,
  );
  assert.doesNotMatch(
    packedReadme,
    /`v\d+\.\d+\.\d+` is the current published release\./u,
  );
  assert.doesNotMatch(packedReadme, /publishing remains an explicit maintainer action/u);

  const oxlintPackageRoot = realpathSync(
    resolve(repositoryRoot, "node_modules/oxlint"),
  );
  const bindingRoot = resolve(oxlintPackageRoot, "../@oxlint");
  const bindingName = readdirSync(bindingRoot).find((name) =>
    name.startsWith("binding-"),
  );
  assert(
    bindingName,
    "the installed Oxlint peer must include its platform binding",
  );
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
      ...(allowPinnedPeerMismatch ? ["--legacy-peer-deps"] : []),
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
      'import { addRule, configureRule, disableAllRulesBut, disableRule, getComposedOxlintConfig, getExperimentalReactCompilerOxlintConfig, getOxlintConfig, getSyntaxOnlyOxlintConfig, setRuleSeverity } from "oxlint-config-setup";',
      'assert(getOxlintConfig({ react: true, node: true, ai: true }).plugins.includes("react"));',
      'assert.equal(getOxlintConfig({ level: "essential" }).rules["typescript/switch-exhaustiveness-check"], "off");',
      'assert.equal(getOxlintConfig().rules["import/no-self-import"], "off");',
      'assert.equal(getOxlintConfig({ level: "strict" }).rules["import/no-self-import"], "error");',
      "assert.equal(getSyntaxOnlyOxlintConfig().options.typeAware, false);",
      'assert.equal(getExperimentalReactCompilerOxlintConfig().rules["react/react-compiler"], "warn");',
      'const defaultConfig = getOxlintConfig();',
      'const testingLibrary = defaultConfig.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "testing-library"));',
      'const playwright = defaultConfig.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "playwright"));',
      'const storybook = defaultConfig.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "storybook"));',
      'assert.equal(testingLibrary.jsPlugins.at(-1).name, "testing-library");',
      'assert.equal(playwright.jsPlugins.at(-1).name, "playwright");',
      'assert.equal(playwright.rules["playwright/no-focused-test"], "error");',
      'assert.equal(storybook.jsPlugins.at(-1).name, "storybook");',
      'assert.equal(storybook.rules["storybook/default-exports"], "error");',
      'assert.equal(defaultConfig.jsPlugins.at(-1).name, "sonarjs");',
      'assert.equal(defaultConfig.rules["sonarjs/no-duplicated-branches"], "error");',
      'assert.equal(defaultConfig.rules["sonarjs/no-hardcoded-secrets"], "warn");',
      'assert.equal(Object.keys(defaultConfig.rules).filter((rule) => rule.startsWith("sonarjs/")).length, 13);',
      'assert.equal(getOxlintConfig({ ai: true }).rules["sonarjs/no-nested-switch"], "error");',
      'assert.deepEqual(getOxlintConfig({ ai: true }).rules["sonarjs/max-union-size"], ["error", { threshold: 5 }]);',
      "assert.equal(Object.keys(testingLibrary.rules).length, 15);",
      'const reactTestingLibrary = getOxlintConfig({ react: true }).overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "testing-library"));',
      "assert.equal(Object.keys(reactTestingLibrary.rules).length, 22);",
      'assert.deepEqual(reactTestingLibrary.rules["testing-library/no-dom-import"], ["error", "react"]);',
      'const composed = getComposedOxlintConfig({ scopes: ["react", "vitest"], overrides: [{ files: ["**/*.test.tsx"], plugins: ["jsx-a11y"] }] });',
      'assert.equal(composed.options.typeAware, true);',
      'assert(composed.plugins.includes("vitest"));',
      'const composedTestingLibrary = composed.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "testing-library"));',
      'assert.deepEqual(composedTestingLibrary.rules["testing-library/no-dom-import"], ["error", "react"]);',
      'assert.deepEqual(composed.overrides.at(-1).plugins, composed.plugins);',
      "const customized = getOxlintConfig({ ai: true });",
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
        include: ["consumer.ts", "valid.ts", "invalid.ts"],
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
    () =>
      run(
        consumerOxlint,
        ["--config", ".oxlintrc.json", "invalid.ts"],
        consumerRoot,
      ),
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
    resolve(consumerRoot, "DuplicatedBranches.ts"),
    [
      'export function status(mode: "read" | "write" | "idle"): string {',
      '  if (mode === "read") {',
      '    const result = "busy";',
      '    return result;',
      '  } else if (mode === "write") {',
      '    const result = "busy";',
      '    return result;',
      '  }',
      '  return "idle";',
      '}',
      '',
    ].join("\n"),
  );
  assert.throws(
    () =>
      run(
        consumerOxlint,
        ["--config", "oxlint.config.ts", "DuplicatedBranches.ts"],
        consumerRoot,
      ),
    (error: unknown) =>
      error instanceof Error &&
      /sonarjs(?:\/|\()no-duplicated-branches/u.test(
        String((error as Error & { stdout?: string }).stdout),
      ),
  );

  writeFileSync(
    resolve(consumerRoot, "TestingLibrary.test.tsx"),
    'import { screen } from "@testing-library/dom";\nscreen.debug();\n',
  );
  writeFileSync(
    resolve(consumerRoot, "TestingLibrary.spec.ts"),
    'import { screen } from "@testing-library/dom";\nscreen.debug();\n',
  );
  assert.throws(
    () =>
      run(
        consumerOxlint,
        ["--config", "oxlint.config.ts", "--deny-warnings", "TestingLibrary.test.tsx"],
        consumerRoot,
      ),
    (error: unknown) =>
      error instanceof Error &&
      /testing-library(?:\/|\()no-debugging-utils/u.test(
        String((error as Error & { stdout?: string }).stdout),
      ),
  );
  run(
    consumerOxlint,
    ["--config", "oxlint.config.ts", "--deny-warnings", "TestingLibrary.spec.ts"],
    consumerRoot,
  );

  writeFileSync(
    resolve(consumerRoot, "consumer.ts"),
    [
      'import { getComposedOxlintConfig, getOxlintConfig, setRuleSeverity, type ComposedConfigOptions, type ConfigLevel, type ConfigOptions, type RuleSeverity, type ScopedConfig } from "oxlint-config-setup";',
      'const level: ConfigLevel = "essential";',
      'const severity: RuleSeverity = "warn";',
      "const options = { level, react: true, ai: true } satisfies ConfigOptions;",
      'const scope: ScopedConfig = "vitest";',
      'const composedOptions = { scopes: [scope] } satisfies ComposedConfigOptions;',
      "const config = getOxlintConfig(options);",
      "void getComposedOxlintConfig(composedOptions);",
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

  writeFileSync(
    resolve(consumerRoot, "Focused.spec.ts"),
    'test.only("focused", () => {});\n',
  );
  writeFileSync(
    resolve(consumerRoot, "Focused.test.ts"),
    'test.only("focused", () => {});\n',
  );
  assert.throws(
    () =>
      run(
        consumerOxlint,
        ["--config", "oxlint.config.ts", "--deny-warnings", "Focused.spec.ts"],
        consumerRoot,
      ),
    (error: unknown) =>
      error instanceof Error &&
      /playwright(?:\/|\()no-focused-test/u.test(
        String((error as Error & { stdout?: string }).stdout),
      ),
  );
  assert.throws(
    () =>
      run(
        consumerOxlint,
        ["--config", "oxlint.config.ts", "--deny-warnings", "Focused.test.ts"],
        consumerRoot,
      ),
    (error: unknown) =>
      error instanceof Error &&
      /sonarjs(?:\/|\()no-exclusive-tests/u.test(
        String((error as Error & { stdout?: string }).stdout),
      ),
  );

  writeFileSync(
    resolve(consumerRoot, "MissingDefault.stories.tsx"),
    "export const Primary = {};\n",
  );
  writeFileSync(
    resolve(consumerRoot, "MissingDefault.tsx"),
    "export const Primary = {};\n",
  );
  assert.throws(
    () =>
      run(
        consumerOxlint,
        [
          "--config",
          "oxlint.config.ts",
          "--deny-warnings",
          "MissingDefault.stories.tsx",
        ],
        consumerRoot,
      ),
    (error: unknown) =>
      error instanceof Error &&
      /storybook(?:\/|\()default-exports/u.test(
        String((error as Error & { stdout?: string }).stdout),
      ),
  );
  run(
    consumerOxlint,
    ["--config", "oxlint.config.ts", "--deny-warnings", "MissingDefault.tsx"],
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
      'import { statSync } from "node:fs";',
      'import { getOxlintConfig } from "oxlint-config-setup";',
      'const config = getOxlintConfig();',
      'const testingLibrary = config.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "testing-library"));',
      'const playwright = config.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "playwright"));',
      'const storybook = config.overrides.find((override) => override.jsPlugins?.some((plugin) => plugin.name === "storybook"));',
      'assert.equal(config.jsPlugins.at(-1).name, "sonarjs");',
      'assert.equal(Object.keys(config.rules).filter((rule) => rule.startsWith("sonarjs/")).length, 13);',
      'assert.equal(testingLibrary.jsPlugins.at(-1).name, "testing-library");',
      'assert.equal(playwright.jsPlugins.at(-1).name, "playwright");',
      'assert.equal(storybook.jsPlugins.at(-1).name, "storybook");',
      'assert(statSync(playwright.jsPlugins.at(-1).specifier).isFile());',
      'assert(statSync(testingLibrary.jsPlugins.at(-1).specifier).isFile());',
      'assert(statSync(storybook.jsPlugins.at(-1).specifier).isFile());',
      'assert(statSync(config.jsPlugins.at(-1).specifier).isFile());',
      "assert.equal(Object.keys(testingLibrary.rules).length, 15);",
      'assert.equal(storybook.rules["storybook/default-exports"], "error");',
      "",
    ].join("\n"),
  );
  run("node", ["consumer.mjs"], pnpmConsumerRoot);
  copyFileSync(
    resolve(
      pnpmConsumerRoot,
      "node_modules/oxlint-config-setup/dist/standalone/ai.json",
    ),
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
  assert.equal(
    (aiConfig as { jsPlugins?: unknown }).jsPlugins,
    undefined,
  );
  assert.equal(
    (aiConfig as { rules?: Record<string, unknown> }).rules?.[
      "sonarjs/no-duplicated-branches"
    ],
    undefined,
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

assert.equal(run("git", ["diff", "--binary"]), trackedDiffBefore);
console.log(
  `Production package verified: ${allConfigOptions().length} configurable + ${NAMED_ARTIFACTS.length} named artifacts.`,
);

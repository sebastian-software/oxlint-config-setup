import type { DummyRuleMap, OxlintConfig, OxlintOverride } from "oxlint";

export const SCOPED_CONFIGS = [
  "react",
  "node",
  "vitest",
  "jest",
  "scripts",
  "config",
  "declarations",
] as const;

export type ScopedConfig = (typeof SCOPED_CONFIGS)[number];

export const CANONICAL_SCOPE_GLOBS = {
  react: ["**/*.{jsx,tsx}"],
  node: ["**/*.{cjs,cts,mjs,mts}"],
  vitest: [
    "**/*.{test,spec}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
    "**/{__tests__,__mocks__}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
  jest: [
    "**/*.{test,spec}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
    "**/{__tests__,__mocks__}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
  scripts: ["**/{bin,scripts}/**/*.{js,cjs,mjs,ts,cts,mts}"],
  config: [
    "**/*.{config,conf}.{js,cjs,mjs,ts,cts,mts}",
    "**/{eslint,oxlint,jest,vitest,vite,webpack,rollup,tsup,playwright}.config.{js,cjs,mjs,ts,cts,mts}",
  ],
  declarations: ["**/*.d.ts", "**/*.d.cts", "**/*.d.mts"],
} as const satisfies Record<ScopedConfig, readonly string[]>;

export const DEFERRED_SCOPE_GLOBS = {
  e2e: [
    "**/*.{e2e,playwright}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
    "**/{e2e,playwright}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
  stories: [
    "**/*.stories.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
    "**/{stories,storybook}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  ],
} as const;

export interface ScopedConfigSelection {
  files?: readonly string[];
  scope: ScopedConfig;
}

export type ScopedConfigInput = ScopedConfig | ScopedConfigSelection;

export interface ScopedConfigSources {
  jest: OxlintConfig;
  node: OxlintConfig;
  react: OxlintConfig;
  vitest: OxlintConfig;
}

interface NormalizedScopeSelection {
  files: readonly string[];
  scope: ScopedConfig;
}

const scopeOverrides = new WeakMap<OxlintOverride, ScopedConfig>();

function cloneRules(rules: DummyRuleMap | undefined): DummyRuleMap | undefined {
  return rules === undefined ? undefined : { ...rules };
}

function cloneConfig(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    categories:
      config.categories === undefined ? undefined : { ...config.categories },
    env: config.env === undefined ? undefined : { ...config.env },
    globals: config.globals === undefined ? undefined : { ...config.globals },
    plugins: config.plugins === undefined ? undefined : [...config.plugins],
    rules: cloneRules(config.rules),
    overrides: config.overrides?.map((override) => ({
      ...override,
      env: override.env === undefined ? undefined : { ...override.env },
      globals:
        override.globals === undefined ? undefined : { ...override.globals },
      plugins:
        override.plugins === undefined ? undefined : [...override.plugins],
      rules: cloneRules(override.rules),
    })),
  };
}

function uniquePlugins(
  ...pluginLists: ReadonlyArray<NonNullable<OxlintConfig["plugins"]> | undefined>
): NonNullable<OxlintConfig["plugins"]> {
  return [...new Set(pluginLists.flatMap((plugins) => plugins ?? []))];
}

function ruleDelta(
  base: OxlintConfig,
  contextual: OxlintConfig,
): DummyRuleMap {
  return Object.fromEntries(
    Object.entries(contextual.rules ?? {}).filter(
      ([rule, value]) =>
        JSON.stringify(base.rules?.[rule]) !== JSON.stringify(value),
    ),
  );
}

function assertScopedConfig(value: unknown): asserts value is ScopedConfig {
  if (!SCOPED_CONFIGS.includes(value as ScopedConfig)) {
    throw new RangeError(`Unsupported Oxlint config scope: ${String(value)}`);
  }
}

function normalizeScopes(
  scopes: readonly ScopedConfigInput[] | undefined,
): NormalizedScopeSelection[] {
  if (scopes === undefined) return [];
  if (!Array.isArray(scopes)) {
    throw new TypeError("Oxlint config scopes must be an array");
  }

  const normalized = scopes.map((selection) => {
    const value: Record<string, unknown> =
      typeof selection === "string" ? { scope: selection } : selection;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("Each Oxlint config scope must be a name or object");
    }
    assertScopedConfig(value.scope);
    const scope = value.scope;
    const files = value.files ?? CANONICAL_SCOPE_GLOBS[scope];
    if (
      !Array.isArray(files) ||
      files.length === 0 ||
      files.some((pattern) => typeof pattern !== "string" || pattern.length === 0)
    ) {
      throw new TypeError(
        `Oxlint config scope ${scope} requires non-empty file globs`,
      );
    }
    return { files: [...files], scope };
  });

  const duplicate = normalized.find(
    (selection, index) =>
      normalized.findIndex((other) => other.scope === selection.scope) !== index,
  );
  if (duplicate !== undefined) {
    throw new TypeError(`Oxlint config scope ${duplicate.scope} was selected twice`);
  }
  if (
    normalized.some((selection) => selection.scope === "vitest") &&
    normalized.some((selection) => selection.scope === "jest")
  ) {
    throw new TypeError(
      "Vitest and Jest scopes cannot be selected together because their runner rules overlap",
    );
  }
  return normalized.toSorted(
    (left, right) =>
      SCOPED_CONFIGS.indexOf(left.scope) - SCOPED_CONFIGS.indexOf(right.scope),
  );
}

function scopeRules(
  scope: ScopedConfig,
  base: OxlintConfig,
  sources: ScopedConfigSources,
): DummyRuleMap {
  switch (scope) {
    case "react":
      return ruleDelta(base, sources.react);
    case "node":
    case "scripts":
    case "config":
      return ruleDelta(base, sources.node);
    case "vitest":
      return {
        ...sources.vitest.rules,
        "eslint/no-warning-comments": "off",
      };
    case "jest":
      return {
        ...sources.jest.rules,
        "eslint/no-warning-comments": "off",
      };
    case "declarations":
      return {
        "typescript/ban-ts-comment": "off",
      };
  }
}

function scopeEnv(scope: ScopedConfig): OxlintOverride["env"] {
  switch (scope) {
    case "node":
    case "scripts":
    case "config":
      return { node: true };
    case "vitest":
      return { vitest: true };
    case "jest":
      return { jest: true };
    default:
      return undefined;
  }
}

function scopePlugins(
  scope: ScopedConfig,
  sources: ScopedConfigSources,
): NonNullable<OxlintConfig["plugins"]> {
  switch (scope) {
    case "react":
      return uniquePlugins(sources.react.plugins);
    case "node":
    case "scripts":
    case "config":
      return uniquePlugins(sources.node.plugins);
    case "vitest":
      return uniquePlugins(sources.vitest.plugins);
    case "jest":
      return uniquePlugins(sources.jest.plugins);
    case "declarations":
      return [];
  }
}

function taggedOverride(
  scope: ScopedConfig,
  files: readonly string[],
  rules: DummyRuleMap,
): OxlintOverride {
  const override: OxlintOverride = {
    files: [...files],
    ...(scopeEnv(scope) === undefined ? {} : { env: scopeEnv(scope) }),
    rules,
  };
  scopeOverrides.set(override, scope);
  return override;
}

function normalizeConsumerOverrides(
  overrides: readonly OxlintOverride[] | undefined,
  requiredPlugins: NonNullable<OxlintConfig["plugins"]>,
): OxlintOverride[] {
  if (overrides === undefined) return [];
  if (!Array.isArray(overrides)) {
    throw new TypeError("Oxlint consumer overrides must be an array");
  }
  return overrides.map((override, index) => {
    if (override === null || typeof override !== "object") {
      throw new TypeError(`Oxlint consumer override ${index} must be an object`);
    }
    if (!Array.isArray(override.files) || override.files.length === 0) {
      throw new TypeError(
        `Oxlint consumer override ${index} requires non-empty files`,
      );
    }
    if (
      override.plugins !== undefined &&
      (!Array.isArray(override.plugins) ||
        override.plugins.some((plugin: unknown) => typeof plugin !== "string"))
    ) {
      throw new TypeError(
        `Oxlint consumer override ${index} plugins must be an array of strings`,
      );
    }
    return {
      ...override,
      env: override.env === undefined ? undefined : { ...override.env },
      globals:
        override.globals === undefined ? undefined : { ...override.globals },
      plugins: uniquePlugins(requiredPlugins, override.plugins),
      rules: cloneRules(override.rules),
    };
  });
}

/** Compose stable file-scoped policy fragments onto a prebuilt root config. */
export function composeScopedOxlintConfig(
  root: OxlintConfig,
  sources: ScopedConfigSources,
  scopes?: readonly ScopedConfigInput[],
  consumerOverrides?: readonly OxlintOverride[],
): OxlintConfig {
  const config = cloneConfig(root);
  const selections = normalizeScopes(scopes);
  const requiredPlugins = uniquePlugins(
    config.plugins,
    ...selections.map((selection) => scopePlugins(selection.scope, sources)),
  );
  config.plugins = requiredPlugins;
  const packageOverrides = selections.map((selection) =>
    taggedOverride(
      selection.scope,
      selection.files,
      scopeRules(selection.scope, root, sources),
    ),
  );
  config.overrides = [
    ...(config.overrides ?? []),
    ...packageOverrides,
    ...normalizeConsumerOverrides(consumerOverrides, requiredPlugins),
  ];
  return config;
}

export function assertKnownScopedConfig(scope: unknown): asserts scope is ScopedConfig {
  assertScopedConfig(scope);
}

export function scopedConfigForOverride(
  override: OxlintOverride,
): ScopedConfig | undefined {
  return scopeOverrides.get(override);
}

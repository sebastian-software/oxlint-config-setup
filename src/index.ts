import { readFileSync } from "node:fs";

import type { OxlintConfig } from "oxlint";

import type { NamedArtifact } from "./artifacts.js";
import {
  composeScopedOxlintConfig,
  type ScopedConfigInput,
} from "./composition.js";
import {
  configFileName,
  normalizeConfigOptions,
  type ConfigOptions,
} from "./options.js";
import { composeProfiles } from "./profiles.js";

export type { ConfigLevel, ConfigOptions } from "./options.js";
export {
  type ScopedConfig,
  type ScopedConfigInput,
  type ScopedConfigSelection,
} from "./composition.js";
export {
  addRule,
  configureRule,
  disableAllRulesBut,
  disableRule,
  setRuleSeverity,
  type RuleTarget,
  type RuleSeverity,
} from "./rule-helpers.js";
import type { OxlintOverride } from "oxlint";

export interface ComposedConfigOptions {
  ai?: boolean;
  level?: ConfigOptions["level"];
  overrides?: readonly OxlintOverride[];
  scopes?: readonly ScopedConfigInput[];
}

function loadConfigArtifact(
  fileName: string,
  expectedTypeAware: boolean,
): OxlintConfig {
  const artifactUrl = new URL(`./configs/${fileName}`, import.meta.url);

  let source: string;
  try {
    source = readFileSync(artifactUrl, "utf8");
  } catch (error) {
    throw new Error(
      `Unable to load prebuilt Oxlint config artifact ${fileName}`,
      { cause: error },
    );
  }

  let config: unknown;
  try {
    config = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `Prebuilt Oxlint config artifact ${fileName} is not valid JSON`,
      { cause: error },
    );
  }

  if (
    config === null ||
    typeof config !== "object" ||
    (config as { options?: { typeAware?: unknown } }).options?.typeAware !==
      expectedTypeAware
  ) {
    throw new Error(
      `Prebuilt Oxlint config artifact ${fileName} violates its type-aware contract`,
    );
  }

  return config as OxlintConfig;
}

export function getOxlintConfig(options: ConfigOptions = {}): OxlintConfig {
  const normalized = normalizeConfigOptions(options);
  return loadConfigArtifact(configFileName(normalized), true);
}

/**
 * Select a prebuilt type-aware root config, then append file-scoped fragments.
 * Root artifacts and JSON exports remain the simple configuration path.
 */
export function getComposedOxlintConfig(
  options: ComposedConfigOptions = {},
): OxlintConfig {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Composed Oxlint config options must be an object");
  }
  for (const key of Object.keys(options)) {
    if (!(["level", "ai", "scopes", "overrides"] as const).includes(key as never)) {
      throw new TypeError(`Unsupported composed Oxlint config option: ${key}`);
    }
  }
  if (options.ai !== undefined && typeof options.ai !== "boolean") {
    throw new TypeError("Composed Oxlint config option ai must be a boolean");
  }

  const rootOptions = normalizeConfigOptions({
    level: options.level,
    ai: options.ai,
  });
  const root = getOxlintConfig(rootOptions);
  return composeScopedOxlintConfig(
    root,
    {
      react: getOxlintConfig({ ...rootOptions, react: true }),
      node: getOxlintConfig({ ...rootOptions, node: true }),
      vitest: composeProfiles(["vitest"]),
      jest: composeProfiles(["jest"]),
    },
    options.scopes,
    options.overrides,
  );
}

function getNamedConfig(name: NamedArtifact, typeAware = true): OxlintConfig {
  return loadConfigArtifact(`${name}.json`, typeAware);
}

export function getSyntaxOnlyOxlintConfig(): OxlintConfig {
  return getNamedConfig("typescript-syntax", false);
}

export function getVitestOxlintConfig(): OxlintConfig {
  return getNamedConfig("vitest");
}

export function getJestOxlintConfig(): OxlintConfig {
  return getNamedConfig("jest");
}

export function getExperimentalReactCompilerOxlintConfig(): OxlintConfig {
  return getNamedConfig("react-compiler");
}

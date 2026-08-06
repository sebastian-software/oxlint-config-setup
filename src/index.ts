import { readFileSync } from "node:fs";

import type { OxlintConfig } from "oxlint";

import type { NamedArtifact } from "./artifacts.js";
import {
  configFileName,
  normalizeConfigOptions,
  type ConfigOptions,
} from "./options.js";

export type { ConfigLevel, ConfigOptions } from "./options.js";
export {
  addRule,
  configureRule,
  disableAllRulesBut,
  disableRule,
  setRuleSeverity,
  type RuleSeverity,
} from "./rule-helpers.js";

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

import { readFileSync } from "node:fs";

import type { OxlintConfig } from "oxlint";

import {
  configFileName,
  normalizeConfigOptions,
  type ConfigOptions,
} from "./options.js";

export type { ConfigOptions } from "./options.js";

export function getOxlintConfig(options: ConfigOptions = {}): OxlintConfig {
  const normalized = normalizeConfigOptions(options);
  const fileName = configFileName(normalized);
  const artifactUrl = new URL(`../generated/${fileName}`, import.meta.url);

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
    (config as { options?: { typeAware?: unknown } }).options?.typeAware !== true
  ) {
    throw new Error(
      `Prebuilt Oxlint config artifact ${fileName} violates the mandatory type-aware contract`,
    );
  }

  return config as OxlintConfig;
}

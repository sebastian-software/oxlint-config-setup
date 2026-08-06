import { createHash } from "node:crypto";

import { CONFIG_LEVELS, type ConfigLevel } from "./levels.js";

export type { ConfigLevel } from "./levels.js";

export interface ConfigOptions {
  level?: ConfigLevel;
  react?: boolean;
  node?: boolean;
  ai?: boolean;
}

export interface NormalizedConfigOptions {
  level: ConfigLevel;
  react: boolean;
  node: boolean;
  ai: boolean;
}

const BOOLEAN_OPTION_KEYS = ["react", "node", "ai"] as const;
const OPTION_KEYS = ["level", ...BOOLEAN_OPTION_KEYS] as const;
const STRICT_HASH_NAMESPACE = "oxlint-config-setup:config:v4:strict";
const ESSENTIAL_HASH_NAMESPACE = "oxlint-config-setup:config:v4:essential";
const RECOMMENDED_HASH_NAMESPACE = "oxlint-config-setup:config:v4:recommended";

export function normalizeConfigOptions(
  options: ConfigOptions = {},
): NormalizedConfigOptions {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Oxlint config options must be an object");
  }

  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.includes(key as (typeof OPTION_KEYS)[number])) {
      throw new TypeError(`Unsupported Oxlint config option: ${key}`);
    }
  }

  for (const key of BOOLEAN_OPTION_KEYS) {
    const value = options[key];
    if (value !== undefined && typeof value !== "boolean") {
      throw new TypeError(`Oxlint config option ${key} must be a boolean`);
    }
  }

  if (
    options.level !== undefined &&
    !CONFIG_LEVELS.includes(options.level as ConfigLevel)
  ) {
    throw new TypeError(
      `Oxlint config option level must be one of: ${CONFIG_LEVELS.join(", ")}`,
    );
  }

  return {
    level: options.level ?? "recommended",
    react: options.react ?? false,
    node: options.node ?? false,
    ai: options.ai ?? false,
  };
}

export function configOptionMask(options: NormalizedConfigOptions): number {
  return (
    Number(options.react) |
    (Number(options.node) << 1) |
    (Number(options.ai) << 2)
  );
}

export function configFileName(options: ConfigOptions = {}): string {
  const normalized = normalizeConfigOptions(options);
  const mask = configOptionMask(normalized);
  const namespace = {
    essential: ESSENTIAL_HASH_NAMESPACE,
    recommended: RECOMMENDED_HASH_NAMESPACE,
    strict: STRICT_HASH_NAMESPACE,
  }[normalized.level];
  const digest = createHash("sha256")
    .update(`${namespace}:${mask.toString(2).padStart(3, "0")}`)
    .digest("hex")
    .slice(0, 12);
  return `config-${digest}.json`;
}

export function allConfigOptions(): NormalizedConfigOptions[] {
  return CONFIG_LEVELS.flatMap((level) =>
    Array.from({ length: 8 }, (_, mask) => ({
      level,
      react: Boolean(mask & 1),
      node: Boolean(mask & 2),
      ai: Boolean(mask & 4),
    })),
  );
}

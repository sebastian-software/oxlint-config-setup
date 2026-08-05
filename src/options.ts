import { createHash } from "node:crypto";

export interface ConfigOptions {
  react?: boolean;
  node?: boolean;
  ai?: boolean;
}

export interface NormalizedConfigOptions {
  react: boolean;
  node: boolean;
  ai: boolean;
}

const OPTION_KEYS = ["react", "node", "ai"] as const;
const HASH_NAMESPACE = "oxlint-config-setup:config:v1";

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

    const value = options[key as keyof ConfigOptions];
    if (value !== undefined && typeof value !== "boolean") {
      throw new TypeError(`Oxlint config option ${key} must be a boolean`);
    }
  }

  return {
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
  const digest = createHash("sha256")
    .update(`${HASH_NAMESPACE}:${mask.toString(2).padStart(3, "0")}`)
    .digest("hex")
    .slice(0, 12);
  return `config-${digest}.json`;
}

export function allConfigOptions(): NormalizedConfigOptions[] {
  return Array.from({ length: 8 }, (_, mask) => ({
    react: Boolean(mask & 1),
    node: Boolean(mask & 2),
    ai: Boolean(mask & 4),
  }));
}

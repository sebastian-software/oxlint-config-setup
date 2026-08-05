import { defineConfig, type OxlintConfig } from "oxlint";

import type { NormalizedConfigOptions } from "./options.js";

// This rule only makes the AI permutation observable in the packaging spike.
// The production AI rule selection belongs to the rule ledger.
export const AI_SPIKE_RULE = "no-warning-comments";

// This representative rule proves that mandatory type-aware mode is functional.
// The production type-aware rule selection belongs to issue #9.
export const TYPE_AWARE_SPIKE_RULE = "typescript/no-floating-promises";

export function createConfig(
  options: NormalizedConfigOptions,
): OxlintConfig {
  const plugins: NonNullable<OxlintConfig["plugins"]> = ["typescript"];
  if (options.react) plugins.push("react");
  if (options.node) plugins.push("node");

  return defineConfig({
    categories: {
      correctness: "off",
    },
    options: {
      typeAware: true,
    },
    plugins,
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      [TYPE_AWARE_SPIKE_RULE]: "error",
      ...(options.ai ? { [AI_SPIKE_RULE]: "warn" as const } : {}),
    },
  });
}

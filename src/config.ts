import { defineConfig, type OxlintConfig } from "oxlint";

import type { NormalizedConfigOptions } from "./options.js";

// This keeps the reviewed AI option behavior observable until the rule ledger
// replaces this initial package slice with the curated production selection.
const INITIAL_AI_RULE = "no-warning-comments";

export function createConfig(options: NormalizedConfigOptions): OxlintConfig {
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
    rules: options.ai ? { [INITIAL_AI_RULE]: "warn" as const } : {},
  });
}

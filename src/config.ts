import { defineConfig, type OxlintConfig } from "oxlint";

import type { NormalizedConfigOptions } from "./options.js";
import { composeProfiles } from "./profiles.js";

export function createConfig(options: NormalizedConfigOptions): OxlintConfig {
  return defineConfig(
    composeProfiles([
      "core",
      "imports",
      "typescript-syntax",
      "typescript-type-aware",
      ...(options.react ? (["react", "jsx-a11y"] as const) : []),
      ...(options.node ? (["node"] as const) : []),
      ...(options.ai ? (["ai"] as const) : []),
    ]),
  );
}

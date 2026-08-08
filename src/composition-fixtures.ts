import type { OxlintConfig, OxlintOverride } from "oxlint";

import { createConfig } from "./config.js";
import {
  composeScopedOxlintConfig,
  type ScopedConfigInput,
} from "./composition.js";
import { materializeConfig } from "./materialize.js";
import type { ConfigLevel, NormalizedConfigOptions } from "./options.js";
import { composeProfiles } from "./profiles.js";

const TYPE_AWARE_SOURCE = "fixtures/rules/typescript-type-aware/valid.ts";
const REACT_SOURCE = "fixtures/rules/react/valid.tsx";
const NODE_SOURCE = "fixtures/rules/node/valid.mjs";

function rootOptions(level: ConfigLevel, ai: boolean): NormalizedConfigOptions {
  return { ai, level, node: false, react: false };
}

function materialized(
  options: NormalizedConfigOptions,
  source: string,
): OxlintConfig {
  return materializeConfig(createConfig(options), source);
}

/** Build a complete config for repository-owned scoped diagnostic fixtures. */
export function createCompositionFixtureConfig(
  scopes: readonly ScopedConfigInput[],
  consumerOverrides?: readonly OxlintOverride[],
): OxlintConfig {
  const baseOptions = rootOptions("recommended", true);
  const root = materialized(baseOptions, TYPE_AWARE_SOURCE);
  return composeScopedOxlintConfig(
    root,
    {
      react: materialized({ ...baseOptions, react: true }, REACT_SOURCE),
      node: materialized({ ...baseOptions, node: true }, NODE_SOURCE),
      vitest: composeProfiles(["vitest"]),
      jest: composeProfiles(["jest"]),
    },
    scopes,
    consumerOverrides,
  );
}

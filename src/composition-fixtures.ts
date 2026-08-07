import type { OxlintConfig } from "oxlint";

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

export interface CompositionSnapshotCase {
  file: string;
  name: string;
  scopes: readonly ScopedConfigInput[];
}

export const COMPOSITION_SNAPSHOT_CASES = [
  {
    name: "react-vitest-test",
    file: "fixtures/composition/packages/web/src/App.test.tsx",
    scopes: ["react", "vitest"],
  },
  {
    name: "node-script",
    file: "fixtures/composition/packages/api/scripts/rebuild.mts",
    scopes: [
      {
        scope: "node",
        files: ["**/packages/api/**/*.{js,cjs,mjs,ts,cts,mts}"],
      },
      "scripts",
    ],
  },
  {
    name: "node-config",
    file: "fixtures/composition/packages/api/vitest.config.ts",
    scopes: ["config"],
  },
  {
    name: "declaration",
    file: "fixtures/composition/packages/shared/src/index.d.ts",
    scopes: ["declarations"],
  },
] as const satisfies readonly CompositionSnapshotCase[];

function rootOptions(level: ConfigLevel, ai: boolean): NormalizedConfigOptions {
  return { ai, level, node: false, react: false };
}

function materialized(
  options: NormalizedConfigOptions,
  source: string,
): OxlintConfig {
  return materializeConfig(createConfig(options), source);
}

export function createCompositionSnapshotConfig(
  testCase: CompositionSnapshotCase,
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
    testCase.scopes,
  );
}

import { fileURLToPath } from "node:url";

import type { DummyRuleMap, OxlintConfig } from "oxlint";

export const SONARJS_RULES = {
  "sonarjs/no-identical-functions": "error",
  "sonarjs/no-collapsible-if": "error",
  "sonarjs/no-redundant-boolean": "error",
  "sonarjs/no-unused-collection": "error",
  "sonarjs/prefer-single-boolean-return": "error",
  "sonarjs/no-identical-expressions": "error",
  "sonarjs/no-inverted-boolean-check": "error",
  "sonarjs/no-identical-conditions": "error",
  "sonarjs/no-duplicated-branches": "error",
  "sonarjs/no-redundant-jump": "error",
  "sonarjs/no-exclusive-tests": "error",
  "sonarjs/no-duplicate-in-composite": "error",
  "sonarjs/no-hardcoded-secrets": "warn",
} as const satisfies DummyRuleMap;

export const SONARJS_AI_RULES = {
  "sonarjs/no-nested-switch": "error",
  "sonarjs/no-nested-template-literals": "error",
  "sonarjs/max-union-size": ["error", { threshold: 5 }],
  "sonarjs/prefer-type-guard": "error",
  "sonarjs/public-static-readonly": "error",
  "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
} as const satisfies DummyRuleMap;

/** Add the package-owned, syntax-only SonarJS policy to source files. */
export function withSonarJS(config: OxlintConfig, ai = false): OxlintConfig {
  return {
    ...config,
    jsPlugins: [
      ...(config.jsPlugins ?? []),
      {
        name: "sonarjs",
        specifier: fileURLToPath(import.meta.resolve("eslint-plugin-sonarjs")),
      },
    ],
    rules: {
      ...config.rules,
      ...SONARJS_RULES,
      ...(ai ? structuredClone(SONARJS_AI_RULES) : {}),
    },
  };
}

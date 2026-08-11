import { fileURLToPath } from "node:url";

import type { DummyRuleMap, OxlintConfig, OxlintOverride } from "oxlint";

export const TEST_FILE_GLOBS = [
  "**/*.{test,spec}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  "**/{__tests__,__mocks__}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
] as const;

const TESTING_LIBRARY_RULES = {
  "testing-library/await-async-events": "error",
  "testing-library/await-async-queries": "error",
  "testing-library/await-async-utils": "error",
  "testing-library/no-await-sync-events": "error",
  "testing-library/no-await-sync-queries": "error",
  "testing-library/no-container": "error",
  "testing-library/no-debugging-utils": "warn",
  "testing-library/no-node-access": "error",
  "testing-library/no-render-in-lifecycle": "error",
  "testing-library/no-unnecessary-act": "error",
  "testing-library/no-wait-for-multiple-assertions": "error",
  "testing-library/no-wait-for-side-effects": "error",
  "testing-library/prefer-find-by": "error",
  "testing-library/prefer-presence-queries": "error",
  "testing-library/prefer-query-by-disappearance": "error",
  "testing-library/prefer-screen-queries": "error",
  "testing-library/render-result-naming-convention": "error",
} as const satisfies DummyRuleMap;

function testingLibraryOverride(): OxlintOverride {
  return {
    files: [...TEST_FILE_GLOBS],
    jsPlugins: [
      {
        name: "testing-library",
        specifier: fileURLToPath(
          import.meta.resolve("eslint-plugin-testing-library"),
        ),
      },
    ],
    rules: { ...TESTING_LIBRARY_RULES },
  };
}

/** Add the package-owned Testing Library policy to canonical test files. */
export function withTestingLibrary(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    overrides: [...(config.overrides ?? []), testingLibraryOverride()],
  };
}

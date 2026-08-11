import { fileURLToPath } from "node:url";

import testingLibraryPlugin from "eslint-plugin-testing-library";
import type { DummyRuleMap, OxlintConfig, OxlintOverride } from "oxlint";

export const TEST_FILE_GLOBS = [
  "**/*.{test,spec}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  "**/{__tests__,__mocks__}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
] as const;

function testingLibraryRules(react: boolean): DummyRuleMap {
  const preset = react ? "flat/react" : "flat/dom";
  const rules = testingLibraryPlugin.configs[preset].rules;
  if (rules === undefined) {
    throw new Error(`Testing Library preset ${preset} does not define rules`);
  }
  return { ...rules };
}

function testingLibraryOverride(react: boolean): OxlintOverride {
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
    rules: testingLibraryRules(react),
  };
}

/** Add the package-owned Testing Library policy to canonical test files. */
export function withTestingLibrary(
  config: OxlintConfig,
  react: boolean,
): OxlintConfig {
  return {
    ...config,
    overrides: [...(config.overrides ?? []), testingLibraryOverride(react)],
  };
}

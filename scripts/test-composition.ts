import assert from "node:assert/strict";

import playwrightPlugin from "eslint-plugin-playwright";
import type { OxlintConfig, OxlintOverride } from "oxlint";

import {
  CANONICAL_SCOPE_GLOBS,
  DEFERRED_SCOPE_GLOBS,
  SCOPED_CONFIGS,
  composeScopedOxlintConfig,
} from "../src/composition.js";
import { composeProfiles } from "../src/profiles.js";
import {
  addRule,
  disableRule,
  setRuleSeverity,
} from "../src/rule-helpers.js";
import {
  TEST_FILE_GLOBS,
  withTestingLibrary,
} from "../src/testing-library.js";
import {
  PLAYWRIGHT_FILE_GLOBS,
  withPlaywright,
} from "../src/playwright.js";

const root: OxlintConfig = {
  env: { browser: true },
  globals: { window: "readonly" },
  options: { typeAware: true },
  plugins: ["typescript", "import"],
  rules: {
    "eslint/no-warning-comments": "warn",
    "typescript/ban-ts-comment": "error",
    "typescript/no-floating-promises": "error",
  },
};
const sources = {
  react: {
    plugins: ["typescript", "import", "react", "jsx-a11y"],
    rules: { "react/jsx-key": "error" },
  },
  node: {
    plugins: ["typescript", "import", "node"],
    rules: { "node/no-exports-assign": "error" },
  },
  vitest: composeProfiles(["vitest"]),
  jest: composeProfiles(["jest"]),
} satisfies Record<string, OxlintConfig>;
const consumerOverride: OxlintOverride = {
  files: ["**/*.test.tsx"],
  env: { browser: true },
  globals: { customTestGlobal: "readonly" },
  plugins: ["jest"],
  rules: { "react/jsx-key": "off" },
};

const config = composeScopedOxlintConfig(
  root,
  sources,
  ["react", "vitest", "scripts", "declarations"],
  [consumerOverride],
);

assert.equal(config.options?.typeAware, true, "type-aware stays at the root");
assert.deepEqual(config.plugins, [
  "typescript",
  "import",
  "react",
  "jsx-a11y",
  "vitest",
  "node",
]);
assert.deepEqual(
  config.overrides?.map((override) => override.files),
  [
    CANONICAL_SCOPE_GLOBS.react,
    CANONICAL_SCOPE_GLOBS.vitest,
    CANONICAL_SCOPE_GLOBS.scripts,
    CANONICAL_SCOPE_GLOBS.declarations,
    consumerOverride.files,
  ],
);
assert.deepEqual(config.overrides?.[1]?.env, { vitest: true });
assert.equal(
  config.overrides?.[1]?.rules?.["eslint/no-warning-comments"],
  "off",
  "the test-only relaxation stays in the Vitest scope",
);
assert.equal(
  config.overrides?.[2]?.rules?.["node/no-exports-assign"],
  "error",
  "script files receive Node context rules without making Node global",
);
assert.equal(
  config.overrides?.[3]?.rules?.["typescript/ban-ts-comment"],
  "off",
  "declaration files receive their narrow relaxation",
);
assert.deepEqual(config.overrides?.[4]?.plugins, [...config.plugins, "jest"]);
assert.equal(config.plugins?.includes("jest"), false);
assert.deepEqual(config.overrides?.[4]?.env, consumerOverride.env);
assert.deepEqual(config.overrides?.[4]?.globals, consumerOverride.globals);
assert.equal(config.overrides?.[4]?.rules?.["react/jsx-key"], "off");

setRuleSeverity(config, "vitest/no-focused-tests", "warn", { scope: "vitest" });
assert.equal(config.overrides?.[1]?.rules?.["vitest/no-focused-tests"], "warn");
assert.equal(config.rules?.["vitest/no-focused-tests"], undefined);
addRule(config, "vitest/require-top-level-describe", "error", undefined, {
  scope: "vitest",
});
assert.equal(
  config.overrides?.[1]?.rules?.["vitest/require-top-level-describe"],
  "error",
);
disableRule(config, "node/no-exports-assign", { scope: "scripts" });
assert.equal(config.overrides?.[2]?.rules?.["node/no-exports-assign"], "off");
assert.throws(
  () => disableRule(config, "eslint/no-debugger", { scope: "unknown" as never }),
  /Unsupported Oxlint config scope: unknown/u,
);
assert.throws(
  () => disableRule(config, "eslint/no-debugger", { scope: "jest" }),
  /does not contain scope: jest/u,
);
assert.throws(
  () => composeScopedOxlintConfig(root, sources, ["unknown" as never]),
  /Unsupported Oxlint config scope: unknown/u,
);
assert.throws(
  () => composeScopedOxlintConfig(root, sources, ["vitest", "vitest"]),
  /selected twice/u,
);
assert.throws(
  () => composeScopedOxlintConfig(root, sources, ["vitest", "jest"]),
  /cannot be selected together/u,
);
assert.throws(
  () =>
    composeScopedOxlintConfig(root, sources, undefined, [
      { files: ["**/*.ts"], plugins: "vitest" } as never,
    ]),
  /plugins must be an array of strings/u,
);
assert.deepEqual(
  SCOPED_CONFIGS,
  ["react", "node", "vitest", "jest", "scripts", "config", "declarations"],
);
assert.deepEqual(TEST_FILE_GLOBS, [
  "**/*.test.{ts,tsx}",
  "**/__tests__/**/*.{ts,tsx}",
]);
assert.deepEqual(PLAYWRIGHT_FILE_GLOBS, ["**/*.spec.ts"]);
assert.deepEqual(DEFERRED_SCOPE_GLOBS.stories, ["**/*.stories.{ts,tsx}"]);
assert.doesNotMatch(
  TEST_FILE_GLOBS.join("\n"),
  /\.spec/u,
  "unit-test patterns exclude Playwright spec files",
);
assert.doesNotMatch(
  PLAYWRIGHT_FILE_GLOBS.join("\n"),
  /\.test/u,
  "Playwright patterns exclude unit-test files",
);
assert.doesNotMatch(
  DEFERRED_SCOPE_GLOBS.stories.join("\n"),
  /\.(?:test|spec)/u,
  "Storybook's reservation is disjoint from shipped policies",
);

const automatic = withTestingLibrary(root, false);
const domTestingLibraryOverride = automatic.overrides?.at(-1);
const secondDomTestingLibraryOverride = withTestingLibrary(
  root,
  false,
).overrides?.at(-1);
assert.deepEqual(domTestingLibraryOverride?.files, TEST_FILE_GLOBS);
assert.deepEqual(
  domTestingLibraryOverride?.jsPlugins?.map((plugin) =>
    typeof plugin === "string" ? plugin : plugin.name,
  ),
  ["testing-library"],
);
assert.equal(Object.keys(domTestingLibraryOverride?.rules ?? {}).length, 15);
assert.deepEqual(
  domTestingLibraryOverride?.rules?.["testing-library/await-async-events"],
  ["error", { eventModule: "userEvent" }],
);
const firstAsyncEvents =
  domTestingLibraryOverride?.rules?.["testing-library/await-async-events"];
const secondAsyncEvents =
  secondDomTestingLibraryOverride?.rules?.[
    "testing-library/await-async-events"
  ];
assert(Array.isArray(firstAsyncEvents));
assert(Array.isArray(secondAsyncEvents));
assert.notEqual(firstAsyncEvents, secondAsyncEvents);
assert.notEqual(firstAsyncEvents[1], secondAsyncEvents[1]);
assert.equal(
  domTestingLibraryOverride?.rules?.["testing-library/no-dom-import"],
  undefined,
);

const reactTestingLibraryOverride = withTestingLibrary(root, true).overrides?.at(
  -1,
);
assert.equal(Object.keys(reactTestingLibraryOverride?.rules ?? {}).length, 22);
assert.deepEqual(
  reactTestingLibraryOverride?.rules?.["testing-library/no-dom-import"],
  ["error", "react"],
);
assert.equal(
  reactTestingLibraryOverride?.rules?.[
    "testing-library/no-debugging-utils"
  ],
  "warn",
);

const composedAutomatic = composeScopedOxlintConfig(
  automatic,
  sources,
  undefined,
  [
    {
      files: ["**/*.test.ts"],
      rules: { "testing-library/no-node-access": "off" },
    },
  ],
);
assert.equal(
  composedAutomatic.overrides?.at(-1)?.rules?.[
    "testing-library/no-node-access"
  ],
  "off",
);
assert.equal(
  composedAutomatic.overrides?.filter((override) =>
    override.jsPlugins?.some(
      (plugin) => typeof plugin !== "string" && plugin.name === "testing-library",
    ),
  ).length,
  1,
);

const automaticPlaywright = withPlaywright(root);
const playwrightOverride = automaticPlaywright.overrides?.at(-1);
const secondPlaywrightOverride = withPlaywright(root).overrides?.at(-1);
assert.deepEqual(playwrightOverride?.files, PLAYWRIGHT_FILE_GLOBS);
assert.deepEqual(
  playwrightOverride?.jsPlugins?.map((plugin) =>
    typeof plugin === "string" ? plugin : plugin.name,
  ),
  ["playwright"],
);
assert.equal(Object.keys(playwrightOverride?.rules ?? {}).length, 37);
assert.deepEqual(
  playwrightOverride?.rules,
  playwrightPlugin.configs["flat/recommended"].rules,
);
assert.equal(playwrightOverride?.rules?.["playwright/no-focused-test"], "error");
assert.equal(playwrightOverride?.globals?.AbortController, "readonly");
assert.notEqual(playwrightOverride?.rules, secondPlaywrightOverride?.rules);
assert.notEqual(playwrightOverride?.globals, secondPlaywrightOverride?.globals);

const composedPlaywright = composeScopedOxlintConfig(
  withTestingLibrary(withPlaywright(root), false),
  sources,
  undefined,
  [
    {
      files: ["**/*.spec.ts"],
      rules: { "playwright/no-focused-test": "off" },
    },
  ],
);
assert.equal(
  composedPlaywright.overrides?.at(-1)?.rules?.["playwright/no-focused-test"],
  "off",
);

console.log("Scoped composition, merge semantics, and helper targets verified.");

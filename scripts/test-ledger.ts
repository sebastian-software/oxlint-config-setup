import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ruleLedger } from "../src/ledger.js";
import {
  composeProfiles,
  orderedProfiles,
  selectRules,
} from "../src/profiles.js";
import { type RuleLedgerEntry, validateRuleLedger } from "../src/schema.js";
import { assertGeneratedContent } from "./generation.js";

const repositoryRoot = resolve(import.meta.dirname, "..");

function mutatedEntry(
  overrides: Partial<Record<keyof RuleLedgerEntry, unknown>>,
): Record<string, unknown> {
  return { ...ruleLedger[0], ...overrides };
}

assert.throws(
  () => validateRuleLedger([mutatedEntry({ profile: "unknown" })]),
  /unknown profile/u,
);
assert.throws(
  () => validateRuleLedger([mutatedEntry({ severity: "fatal" })]),
  /invalid severity/u,
);
assert.throws(
  () =>
    validateRuleLedger([
      mutatedEntry({
        activation: { kind: "level", minimumLevel: "relaxed" },
      }),
    ]),
  /invalid minimum level/u,
);
assert.throws(
  () =>
    validateRuleLedger([
      mutatedEntry({ activation: { kind: "ai", minimumLevel: "essential" } }),
    ]),
  /AI activation cannot define level or override fields/u,
);
assert.throws(
  () => validateRuleLedger([mutatedEntry({ activation: { kind: "named" } })]),
  /named activation outside a named profile/u,
);
assert.throws(
  () =>
    validateRuleLedger([
      mutatedEntry({
        activation: {
          kind: "level",
          minimumLevel: "essential",
          aiOverride: {
            severity: "warning",
            rationale: "This intentionally attempts to weaken an error.",
          },
        },
      }),
    ]),
  /AI override cannot weaken severity/u,
);
assert.throws(
  () => validateRuleLedger([mutatedEntry({ rationale: "" })]),
  /requires rationale/u,
);
assert.throws(
  () => validateRuleLedger([mutatedEntry({ fixtures: [] })]),
  /requires fixtures/u,
  "adding a ledger rule without its behavioral fixture must fail",
);
assert.doesNotThrow(() => assertGeneratedContent("example.md", "same", "same"));
assert.throws(
  () => assertGeneratedContent("example.md", "stale", "generated"),
  /Generated file example\.md is stale/u,
  "the drift gate must fail when generated content is stale",
);
assert.throws(
  () => validateRuleLedger([ruleLedger[0], ruleLedger[0]]),
  /Duplicate rule identifier/u,
);
assert.throws(
  () =>
    validateRuleLedger([
      ruleLedger[0],
      mutatedEntry({ id: "eslint/example-conflicting-owner" }),
    ]),
  /Conflicting ownership/u,
);
assert.throws(
  () =>
    validateRuleLedger([
      mutatedEntry({
        executionPath: "native-experimental",
        stability: "stable",
      }),
    ]),
  /must have experimental stability/u,
);
assert.throws(
  () =>
    validateRuleLedger([
      mutatedEntry({
        executionPath: "native-experimental",
        stability: "experimental",
        severity: "error",
      }),
    ]),
  /cannot enter as an error/u,
);
const rulesOfHooks = ruleLedger.find(
  (entry) => entry.id === "react/rules-of-hooks",
);
assert(rulesOfHooks);
assert.throws(
  () =>
    validateRuleLedger([
      rulesOfHooks,
      {
        ...rulesOfHooks,
        id: "react-hooks/rules-of-hooks",
        profile: "ai",
        executionPath: "javascript-plugin",
        defectClass: "JavaScript-plugin duplicate of native hook ownership",
        activation: { kind: "ai" },
      },
    ]),
  /Duplicate ownership/u,
  "a JavaScript React implementation cannot coexist with its native owner",
);
assert.throws(
  () =>
    validateRuleLedger([
      {
        ...rulesOfHooks,
        executionPath: "javascript-plugin",
      },
    ]),
  /Stable React profile entry.*native Oxlint/u,
  "stable React profiles must keep native ownership",
);

assert.deepEqual(orderedProfiles(["react", "core", "imports", "core"]), [
  "core",
  "imports",
  "react",
]);
assert.deepEqual(
  composeProfiles(["react", "core", "imports"]),
  composeProfiles(["imports", "react", "core"]),
  "profile composition must be independent of caller order",
);
assert.throws(
  () => composeProfiles(["core", "react-compiler"]),
  /cannot silently enter a stable configuration/u,
);
assert.throws(
  () => composeProfiles(["vitest", "jest"]),
  /Conflicting rule ownership/u,
);

const completeConfigurableProfiles = [
  "core",
  "imports",
  "typescript-syntax",
  "typescript-type-aware",
  "react",
  "jsx-a11y",
  "node",
  "ai",
] as const;
const essentialRuleIds = [
  "eslint/no-debugger",
  "eslint/no-dupe-keys",
  "eslint/no-unsafe-finally",
  "eslint/valid-typeof",
  "jsx-a11y/alt-text",
  "node/no-exports-assign",
  "react/jsx-key",
  "react/jsx-no-undef",
  "react/rules-of-hooks",
  "typescript/await-thenable",
  "typescript/ban-ts-comment",
  "typescript/no-duplicate-enum-values",
  "typescript/no-floating-promises",
];
const recommendedRuleIds = [
  ...essentialRuleIds,
  "import/no-duplicates",
  "typescript/no-extra-non-null-assertion",
];
const strictRuleIds = [
  ...recommendedRuleIds,
  "import/no-self-import",
  "node/no-new-require",
  "node/no-path-concat",
  "typescript/switch-exhaustiveness-check",
];
const expectedLevelRules = {
  essential: new Set(essentialRuleIds),
  recommended: new Set(recommendedRuleIds),
  strict: new Set(strictRuleIds),
};
const levelConfigs = {
  essential: composeProfiles(completeConfigurableProfiles, {
    level: "essential",
  }),
  recommended: composeProfiles(completeConfigurableProfiles, {
    level: "recommended",
  }),
  strict: composeProfiles(completeConfigurableProfiles, { level: "strict" }),
};

const categoryDrafts = {
  essential: composeProfiles(completeConfigurableProfiles, {
    level: "essential",
    policyCategories: true,
  }),
  recommended: composeProfiles(completeConfigurableProfiles, {
    level: "recommended",
    policyCategories: true,
  }),
  strict: composeProfiles(completeConfigurableProfiles, {
    level: "strict",
    policyCategories: true,
  }),
};
assert.deepEqual(categoryDrafts.essential.categories, {
  correctness: "error",
  suspicious: "off",
  pedantic: "off",
  perf: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
});
assert.deepEqual(categoryDrafts.recommended.categories, {
  correctness: "error",
  suspicious: "error",
  pedantic: "off",
  perf: "error",
  style: "off",
  restriction: "off",
  nursery: "off",
});
assert.deepEqual(categoryDrafts.strict.categories, {
  correctness: "error",
  suspicious: "error",
  pedantic: "error",
  perf: "error",
  style: "error",
  restriction: "error",
  nursery: "off",
});
assert.deepEqual(
  new Set(categoryDrafts.recommended.plugins),
  new Set([
    "unicorn",
    "typescript",
    "oxc",
    "import",
    "react",
    "jsx-a11y",
    "node",
  ]),
  "category drafts must load native baseline and selected context plugins",
);
assert.equal(
  categoryDrafts.essential.rules?.["import/no-self-import"],
  "off",
  "category drafts must preserve curated higher-level exclusions",
);
assert.equal(
  categoryDrafts.strict.rules?.["eslint/no-warning-comments"],
  "off",
  "AI-only rules must remain off when the overlay is disabled",
);

for (const [lower, higher] of [
  ["essential", "recommended"],
  ["recommended", "strict"],
] as const) {
  for (const [id, configuration] of Object.entries(
    levelConfigs[lower].rules ?? {},
  )) {
    assert.deepEqual(
      levelConfigs[higher].rules?.[id],
      configuration,
      `${higher} must not reconfigure ${id} already active at ${lower}`,
    );
  }
}

const essentialRules = selectRules(completeConfigurableProfiles, {
  level: "essential",
});
assert.deepEqual(
  new Set(essentialRules.map((entry) => entry.id)),
  expectedLevelRules.essential,
  "essential must remain the reviewed high-signal subset",
);
assert.deepEqual(
  new Set(selectRules(completeConfigurableProfiles).map((entry) => entry.id)),
  expectedLevelRules.recommended,
  "recommended must be the default level",
);
assert.deepEqual(
  new Set(
    selectRules(completeConfigurableProfiles, { level: "strict" }).map(
      (entry) => entry.id,
    ),
  ),
  expectedLevelRules.strict,
  "strict must contain the complete configurable level-controlled surface",
);

for (const level of ["essential", "recommended", "strict"] as const) {
  const withoutAi = selectRules(completeConfigurableProfiles, { level });
  const withAi = selectRules(completeConfigurableProfiles, {
    ai: true,
    level,
  });
  assert.deepEqual(
    new Set(withoutAi.map((entry) => entry.id)),
    expectedLevelRules[level],
    `${level} must match its reviewed level membership`,
  );
  assert.deepEqual(
    new Set(
      withAi
        .filter((entry) => entry.activation.kind === "level")
        .map((entry) => entry.id),
    ),
    expectedLevelRules[level],
    `AI must not activate level-controlled rules outside ${level}`,
  );
  assert.deepEqual(
    withAi
      .filter((entry) => entry.activation.kind === "ai")
      .map((entry) => entry.id),
    ["eslint/no-warning-comments"],
    "AI may add only explicitly AI-activated guardrails",
  );
}

const essentialConfig = composeProfiles(completeConfigurableProfiles, {
  level: "essential",
});
assert.equal(
  essentialConfig.plugins?.includes("import"),
  false,
  "essential must not load plugins that own no selected rule",
);
const essentialAiConfig = composeProfiles(completeConfigurableProfiles, {
  ai: true,
  level: "essential",
});
assert.equal(
  essentialAiConfig.rules?.["typescript/switch-exhaustiveness-check"],
  undefined,
  "AI must not pull a strict rule into essential",
);
assert.deepEqual(
  composeProfiles(["core"], { level: "essential" }).rules?.[
    "eslint/valid-typeof"
  ],
  "error",
);
assert.deepEqual(
  composeProfiles(["core"], { ai: true, level: "essential" }).rules?.[
    "eslint/valid-typeof"
  ],
  ["error", { requireStringLiterals: true }],
  "AI may tighten options only for an already active level rule",
);

for (const profiles of [
  ["core", "imports", "typescript-syntax", "typescript-type-aware"],
  [
    "core",
    "imports",
    "typescript-syntax",
    "typescript-type-aware",
    "react",
    "jsx-a11y",
  ],
  ["core", "imports", "typescript-syntax", "typescript-type-aware", "node"],
  ["core", "imports", "typescript-syntax", "typescript-type-aware", "vitest"],
  ["core", "imports", "typescript-syntax", "typescript-type-aware", "jest"],
] as const) {
  const selected = selectRules(profiles);
  assert.equal(
    new Set(selected.map((entry) => entry.id)).size,
    selected.length,
    `combined profiles ${profiles.join(", ")} must have one owner per rule`,
  );
}

const schema = JSON.parse(
  readFileSync(
    resolve(repositoryRoot, "node_modules/oxlint/configuration_schema.json"),
    "utf8",
  ),
) as {
  definitions: { DummyRuleMap: { properties: Record<string, unknown> } };
};
const supportedRules = schema.definitions.DummyRuleMap.properties;
for (const entry of ruleLedger) {
  const schemaId = entry.id.startsWith("eslint/")
    ? entry.id.slice("eslint/".length)
    : entry.id;
  assert(
    schemaId in supportedRules,
    `${entry.id} must exist in the pinned Oxlint schema`,
  );
  for (const fixture of entry.fixtures) {
    for (const path of [fixture.valid, fixture.invalid]) {
      assert.doesNotThrow(
        () => readFileSync(resolve(repositoryRoot, path)),
        `${entry.id} fixture ${path} must exist`,
      );
    }
  }
}

const nativeReplacement = ruleLedger.find(
  (entry) => entry.id === "import/no-duplicates",
);
assert(nativeReplacement);
assert(
  nativeReplacement.replaces.includes("eslint-plugin-import/no-duplicates"),
);
assert(nativeReplacement.conflicts.includes("eslint/no-duplicate-imports"));

console.log(`Validated ${ruleLedger.length} rule ledger entries.`);

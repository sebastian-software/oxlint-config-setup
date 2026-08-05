import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ruleLedger } from "../src/ledger.js";
import { composeProfiles, orderedProfiles, selectRules } from "../src/profiles.js";
import {
  type RuleLedgerEntry,
  validateRuleLedger,
} from "../src/schema.js";
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

assert.deepEqual(
  orderedProfiles(["react", "core", "imports", "core"]),
  ["core", "imports", "react"],
);
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

for (const profiles of [
  ["core", "imports", "typescript-syntax", "typescript-type-aware"],
  ["core", "imports", "typescript-syntax", "typescript-type-aware", "react", "jsx-a11y"],
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
assert(nativeReplacement.replaces.includes("eslint-plugin-import/no-duplicates"));
assert(nativeReplacement.conflicts.includes("eslint/no-duplicate-imports"));

console.log(`Validated ${ruleLedger.length} rule ledger entries.`);

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import { allConfigArtifacts } from "../src/artifacts.js";
import { runProcess } from "./harness.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const outputArgument = process.argv.indexOf("--output");
const outputDirectory = resolve(
  repositoryRoot,
  outputArgument === -1
    ? process.env.CANARY_OUTPUT_DIR ?? "canary-artifacts"
    : (process.argv[outputArgument + 1] ?? "canary-artifacts"),
);
const failOnDiff = process.argv.includes("--fail-on-diff");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-native-surface-"));
const oxlint = resolve(repositoryRoot, "node_modules/.bin/oxlint");

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(left, right);
}

function ruleChanges(
  expected: JsonRecord,
  actual: JsonRecord,
): { added: string[]; changed: string[]; removed: string[] } {
  const expectedRules = asRecord(expected.rules);
  const actualRules = asRecord(actual.rules);
  return {
    added: Object.keys(actualRules)
      .filter((rule) => expectedRules[rule] === undefined)
      .toSorted(),
    changed: Object.keys(actualRules)
      .filter(
        (rule) =>
          expectedRules[rule] !== undefined &&
          !jsonEqual(expectedRules[rule], actualRules[rule]),
      )
      .toSorted(),
    removed: Object.keys(expectedRules)
      .filter((rule) => actualRules[rule] === undefined)
      .toSorted(),
  };
}

function categoryChanges(expected: JsonRecord, actual: JsonRecord): string[] {
  const expectedCategories = asRecord(expected.categories);
  const actualCategories = asRecord(actual.categories);
  return [...new Set([...Object.keys(expectedCategories), ...Object.keys(actualCategories)])]
    .filter(
      (category) =>
        !jsonEqual(expectedCategories[category], actualCategories[category]),
    )
    .toSorted();
}

function renderList(label: string, values: readonly string[]): string[] {
  return values.length === 0
    ? []
    : [`- ${label}: ${values.map((value) => `\`${value}\``).join(", ")}`];
}

const expected = JSON.parse(
  readFileSync(
    resolve(repositoryRoot, "fixtures/snapshots/effective-configs.json"),
    "utf8",
  ),
) as Record<string, unknown>;
const actual: Record<string, unknown> = {};

try {
  for (const artifact of allConfigArtifacts()) {
    const configPath = resolve(temporaryRoot, `${artifact.publicName}.json`);
    writeFileSync(configPath, `${JSON.stringify(artifact.config, null, 2)}\n`);
    const source = artifact.typeAware
      ? "fixtures/rules/typescript-type-aware/valid.ts"
      : "fixtures/rules/typescript-syntax/valid.ts";
    const printed = runProcess(
      oxlint,
      ["--config", configPath, "--print-config", source],
      { cwd: repositoryRoot },
    );
    if (printed.kind !== "success") {
      throw new Error(
        `${artifact.publicName} --print-config failed as ${printed.kind}: ${printed.stderr || printed.stdout}`,
      );
    }
    const value = JSON.parse(printed.stdout) as JsonRecord;
    actual[artifact.publicName] = {
      categories: value.categories,
      options: value.options,
      plugins: Array.isArray(value.plugins)
        ? value.plugins.toSorted((left, right) => String(left).localeCompare(String(right)))
        : value.plugins,
      rules: value.rules,
    };
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "native-category-surface.json"),
  `${JSON.stringify(actual, null, 2)}\n`,
);

const changedArtifacts = Object.keys(actual)
  .filter((name) => !jsonEqual(expected[name], actual[name]))
  .toSorted();
const report = [
  "# Native category and rule-surface diff",
  "",
  changedArtifacts.length === 0
    ? "No native category or effective-rule changes were detected."
    : `${changedArtifacts.length} effective configuration surface(s) changed.`,
  "",
];

for (const name of changedArtifacts) {
  const expectedConfig = asRecord(expected[name]);
  const actualConfig = asRecord(actual[name]);
  const rules = ruleChanges(expectedConfig, actualConfig);
  const categories = categoryChanges(expectedConfig, actualConfig);
  report.push(`## ${name}`, "");
  report.push(...renderList("changed categories", categories));
  report.push(...renderList("added rules", rules.added));
  report.push(...renderList("changed rules", rules.changed));
  report.push(...renderList("removed rules", rules.removed));
  if (
    categories.length === 0 &&
    rules.added.length === 0 &&
    rules.changed.length === 0 &&
    rules.removed.length === 0
  ) {
    report.push("- The non-rule effective configuration changed.");
  }
  report.push("");
}

writeFileSync(
  resolve(outputDirectory, "native-category-surface.diff.md"),
  `${report.join("\n")}\n`,
);
console.log(`Recorded ${changedArtifacts.length} changed native configuration surface(s).`);

if (failOnDiff && changedArtifacts.length > 0) {
  throw new Error(
    "snapshot failure: upstream native category or rule-surface changes require review",
  );
}

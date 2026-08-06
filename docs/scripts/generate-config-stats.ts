import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { DummyRule, OxlintConfig } from "oxlint";

import { publicConfigName } from "../../src/artifacts.js";
import { createConfig } from "../../src/config.js";
import {
  allConfigOptions,
  configFileName,
} from "../../src/options.js";

function isActive(rule: DummyRule | undefined): boolean {
  if (rule === undefined) return false;
  const severity: unknown = Array.isArray(rule) ? rule[0] : rule;
  return severity !== "off" && severity !== "allow" && severity !== 0;
}

function activeRuleNames(config: OxlintConfig): string[] {
  const names = new Set<string>();
  const ruleMaps = [
    config.rules,
    ...(config.overrides ?? []).map((override) => override.rules),
  ];

  for (const rules of ruleMaps) {
    if (rules === undefined) continue;
    for (const [name, rule] of Object.entries(rules)) {
      if (isActive(rule)) names.add(name);
    }
  }

  return [...names].toSorted();
}

const configurations = allConfigOptions().map((selection) => {
  const config = createConfig(selection);
  const source = JSON.stringify(config);
  return {
    activeRules: activeRuleNames(config).length,
    artifactKb: Math.round((Buffer.byteLength(source) / 1024) * 10) / 10,
    fileName: configFileName(selection),
    plugins: config.plugins?.length ?? 0,
    publicName: publicConfigName(selection),
    selection,
  };
});

if (configurations.length !== 24) {
  throw new Error(
    `Expected 24 configurable artifacts, received ${configurations.length}`,
  );
}

const outputDirectory = resolve(import.meta.dirname, "../app/generated");
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "config-stats.json"),
  `${JSON.stringify({ configurations }, null, 2)}\n`,
  "utf8",
);

console.log(`Generated ${configurations.length} homepage configurations.`);

const ruleCatalogSource = readFileSync(
  resolve(import.meta.dirname, "../../docs/rule-catalog.md"),
  "utf8",
);
const referenceDirectory = resolve(
  import.meta.dirname,
  "../app/routes/reference",
);
mkdirSync(referenceDirectory, { recursive: true });
writeFileSync(
  resolve(referenceDirectory, "rule-catalog.mdx"),
  [
    "---",
    "title: Rule Catalog",
    "description: Every reviewed rule, its activation level, rationale, fixtures, and ownership boundary.",
    "order: 1",
    "---",
    "",
    ruleCatalogSource,
  ].join("\n"),
  "utf8",
);
console.log("Materialized the generated rule catalog for Ardo.");

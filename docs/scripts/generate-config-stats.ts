import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { DummyRule, OxlintConfig } from "oxlint";

import { allConfigArtifacts, publicConfigName } from "../../src/artifacts.js";
import {
  allConfigOptions,
  configFileName,
  type NormalizedConfigOptions,
} from "../../src/options.js";

const PLUGIN_META = {
  eslint: "ESLint core",
  import: "Imports",
  oxc: "OXC",
  typescript: "TypeScript",
  unicorn: "Unicorn",
  react: "React",
  "jsx-a11y": "Accessibility",
  node: "Node.js",
  vitest: "Vitest",
  jest: "Jest",
} as const;
const PLUGIN_ORDER = Object.keys(PLUGIN_META);

function isActive(rule: DummyRule | undefined): rule is DummyRule {
  if (rule === undefined) return false;
  const severity: unknown = Array.isArray(rule) ? rule[0] : rule;
  return severity !== "off" && severity !== "allow" && severity !== 0;
}

function activeRules(config: OxlintConfig): Map<string, DummyRule> {
  const rules = new Map<string, DummyRule>();
  const ruleMaps = [
    config.rules,
    ...(config.overrides ?? []).map((override) => override.rules),
  ];

  for (const ruleMap of ruleMaps) {
    if (ruleMap === undefined) continue;
    for (const [name, rule] of Object.entries(ruleMap)) {
      if (isActive(rule)) rules.set(name, rule);
    }
  }

  return rules;
}

function rulePlugin(name: string): string {
  const separator = name.indexOf("/");
  return separator === -1 ? "eslint" : name.slice(0, separator);
}

function groupRules(rules: Iterable<string>) {
  const grouped = new Map<string, string[]>();
  for (const rule of rules) {
    const plugin = rulePlugin(rule);
    const group = grouped.get(plugin) ?? [];
    group.push(rule);
    grouped.set(plugin, group);
  }

  return [...grouped.entries()]
    .map(([plugin, names]) => ({
      id: plugin,
      label: PLUGIN_META[plugin as keyof typeof PLUGIN_META] ?? plugin,
      rules: names.toSorted(),
    }))
    .toSorted(
      (left, right) =>
        (PLUGIN_ORDER.indexOf(left.id) === -1
          ? Number.MAX_SAFE_INTEGER
          : PLUGIN_ORDER.indexOf(left.id)) -
          (PLUGIN_ORDER.indexOf(right.id) === -1
            ? Number.MAX_SAFE_INTEGER
            : PLUGIN_ORDER.indexOf(right.id)) ||
        left.label.localeCompare(right.label),
    );
}

function compareRules(
  before: OxlintConfig,
  after: OxlintConfig,
): { added: string[]; adjusted: string[] } {
  const beforeRules = activeRules(before);
  const afterRules = activeRules(after);
  const added: string[] = [];
  const adjusted: string[] = [];

  for (const [name, configuration] of afterRules) {
    const previous = beforeRules.get(name);
    if (previous === undefined) {
      added.push(name);
    } else if (JSON.stringify(previous) !== JSON.stringify(configuration)) {
      adjusted.push(name);
    }
  }

  return {
    added: added.toSorted(),
    adjusted: adjusted.toSorted(),
  };
}

const configurableArtifacts = new Map(
  allConfigArtifacts()
    .filter((artifact) => artifact.fileName.startsWith("config-"))
    .map((artifact) => [artifact.fileName, artifact.config]),
);

function configFor(selection: NormalizedConfigOptions): OxlintConfig {
  const config = configurableArtifacts.get(configFileName(selection));
  if (config === undefined) {
    throw new Error(
      `Missing generated configuration for ${publicConfigName(selection)}`,
    );
  }
  return config;
}

const configurations = allConfigOptions().map((selection) => {
  const config = configFor(selection);
  const baseSelection = {
    ai: false,
    level: selection.level,
    node: false,
    react: false,
  } satisfies NormalizedConfigOptions;
  const baseConfig = configFor(baseSelection);
  const projectRules = [];

  if (selection.react) {
    const reactSelection = {
      ...baseSelection,
      react: true,
    };
    projectRules.push({
      id: "react",
      label: "React",
      ...compareRules(baseConfig, configFor(reactSelection)),
    });
  }
  if (selection.node) {
    const nodeSelection = {
      ...baseSelection,
      node: true,
    };
    projectRules.push({
      id: "node",
      label: "Node.js",
      ...compareRules(baseConfig, configFor(nodeSelection)),
    });
  }
  if (selection.ai) {
    const withoutAi = configFor({ ...selection, ai: false });
    projectRules.push({
      id: "ai",
      label: "AI overlay",
      ...compareRules(withoutAi, config),
    });
  }

  const source = JSON.stringify(config);
  return {
    activeRules: activeRules(config).size,
    artifactKb: Math.round((Buffer.byteLength(source) / 1024) * 10) / 10,
    fileName: configFileName(selection),
    plugins: config.plugins?.length ?? 0,
    policyRules: groupRules(activeRules(baseConfig).keys()),
    projectRules,
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
    "description: Curated rule overrides, activation boundaries, rationale, fixtures, and ownership.",
    "order: 1",
    "---",
    "",
    ruleCatalogSource,
  ].join("\n"),
  "utf8",
);
console.log("Materialized the generated rule catalog for Ardo.");

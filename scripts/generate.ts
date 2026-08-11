import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { OxlintConfig } from "oxlint";

import { allConfigArtifacts } from "../src/artifacts.js";
import { ruleLedger } from "../src/ledger.js";
import { assertGeneratedContent } from "./generation.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function activationLabel(entry: (typeof ruleLedger)[number]): string {
  switch (entry.activation.kind) {
    case "ai":
      return "`ai`";
    case "named":
      return "`named`";
    case "level":
      return `\`${entry.activation.minimumLevel}\``;
  }
}

function aiBehavior(entry: (typeof ruleLedger)[number]): string {
  if (entry.activation.kind === "ai") {
    return "Added only when `ai: true`";
  }
  if (
    entry.activation.kind !== "level" ||
    entry.activation.aiOverride === undefined
  ) {
    return "—";
  }
  const override = entry.activation.aiOverride;
  const changes = [
    override.severity === undefined ? "" : `severity → ${override.severity}`,
    override.options === undefined
      ? ""
      : `options → \`${escapeCell(JSON.stringify(override.options))}\``,
  ].filter(Boolean);
  return `${changes.join("; ")}. ${escapeCell(override.rationale)}`;
}

function renderCatalog(): string {
  const lines = [
    "# Generated rule catalog",
    "",
    "> This file is generated from `src/ledger.ts`. Run `pnpm generate` after ledger changes.",
    "",
    `The curated v0.1 ledger contains **${ruleLedger.length} reviewed additions, overrides, and exceptions** with repository-owned fixtures. The broad baseline is materialized from the pinned Oxlint categories and snapshot-tested; the single experimental rule remains isolated from every configurable artifact.`,
    "",
    "| Rule | Defect class | Profile | Activation | AI behavior | Path | Severity | Stability | Rationale | Fixtures | Replaces | Conflicts | Review trigger |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const entry of ruleLedger) {
    const fixtures = entry.fixtures
      .map((fixture) => `${fixture.valid}; ${fixture.invalid}`)
      .join("<br>");
    lines.push(
      `| [\`${entry.id}\`](${entry.source.documentation}) | ${escapeCell(entry.defectClass)} | \`${entry.profile}\` | ${activationLabel(entry)} | ${aiBehavior(entry)} | \`${entry.executionPath}\` | ${entry.severity} | ${entry.stability} | ${escapeCell(entry.rationale)} | ${fixtures} | ${entry.replaces.join(", ") || "—"} | ${entry.conflicts.join(", ") || "—"} | ${escapeCell(entry.reviewTrigger)} |`,
    );
  }
  lines.push(
    "",
    "## Native replacement example",
    "",
    "`import/no-duplicates` is the owner for duplicate-import diagnostics. It replaces both the predecessor's JavaScript-plugin rule `eslint-plugin-import/no-duplicates` and the overlapping core rule `eslint/no-duplicate-imports`. The conflict field prevents both owners from entering one generated config; the shared valid/invalid fixture proves the native behavior.",
    "",
    "## Stability boundary",
    "",
    "`react/react-compiler` is emitted only by the explicitly named experimental artifact and begins as a warning. Testing Library is a package-owned file-scoped integration rather than a ledger profile; it inherits the upstream DOM or React preset, while local evidence covers selection, activation, isolation, runtime resolution, and one clean-consumer diagnostic. Playwright remains a research item; Storybook, SonarJS, and regular-expression plugin domains are Deferred with explicit re-entry gates in the migration guide.",
    "",
  );
  return lines.join("\n");
}

function normalizeSeverity(value: unknown): unknown {
  if (value === "off") return "allow";
  if (value === "error") return "deny";
  return value;
}

function normalizeRuleConfig(value: unknown): unknown {
  if (!Array.isArray(value)) return normalizeSeverity(value);
  const [severity, ...options] = value;
  return [normalizeSeverity(severity), options];
}

function effectiveProjection(config: OxlintConfig): unknown {
  return {
    categories: Object.fromEntries(
      Object.entries(config.categories ?? {}).map(([key, value]) => [
        key,
        normalizeRuleConfig(value),
      ]),
    ),
    options: {
      typeAware: config.options?.typeAware ?? false,
    },
    plugins: [...(config.plugins ?? [])].toSorted(),
    rules: Object.fromEntries(
      Object.entries(config.rules ?? {}).map(([key, value]) => [
        key.startsWith("eslint/")
          ? key.slice("eslint/".length)
          : key.replace("jsx-a11y/", "jsx_a11y/"),
        normalizeRuleConfig(value),
      ]),
    ),
  };
}

const generated = new Map<string, string>([
  ["docs/rule-catalog.md", renderCatalog()],
  [
    "fixtures/snapshots/effective-configs.json",
    `${JSON.stringify(
      Object.fromEntries(
        allConfigArtifacts().map((artifact) => [
          artifact.publicName,
          effectiveProjection(artifact.config),
        ]),
      ),
      null,
      2,
      )}\n`,
  ],
]);

for (const [relativePath, source] of generated) {
  const path = resolve(repositoryRoot, relativePath);
  if (check) {
    let current = "";
    try {
      current = readFileSync(path, "utf8");
    } catch {
      // The comparison below reports a useful stale-file error.
    }
    assertGeneratedContent(relativePath, current, source);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
}

console.log(
  check
    ? `Verified ${generated.size} generated source artifacts.`
    : `Generated ${generated.size} source artifacts.`,
);

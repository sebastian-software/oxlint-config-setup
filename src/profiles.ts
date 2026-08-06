import type { DummyRule, OxlintConfig } from "oxlint";

import { ruleLedger } from "./ledger.js";
import type { ConfigLevel } from "./levels.js";
import {
  PROFILE_ORDER,
  type RuleLedgerEntry,
  type RuleProfile,
} from "./schema.js";

export interface ComposeOptions {
  ai?: boolean;
  level?: ConfigLevel;
  surface?: "stable" | "experimental";
  typeAware?: boolean;
}

const PROFILE_INDEX = new Map(
  PROFILE_ORDER.map((profile, index) => [profile, index]),
);
const LEVEL_INDEX = new Map(
  (["essential", "recommended", "strict"] as const).map((level, index) => [
    level,
    index,
  ]),
);

function severityToOxlint(
  severity: RuleLedgerEntry["severity"] | "warning" | "error",
): "off" | "warn" | "error" {
  return severity === "warning" ? "warn" : severity;
}

function isRuleSelected(
  entry: RuleLedgerEntry,
  level: ConfigLevel,
  ai: boolean,
): boolean {
  switch (entry.activation.kind) {
    case "ai":
      return ai;
    case "named":
      return true;
    case "level":
      return (
        (LEVEL_INDEX.get(entry.activation.minimumLevel) ??
          Number.MAX_SAFE_INTEGER) <=
        (LEVEL_INDEX.get(level) ?? -1)
      );
  }
}

function ruleConfig(entry: RuleLedgerEntry, ai: boolean): DummyRule {
  const override =
    ai && entry.activation.kind === "level"
      ? entry.activation.aiOverride
      : undefined;
  const severity = severityToOxlint(override?.severity ?? entry.severity);
  const options = override?.options ?? entry.options;
  return options === undefined ? severity : [severity, ...options];
}

function pluginsForRules(
  entries: readonly RuleLedgerEntry[],
): NonNullable<OxlintConfig["plugins"]> {
  const profiles = new Set(entries.map((entry) => entry.profile));
  const plugins = new Set<NonNullable<OxlintConfig["plugins"]>[number]>();
  if (
    profiles.has("typescript-syntax") ||
    profiles.has("typescript-type-aware")
  ) {
    plugins.add("typescript");
  }
  if (profiles.has("imports")) plugins.add("import");
  if (profiles.has("react") || profiles.has("react-compiler")) {
    plugins.add("react");
  }
  if (profiles.has("jsx-a11y")) plugins.add("jsx-a11y");
  if (profiles.has("node")) plugins.add("node");
  if (profiles.has("vitest")) plugins.add("vitest");
  if (profiles.has("jest")) plugins.add("jest");
  return [...plugins];
}

export function orderedProfiles(
  profiles: readonly RuleProfile[],
): RuleProfile[] {
  const unique = [...new Set(profiles)];
  return unique.toSorted(
    (left, right) =>
      (PROFILE_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (PROFILE_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function selectRules(
  profiles: readonly RuleProfile[],
  options: ComposeOptions = {},
): readonly RuleLedgerEntry[] {
  const selectedProfiles = new Set(orderedProfiles(profiles));
  const level = options.level ?? "recommended";
  const ai = options.ai ?? false;
  const selected = ruleLedger
    .filter(
      (entry) =>
        selectedProfiles.has(entry.profile) &&
        entry.severity !== "off" &&
        isRuleSelected(entry, level, ai),
    )
    .toSorted((left, right) => left.id.localeCompare(right.id));
  const ids = new Set(selected.map((entry) => entry.id));

  for (const entry of selected) {
    if (
      options.surface !== "experimental" &&
      (entry.stability === "experimental" ||
        entry.executionPath === "native-experimental" ||
        entry.executionPath === "javascript-plugin")
    ) {
      throw new Error(
        `Rule ${entry.id} cannot silently enter a stable configuration`,
      );
    }
    for (const conflict of entry.conflicts) {
      if (ids.has(conflict)) {
        throw new Error(
          `Conflicting rule ownership: ${entry.id} cannot run with ${conflict}`,
        );
      }
    }
  }

  return selected;
}

export function composeProfiles(
  profiles: readonly RuleProfile[],
  options: ComposeOptions = {},
): OxlintConfig {
  const normalizedProfiles = orderedProfiles(profiles);
  const typeAware =
    options.typeAware ?? normalizedProfiles.includes("typescript-type-aware");
  if (!typeAware && normalizedProfiles.includes("typescript-type-aware")) {
    throw new Error(
      "The typescript-type-aware profile requires options.typeAware to be true",
    );
  }

  const selectedRules = selectRules(normalizedProfiles, options);
  const rules = Object.fromEntries(
    selectedRules.map((entry) => [
      entry.id,
      ruleConfig(entry, options.ai ?? false),
    ]),
  );

  return {
    categories: {
      correctness: "off",
      suspicious: "off",
      pedantic: "off",
      perf: "off",
      style: "off",
      restriction: "off",
      nursery: "off",
    },
    options: { typeAware },
    plugins: pluginsForRules(selectedRules),
    rules,
  };
}

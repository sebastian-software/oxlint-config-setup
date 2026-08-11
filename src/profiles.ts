import type { DummyRule, OxlintConfig } from "oxlint";

import { ruleLedger } from "./ledger.js";
import type { ConfigLevel } from "./levels.js";
import { configureRule, setRuleSeverity } from "./rule-helpers.js";
import {
  PROFILE_ORDER,
  type RuleLedgerEntry,
  type RuleProfile,
} from "./schema.js";

export interface ComposeOptions {
  ai?: boolean;
  level?: ConfigLevel;
  policyCategories?: boolean;
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
const DISABLED_CATEGORIES = {
  correctness: "off",
  suspicious: "off",
  pedantic: "off",
  perf: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
} as const satisfies NonNullable<OxlintConfig["categories"]>;
const CATEGORY_POLICY = {
  essential: {
    ...DISABLED_CATEGORIES,
    correctness: "error",
  },
  recommended: {
    ...DISABLED_CATEGORIES,
    correctness: "error",
    suspicious: "error",
    perf: "error",
  },
  strict: {
    ...DISABLED_CATEGORIES,
    correctness: "error",
    suspicious: "error",
    pedantic: "error",
    perf: "error",
    style: "error",
    restriction: "error",
  },
} as const satisfies Record<
  ConfigLevel,
  NonNullable<OxlintConfig["categories"]>
>;

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
          Number.MAX_SAFE_INTEGER) <= (LEVEL_INDEX.get(level) ?? -1)
      );
  }
}

function ruleConfig(entry: RuleLedgerEntry): DummyRule {
  const severity = severityToOxlint(entry.severity);
  const options = entry.options;
  return options === undefined ? severity : [severity, ...options];
}

function applyAiOverrides(
  config: OxlintConfig,
  entries: readonly RuleLedgerEntry[],
): void {
  for (const entry of entries) {
    if (
      entry.activation.kind !== "level" ||
      entry.activation.aiOverride === undefined
    ) {
      continue;
    }
    const override = entry.activation.aiOverride;
    if (override.severity !== undefined) {
      setRuleSeverity(config, entry.id, severityToOxlint(override.severity));
    }
    if (override.options !== undefined) {
      configureRule(config, entry.id, override.options);
    }
  }
}

function pluginsForRules(
  entries: readonly RuleLedgerEntry[],
  profiles: readonly RuleProfile[],
  policyCategories: boolean,
): NonNullable<OxlintConfig["plugins"]> {
  const enabledProfiles = policyCategories
    ? new Set(profiles)
    : new Set(entries.map((entry) => entry.profile));
  const plugins = new Set<NonNullable<OxlintConfig["plugins"]>[number]>();

  if (policyCategories) {
    plugins.add("unicorn");
    plugins.add("typescript");
    plugins.add("oxc");
    plugins.add("import");
  }

  if (
    enabledProfiles.has("typescript-syntax") ||
    enabledProfiles.has("typescript-type-aware")
  ) {
    plugins.add("typescript");
  }
  if (enabledProfiles.has("imports")) plugins.add("import");
  if (enabledProfiles.has("react") || enabledProfiles.has("react-compiler")) {
    plugins.add("react");
  }
  if (enabledProfiles.has("jsx-a11y")) plugins.add("jsx-a11y");
  if (enabledProfiles.has("node")) plugins.add("node");
  if (enabledProfiles.has("vitest")) plugins.add("vitest");
  if (enabledProfiles.has("jest")) plugins.add("jest");
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
  const profileSet = new Set(normalizedProfiles);
  const typeAware =
    options.typeAware ?? normalizedProfiles.includes("typescript-type-aware");
  if (!typeAware && normalizedProfiles.includes("typescript-type-aware")) {
    throw new Error(
      "The typescript-type-aware profile requires options.typeAware to be true",
    );
  }

  const level = options.level ?? "recommended";
  const policyCategories = options.policyCategories ?? false;
  const selectedRules = selectRules(normalizedProfiles, options);
  const selectedRuleIds = new Set(selectedRules.map((entry) => entry.id));
  const explicitExclusions = policyCategories
    ? ruleLedger.filter(
        (entry) =>
          (profileSet.has(entry.profile) || entry.activation.kind === "ai") &&
          entry.severity !== "off" &&
          !selectedRuleIds.has(entry.id),
      )
    : [];
  const rules = Object.fromEntries([
    ...explicitExclusions.map((entry) => [entry.id, "off"] as const),
    ...selectedRules.map((entry) => [entry.id, ruleConfig(entry)] as const),
  ]);

  const config: OxlintConfig = {
    categories: policyCategories
      ? { ...CATEGORY_POLICY[level] }
      : { ...DISABLED_CATEGORIES },
    options: { typeAware },
    plugins: pluginsForRules(
      selectedRules,
      normalizedProfiles,
      policyCategories,
    ),
    rules,
  };
  if (options.ai === true) applyAiOverrides(config, selectedRules);
  return config;
}

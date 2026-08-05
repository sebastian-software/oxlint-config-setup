import type { OxlintConfig } from "oxlint";

import { ruleLedger } from "./ledger.js";
import {
  PROFILE_ORDER,
  type RuleLedgerEntry,
  type RuleProfile,
} from "./schema.js";

export interface ComposeOptions {
  surface?: "stable" | "experimental";
  typeAware?: boolean;
}

const PROFILE_INDEX = new Map(
  PROFILE_ORDER.map((profile, index) => [profile, index]),
);

function severityToOxlint(
  severity: RuleLedgerEntry["severity"],
): "off" | "warn" | "error" {
  return severity === "warning" ? "warn" : severity;
}

function pluginsForProfiles(
  profiles: readonly RuleProfile[],
): NonNullable<OxlintConfig["plugins"]> {
  const plugins = new Set<NonNullable<OxlintConfig["plugins"]>[number]>();
  if (
    profiles.includes("typescript-syntax") ||
    profiles.includes("typescript-type-aware")
  ) {
    plugins.add("typescript");
  }
  if (profiles.includes("imports")) plugins.add("import");
  if (profiles.includes("react") || profiles.includes("react-compiler")) {
    plugins.add("react");
  }
  if (profiles.includes("jsx-a11y")) plugins.add("jsx-a11y");
  if (profiles.includes("node")) plugins.add("node");
  if (profiles.includes("vitest")) plugins.add("vitest");
  if (profiles.includes("jest")) plugins.add("jest");
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
  const selected = ruleLedger
    .filter(
      (entry) => selectedProfiles.has(entry.profile) && entry.severity !== "off",
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

  const rules = Object.fromEntries(
    selectRules(normalizedProfiles, options).map((entry) => [
      entry.id,
      severityToOxlint(entry.severity),
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
    plugins: pluginsForProfiles(normalizedProfiles),
    rules,
  };
}

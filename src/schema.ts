import { CONFIG_LEVELS, type ConfigLevel } from "./levels.js";

export const PROFILE_ORDER = [
  "core",
  "imports",
  "typescript-syntax",
  "typescript-type-aware",
  "react",
  "jsx-a11y",
  "node",
  "vitest",
  "jest",
  "ai",
  "react-compiler",
] as const;

export type RuleProfile = (typeof PROFILE_ORDER)[number];
export type RuleExecutionPath =
  | "native"
  | "native-type-aware"
  | "native-experimental"
  | "javascript-plugin";
export type RuleSeverity = "off" | "warning" | "error";
export type RuleStability = "stable" | "version-pinned" | "experimental";

export interface AiRuleOverride {
  severity?: Exclude<RuleSeverity, "off">;
  options?: readonly unknown[];
  rationale: string;
}

export type RuleActivation =
  | {
      kind: "level";
      minimumLevel: ConfigLevel;
      aiOverride?: AiRuleOverride;
    }
  | { kind: "ai" }
  | { kind: "named" }
  | { kind: "scoped" };

export interface RuleFixture {
  valid: string;
  invalid: string;
  diagnostic: {
    line: number;
    column: number;
  };
}

export interface RuleSource {
  documentation: string;
  predecessor?: string;
}

export interface RuleLedgerEntry {
  id: string;
  defectClass: string;
  profile: RuleProfile;
  executionPath: RuleExecutionPath;
  severity: RuleSeverity;
  options?: readonly unknown[];
  stability: RuleStability;
  activation: RuleActivation;
  rationale: string;
  source: RuleSource;
  fixtures: readonly RuleFixture[];
  replaces: readonly string[];
  conflicts: readonly string[];
  reviewTrigger: string;
}

const PROFILES = new Set<string>(PROFILE_ORDER);
const EXECUTION_PATHS = new Set<string>([
  "native",
  "native-type-aware",
  "native-experimental",
  "javascript-plugin",
]);
const SEVERITIES = new Set<string>(["off", "warning", "error"]);
const STABILITIES = new Set<string>([
  "stable",
  "version-pinned",
  "experimental",
]);
const LEVELS = new Set<string>(CONFIG_LEVELS);
const NAMED_PROFILES = new Set<RuleProfile>(["react-compiler"]);
const SCOPED_PROFILES = new Set<RuleProfile>(["vitest", "jest"]);
const STABLE_NATIVE_REACT_PROFILES = new Set<RuleProfile>([
  "react",
  "jsx-a11y",
]);
const SEVERITY_RANK: Record<RuleSeverity, number> = {
  off: 0,
  warning: 1,
  error: 2,
};

function assertNonEmpty(value: unknown, field: string, index: number): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`Rule ledger entry ${index} requires ${field}`);
  }
}

function assertStringArray(
  value: unknown,
  field: string,
  index: number,
): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new TypeError(
      `Rule ledger entry ${index} requires a string array for ${field}`,
    );
  }
}

function assertRuleActivation(
  entry: Record<string, unknown>,
  index: number,
): void {
  const activation = entry.activation;
  if (
    activation === null ||
    typeof activation !== "object" ||
    Array.isArray(activation)
  ) {
    throw new TypeError(`Rule ledger entry ${index} requires activation`);
  }

  const value = activation as Record<string, unknown>;
  const kind = value.kind;
  if (
    kind !== "level" &&
    kind !== "ai" &&
    kind !== "named" &&
    kind !== "scoped"
  ) {
    throw new TypeError(
      `Rule ledger entry ${index} has invalid activation kind: ${String(kind)}`,
    );
  }

  const profile = entry.profile as RuleProfile;
  if (kind === "named") {
    if (!NAMED_PROFILES.has(profile)) {
      throw new TypeError(
        `Rule ledger entry ${index} uses named activation outside a named profile`,
      );
    }
    if (Object.keys(value).some((key) => key !== "kind")) {
      throw new TypeError(
        `Rule ledger entry ${index} named activation cannot define level or AI fields`,
      );
    }
    return;
  }

  if (kind === "scoped") {
    if (!SCOPED_PROFILES.has(profile)) {
      throw new TypeError(
        `Rule ledger entry ${index} uses scoped activation outside a scoped profile`,
      );
    }
    if (Object.keys(value).some((key) => key !== "kind")) {
      throw new TypeError(
        `Rule ledger entry ${index} scoped activation cannot define level or AI fields`,
      );
    }
    return;
  }

  if (NAMED_PROFILES.has(profile)) {
    throw new TypeError(
      `Rule ledger entry ${index} in profile ${profile} requires named activation`,
    );
  }
  if (SCOPED_PROFILES.has(profile)) {
    throw new TypeError(
      `Rule ledger entry ${index} in profile ${profile} requires scoped activation`,
    );
  }

  if (kind === "ai") {
    if (Object.keys(value).some((key) => key !== "kind")) {
      throw new TypeError(
        `Rule ledger entry ${index} AI activation cannot define level or override fields`,
      );
    }
    return;
  }

  if (profile === "ai") {
    throw new TypeError(
      `Rule ledger entry ${index} in the AI profile requires AI activation`,
    );
  }
  if (!LEVELS.has(String(value.minimumLevel))) {
    throw new TypeError(
      `Rule ledger entry ${index} has invalid minimum level: ${String(value.minimumLevel)}`,
    );
  }
  if (
    Object.keys(value).some(
      (key) => !["kind", "minimumLevel", "aiOverride"].includes(key),
    )
  ) {
    throw new TypeError(
      `Rule ledger entry ${index} level activation has unsupported fields`,
    );
  }

  const override = value.aiOverride;
  if (override === undefined) return;
  if (
    override === null ||
    typeof override !== "object" ||
    Array.isArray(override)
  ) {
    throw new TypeError(
      `Rule ledger entry ${index} requires an object AI override`,
    );
  }
  const overrideValue = override as Record<string, unknown>;
  if (
    Object.keys(overrideValue).some(
      (key) => !["severity", "options", "rationale"].includes(key),
    )
  ) {
    throw new TypeError(
      `Rule ledger entry ${index} AI override has unsupported fields`,
    );
  }
  assertNonEmpty(
    overrideValue.rationale,
    "activation.aiOverride.rationale",
    index,
  );
  if (
    overrideValue.severity === undefined &&
    overrideValue.options === undefined
  ) {
    throw new TypeError(
      `Rule ledger entry ${index} AI override must change severity or options`,
    );
  }
  if (overrideValue.severity !== undefined) {
    if (
      overrideValue.severity !== "warning" &&
      overrideValue.severity !== "error"
    ) {
      throw new TypeError(
        `Rule ledger entry ${index} AI override has invalid severity: ${JSON.stringify(overrideValue.severity)}`,
      );
    }
    const baseSeverity = entry.severity as RuleSeverity;
    if (SEVERITY_RANK[overrideValue.severity] < SEVERITY_RANK[baseSeverity]) {
      throw new TypeError(
        `Rule ledger entry ${index} AI override cannot weaken severity`,
      );
    }
  }
  if (
    overrideValue.options !== undefined &&
    !Array.isArray(overrideValue.options)
  ) {
    throw new TypeError(
      `Rule ledger entry ${index} AI override options must be an array`,
    );
  }
}

export function validateRuleLedger(value: unknown): readonly RuleLedgerEntry[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Rule ledger must be an array");
  }

  const ids = new Map<string, number>();
  const ownership = new Map<string, number>();
  const replacementOwnership = new Map<string, number>();

  for (const [index, candidate] of value.entries()) {
    if (candidate === null || typeof candidate !== "object") {
      throw new TypeError(`Rule ledger entry ${index} must be an object`);
    }

    const entry = candidate as Record<string, unknown>;
    for (const field of [
      "id",
      "defectClass",
      "rationale",
      "reviewTrigger",
    ]) {
      assertNonEmpty(entry[field], field, index);
    }

    if (!PROFILES.has(String(entry.profile))) {
      throw new TypeError(
        `Rule ledger entry ${index} has unknown profile: ${String(entry.profile)}`,
      );
    }
    if (!EXECUTION_PATHS.has(String(entry.executionPath))) {
      throw new TypeError(
        `Rule ledger entry ${index} has invalid execution path: ${String(entry.executionPath)}`,
      );
    }
    if (!SEVERITIES.has(String(entry.severity))) {
      throw new TypeError(
        `Rule ledger entry ${index} has invalid severity: ${String(entry.severity)}`,
      );
    }
    if (!STABILITIES.has(String(entry.stability))) {
      throw new TypeError(
        `Rule ledger entry ${index} has invalid stability: ${String(entry.stability)}`,
      );
    }
    if (entry.options !== undefined && !Array.isArray(entry.options)) {
      throw new TypeError(
        `Rule ledger entry ${index} options must be an array`,
      );
    }
    assertRuleActivation(entry, index);

    if (
      STABLE_NATIVE_REACT_PROFILES.has(entry.profile as RuleProfile) &&
      (entry.activation as RuleActivation).kind === "level" &&
      entry.executionPath !== "native"
    ) {
      throw new TypeError(
        `Stable React profile entry ${index} must use the native Oxlint execution path`,
      );
    }
    if (
      entry.profile === "react-compiler" &&
      entry.executionPath !== "native-experimental"
    ) {
      throw new TypeError(
        `React Compiler entry ${index} must use the isolated native experimental execution path`,
      );
    }

    if (entry.source === null || typeof entry.source !== "object") {
      throw new TypeError(`Rule ledger entry ${index} requires source`);
    }
    assertNonEmpty(
      (entry.source as Record<string, unknown>).documentation,
      "source.documentation",
      index,
    );

    if (!Array.isArray(entry.fixtures) || entry.fixtures.length === 0) {
      throw new TypeError(`Rule ledger entry ${index} requires fixtures`);
    }
    for (const [fixtureIndex, fixture] of entry.fixtures.entries()) {
      if (fixture === null || typeof fixture !== "object") {
        throw new TypeError(
          `Rule ledger entry ${index} fixture ${fixtureIndex} must be an object`,
        );
      }
      const fixtureValue = fixture as Record<string, unknown>;
      assertNonEmpty(fixtureValue.valid, `fixtures[${fixtureIndex}].valid`, index);
      assertNonEmpty(
        fixtureValue.invalid,
        `fixtures[${fixtureIndex}].invalid`,
        index,
      );
      const diagnostic = fixtureValue.diagnostic;
      if (
        diagnostic === null ||
        typeof diagnostic !== "object" ||
        !Number.isInteger((diagnostic as Record<string, unknown>).line) ||
        !Number.isInteger((diagnostic as Record<string, unknown>).column)
      ) {
        throw new TypeError(
          `Rule ledger entry ${index} fixture ${fixtureIndex} requires an integer diagnostic location`,
        );
      }
    }

    assertStringArray(entry.replaces, "replaces", index);
    assertStringArray(entry.conflicts, "conflicts", index);

    const id = entry.id as string;
    const duplicateIndex = ids.get(id);
    if (duplicateIndex !== undefined) {
      throw new TypeError(
        `Duplicate rule identifier ${id} in entries ${duplicateIndex} and ${index}`,
      );
    }
    ids.set(id, index);

    const ownerKey = `${String(entry.profile)}\0${String(entry.defectClass)}`;
    const ownerIndex = ownership.get(ownerKey);
    if (ownerIndex !== undefined) {
      throw new TypeError(
        `Conflicting ownership for ${String(entry.profile)}/${String(entry.defectClass)} in entries ${ownerIndex} and ${index}`,
      );
    }
    ownership.set(ownerKey, index);

    for (const replacement of entry.replaces) {
      const ownerIndex = replacementOwnership.get(replacement);
      if (ownerIndex !== undefined && ownerIndex !== index) {
        throw new TypeError(
          `Duplicate ownership for replacement ${replacement} in entries ${ownerIndex} and ${index}`,
        );
      }
      replacementOwnership.set(replacement, index);
    }

    if (
      entry.executionPath === "native-experimental" &&
      entry.stability !== "experimental"
    ) {
      throw new TypeError(
        `Experimental rule ${id} must have experimental stability`,
      );
    }
    if (entry.stability === "experimental" && entry.severity === "error") {
      throw new TypeError(
        `Experimental rule ${id} cannot enter as an error`,
      );
    }
  }

  for (const [replacement, ownerIndex] of replacementOwnership) {
    const replacementIndex = ids.get(replacement);
    if (replacementIndex !== undefined && replacementIndex !== ownerIndex) {
      throw new TypeError(
        `Duplicate ownership for ${replacement} in entries ${replacementIndex} and ${ownerIndex}`,
      );
    }
  }

  return value as readonly RuleLedgerEntry[];
}

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
  stability: RuleStability;
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

export function validateRuleLedger(value: unknown): readonly RuleLedgerEntry[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Rule ledger must be an array");
  }

  const ids = new Map<string, number>();
  const ownership = new Map<string, number>();

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

  return value as readonly RuleLedgerEntry[];
}

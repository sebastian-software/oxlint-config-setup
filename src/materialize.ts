import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import type { DummyRule, OxlintConfig } from "oxlint";

const repositoryRoot = resolve(import.meta.dirname, "..");
const oxlintBinary = resolve(
  repositoryRoot,
  `node_modules/.bin/oxlint${process.platform === "win32" ? ".cmd" : ""}`,
);
const disabledCategories = {
  correctness: "off",
  suspicious: "off",
  pedantic: "off",
  perf: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
} as const satisfies NonNullable<OxlintConfig["categories"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalRuleName(name: string): string {
  if (!name.includes("/")) return `eslint/${name}`;
  return name.replace("jsx_a11y/", "jsx-a11y/");
}

function normalizeSeverity(value: unknown): "off" | "warn" | "error" {
  switch (value) {
    case 0:
    case "allow":
    case "off":
      return "off";
    case 1:
    case "warn":
      return "warn";
    case 2:
    case "deny":
    case "error":
      return "error";
    default:
      throw new TypeError(
        `Oxlint printed an unsupported rule severity: ${String(value)}`,
      );
  }
}

function normalizeRule(value: unknown, name: string): DummyRule {
  if (!Array.isArray(value)) return normalizeSeverity(value);
  if (value.length !== 2 || !Array.isArray(value[1])) {
    throw new TypeError(
      `Oxlint printed an unsupported configuration for rule ${name}`,
    );
  }
  return [normalizeSeverity(value[0]), ...value[1]];
}

function printedRules(source: string): NonNullable<OxlintConfig["rules"]> {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed) || !isRecord(parsed.rules)) {
    throw new TypeError("Oxlint --print-config did not return a rules object");
  }

  return Object.fromEntries(
    Object.entries(parsed.rules)
      .map(
        ([name, value]) =>
          [canonicalRuleName(name), normalizeRule(value, name)] as const,
      )
      .toSorted(([left], [right]) => left.localeCompare(right)),
  );
}

export function materializeConfig(
  draft: OxlintConfig,
  sourceFile: string,
): OxlintConfig {
  const temporaryDirectory = mkdtempSync(
    resolve(tmpdir(), "oxlint-config-materialize-"),
  );
  const configPath = resolve(temporaryDirectory, "oxlint.json");

  try {
    writeFileSync(configPath, JSON.stringify(draft), "utf8");
    const result = spawnSync(
      oxlintBinary,
      [
        "--disable-nested-config",
        "--config",
        configPath,
        "--print-config",
        sourceFile,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    if (result.error !== undefined) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `Unable to materialize Oxlint config for ${sourceFile}: ${result.stderr.trim()}`,
      );
    }

    return {
      ...draft,
      categories: { ...disabledCategories },
      rules: Object.fromEntries(
        Object.entries({
          ...printedRules(result.stdout),
          ...draft.rules,
        })
          .filter(
            (entry): entry is [string, DummyRule] => entry[1] !== undefined,
          )
          .toSorted(([left], [right]) => left.localeCompare(right)),
      ),
    };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

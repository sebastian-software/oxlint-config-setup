import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { allConfigArtifacts } from "../src/artifacts.js";
import { ruleLedger } from "../src/ledger.js";
import { composeProfiles, selectRules } from "../src/profiles.js";
import type { RuleProfile } from "../src/schema.js";
import {
  normalizeDiagnosticCode,
  parseOxlintJson,
  runProcess,
} from "./harness.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const oxlint = resolve(repositoryRoot, "node_modules/.bin/oxlint");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-harness-"));

function writeConfig(name: string, value: unknown): string {
  const path = resolve(temporaryRoot, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

function runOxlint(config: string, files: readonly string[]) {
  return runProcess(
    oxlint,
    ["--config", config, "--format", "json", ...files],
    { cwd: repositoryRoot },
  );
}

const profileCases: Array<{
  profile: RuleProfile;
  surface?: "experimental";
}> = [
  { profile: "core" },
  { profile: "imports" },
  { profile: "typescript-syntax" },
  { profile: "typescript-type-aware" },
  { profile: "react" },
  { profile: "jsx-a11y" },
  { profile: "node" },
  { profile: "vitest" },
  { profile: "jest" },
  { profile: "ai" },
  { profile: "react-compiler", surface: "experimental" },
];

try {
  for (const testCase of profileCases) {
    const config = composeProfiles([testCase.profile], {
      surface: testCase.surface,
    });
    const configPath = writeConfig(testCase.profile, config);
    const entries = selectRules([testCase.profile], {
      surface: testCase.surface,
    });
    const invalidFiles = [
      ...new Set(
        entries.flatMap((entry) =>
          entry.fixtures.map((fixture) => fixture.invalid),
        ),
      ),
    ];
    const invalid = parseOxlintJson(runOxlint(configPath, invalidFiles));
    const expectedIds = new Set(entries.map((entry) => entry.id));
    const actualIds = new Set(
      invalid.diagnostics.map((diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code),
      ),
    );
    assert.deepEqual(
      actualIds,
      expectedIds,
      `${testCase.profile} must report exactly its ledger-owned rules`,
    );

    for (const entry of entries) {
      for (const fixture of entry.fixtures) {
        const matching = invalid.diagnostics.filter(
          (diagnostic) =>
            normalizeDiagnosticCode(diagnostic.code) === entry.id &&
            diagnostic.filename.endsWith(fixture.invalid),
        );
        assert(matching.length > 0, `${entry.id} must report ${fixture.invalid}`);
        assert(
          matching.every(
            (diagnostic) =>
              diagnostic.severity ===
              (entry.severity === "warning" ? "warning" : "error"),
          ),
          `${entry.id} must report its ledger severity`,
        );
        assert(
          matching.some((diagnostic) =>
            diagnostic.labels.some(
              (label) =>
                label.span.line === fixture.diagnostic.line &&
                label.span.column === fixture.diagnostic.column,
            ),
          ),
          `${entry.id} must report ${fixture.invalid}:${fixture.diagnostic.line}:${fixture.diagnostic.column}`,
        );
      }
    }

    const validFiles = [
      ...new Set(
        entries.flatMap((entry) =>
          entry.fixtures.map((fixture) => fixture.valid),
        ),
      ),
    ];
    const valid = parseOxlintJson(runOxlint(configPath, validFiles));
    assert.deepEqual(
      valid.diagnostics,
      [],
      `${testCase.profile} valid fixtures must be clean`,
    );
  }

  const standardProfiles = [
    "core",
    "imports",
    "typescript-syntax",
    "typescript-type-aware",
    "react",
    "jsx-a11y",
    "node",
    "ai",
  ] as const;
  const standardEntries = selectRules(standardProfiles);
  const essentialEntries = selectRules(standardProfiles, {
    level: "essential",
  });
  const essentialConfig = writeConfig(
    "essential-boundary",
    composeProfiles(standardProfiles, { level: "essential" }),
  );
  const allStandardInvalidFiles = [
    ...new Set(
      standardEntries.flatMap((entry) =>
        entry.fixtures.map((fixture) => fixture.invalid),
      ),
    ),
  ];
  const essentialOnStandardInvalid = parseOxlintJson(
    runOxlint(essentialConfig, allStandardInvalidFiles),
  );
  assert.deepEqual(
    new Set(
      essentialOnStandardInvalid.diagnostics.map((diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code),
      ),
    ),
    new Set(essentialEntries.map((entry) => entry.id)),
    "essential must report its complete reviewed subset and exclude standard-only rules",
  );

  const syntaxConfig = writeConfig(
    "syntax-only-proof",
    composeProfiles(["typescript-syntax"]),
  );
  const typeAwareInvalid =
    "fixtures/rules/typescript-type-aware/invalid.ts";
  assert.deepEqual(
    parseOxlintJson(runOxlint(syntaxConfig, [typeAwareInvalid])).diagnostics,
    [],
    "syntax-only TypeScript must not require or execute the project graph backend",
  );

  const referencedProjectConfig = writeConfig(
    "project-references",
    composeProfiles(["typescript-type-aware"]),
  );
  const referencedProject = parseOxlintJson(
    runOxlint(referencedProjectConfig, [
      "fixtures/projects/references/packages/app/src/invalid.ts",
    ]),
  );
  assert(
    referencedProject.diagnostics.some(
      (diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code) ===
        "typescript/no-floating-promises",
    ),
    "type-aware linting must follow a referenced TypeScript project",
  );

  const vitestConfig = writeConfig("mismatch-vitest", composeProfiles(["vitest"]));
  const jestConfig = writeConfig("mismatch-jest", composeProfiles(["jest"]));
  const vitestOnJest = parseOxlintJson(
    runOxlint(vitestConfig, ["fixtures/rules/jest/invalid.ts"]),
  );
  assert(
    vitestOnJest.diagnostics.every(
      (diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code) !==
        "vitest/no-import-node-test",
    ),
    "Vitest-specific runner imports must not be inferred from a Jest fixture",
  );
  const jestOnVitest = parseOxlintJson(
    runOxlint(jestConfig, ["fixtures/rules/vitest/invalid.ts"]),
  );
  assert(
    jestOnVitest.diagnostics.every(
      (diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code) !== "jest/no-jasmine-globals",
    ),
    "Jest-specific Jasmine usage must not be inferred from a Vitest fixture",
  );

  const unsupportedConfig = writeConfig("unsupported", {
    rules: { "not-a-real-plugin/not-a-real-rule": "error" },
  });
  const unsupported = runOxlint(unsupportedConfig, [
    "fixtures/rules/core/valid.ts",
  ]);
  assert.equal(unsupported.kind, "configuration");
  assert.match(
    `${unsupported.stdout}\n${unsupported.stderr}`,
    /not-a-real-rule|not-a-real-plugin|Failed to (?:load|parse)|unknown/u,
  );

  const timedOut = runProcess(
    process.execPath,
    ["-e", "setInterval(() => {}, 1_000)"],
    { cwd: repositoryRoot, timeout: 20 },
  );
  assert.equal(timedOut.kind, "timeout");
  const crashed = runProcess(
    process.execPath,
    ["-e", 'process.kill(process.pid, "SIGTERM")'],
    { cwd: repositoryRoot },
  );
  assert.equal(crashed.kind, "crash");

  const snapshots = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, "fixtures/snapshots/effective-configs.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  for (const artifact of allConfigArtifacts()) {
    const configPath = writeConfig(
      `print-${artifact.publicName}`,
      artifact.config,
    );
    const printed = runProcess(
      oxlint,
      [
        "--config",
        configPath,
        "--print-config",
        artifact.typeAware
          ? "fixtures/rules/typescript-type-aware/valid.ts"
          : "fixtures/rules/typescript-syntax/valid.ts",
      ],
      { cwd: repositoryRoot },
    );
    assert.equal(printed.kind, "success");
    const effective = JSON.parse(printed.stdout) as Record<string, unknown>;
    const projection = {
      categories: effective.categories,
      options: effective.options,
      plugins: Array.isArray(effective.plugins)
        ? effective.plugins.toSorted((left, right) =>
            String(left).localeCompare(String(right)),
          )
        : effective.plugins,
      rules: effective.rules,
    };
    assert.deepEqual(
      projection,
      snapshots[artifact.publicName],
      `${artifact.publicName} --print-config snapshot must be current`,
    );
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(
  `Behaviorally verified ${ruleLedger.length} rules across ${profileCases.length} profiles.`,
);

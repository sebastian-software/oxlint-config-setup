import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import type { OxlintConfig } from "oxlint";

import {
  SONARJS_AI_RULES,
  SONARJS_RULES,
  withSonarJS,
} from "../src/sonarjs.js";
import {
  normalizeDiagnosticCode,
  parseOxlintJson,
  runProcess,
} from "./harness.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const oxlint = resolve(repositoryRoot, "node_modules/.bin/oxlint");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-sonarjs-"));
const disabledCategories = {
  correctness: "off",
  suspicious: "off",
  pedantic: "off",
  perf: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
} as const;
const emptyConfig: OxlintConfig = {
  categories: disabledCategories,
  plugins: [],
  rules: {},
};

function writeConfig(name: string, config: OxlintConfig): string {
  const path = resolve(temporaryRoot, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  return path;
}

function run(config: string, files: readonly string[], fix = false) {
  return runProcess(
    oxlint,
    [
      "--disable-nested-config",
      "--config",
      config,
      "--format",
      "json",
      ...(fix ? ["--fix"] : []),
      ...files,
    ],
    { cwd: repositoryRoot },
  );
}

try {
  const config = withSonarJS(emptyConfig);
  const secondConfig = withSonarJS(emptyConfig);
  const aiConfig = withSonarJS(emptyConfig, true);
  const secondAiConfig = withSonarJS(emptyConfig, true);
  const configPath = writeConfig("sonarjs", config);
  const aiConfigPath = writeConfig("sonarjs-ai", aiConfig);

  assert.deepEqual(config.rules, SONARJS_RULES);
  assert.deepEqual(aiConfig.rules, {
    ...SONARJS_RULES,
    ...SONARJS_AI_RULES,
  });
  assert.equal(Object.keys(SONARJS_RULES).length, 13);
  assert.equal(Object.keys(SONARJS_AI_RULES).length, 6);
  assert.deepEqual(
    config.jsPlugins?.map((plugin) =>
      typeof plugin === "string" ? plugin : plugin.name,
    ),
    ["sonarjs"],
  );
  assert.notEqual(config.rules, secondConfig.rules);
  assert.notEqual(config.jsPlugins, secondConfig.jsPlugins);
  assert.notEqual(
    aiConfig.rules?.["sonarjs/max-union-size"],
    secondAiConfig.rules?.["sonarjs/max-union-size"],
  );

  const valid = parseOxlintJson(
    run(configPath, ["fixtures/rules/sonarjs/valid.ts"]),
  );
  assert.deepEqual(valid.diagnostics, []);

  const invalid = parseOxlintJson(
    run(configPath, ["fixtures/rules/sonarjs/invalid.ts"]),
  );
  assert.equal(invalid.diagnostics.length, 2);
  assert.deepEqual(
    new Set(
      invalid.diagnostics.map((diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code),
      ),
    ),
    new Set(["sonarjs/no-duplicated-branches"]),
  );
  assert(
    invalid.diagnostics.every(
      (diagnostic) => diagnostic.severity === "error",
    ),
  );

  const nativeOverlap = parseOxlintJson(
    run(configPath, ["fixtures/rules/sonarjs/native-overlap.ts"]),
  );
  assert.deepEqual(
    nativeOverlap.diagnostics,
    [],
    "the SonarJS branch owner must not report native shared-prefix cases",
  );
  const nativeConfigPath = writeConfig("native-overlap", {
    ...emptyConfig,
    plugins: ["oxc"],
    rules: { "oxc/branches-sharing-code": "error" },
  });
  const native = parseOxlintJson(
    run(nativeConfigPath, ["fixtures/rules/sonarjs/native-overlap.ts"]),
  );
  assert.deepEqual(
    new Set(
      native.diagnostics.map((diagnostic) =>
        normalizeDiagnosticCode(diagnostic.code),
      ),
    ),
    new Set(["oxc/branches-sharing-code"]),
  );

  const ternaryGap = parseOxlintJson(
    run(configPath, ["fixtures/rules/sonarjs/ternary-gap.ts"]),
  );

  const baseAiFixture = parseOxlintJson(
    run(configPath, ["fixtures/rules/sonarjs/ai-invalid.ts"]),
  );
  assert.deepEqual(
    baseAiFixture.diagnostics,
    [],
    "AI-only SonarJS rules must not leak into the base policy",
  );
  const aiInvalid = parseOxlintJson(
    run(aiConfigPath, ["fixtures/rules/sonarjs/ai-invalid.ts"]),
  );
  assert.deepEqual(
    aiInvalid.diagnostics.map((diagnostic) =>
      normalizeDiagnosticCode(diagnostic.code),
    ),
    ["sonarjs/no-nested-switch"],
  );
  assert.equal(aiInvalid.diagnostics[0]?.severity, "error");
  assert.deepEqual(
    ternaryGap.diagnostics,
    [],
    "the selected pairwise rule intentionally leaves ternaries to a future non-overlapping owner",
  );

  const fixTarget = resolve(temporaryRoot, "invalid.ts");
  const invalidSource = readFileSync(
    resolve(repositoryRoot, "fixtures/rules/sonarjs/invalid.ts"),
    "utf8",
  );
  writeFileSync(fixTarget, invalidSource);
  parseOxlintJson(run(configPath, [fixTarget], true));
  assert.equal(
    readFileSync(fixTarget, "utf8"),
    invalidSource,
    "the selected rule must not mutate duplicated branch bodies",
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log("Syntax-only SonarJS parity, AI policy, and fixer safety verified.");

import assert from "node:assert/strict";

import type { OxlintConfig } from "oxlint";

import { composeProfiles } from "../src/profiles.js";
import {
  addRule,
  configureRule,
  disableAllRulesBut,
  disableRule,
  setRuleSeverity,
} from "../src/rule-helpers.js";

function exampleConfig(): OxlintConfig {
  return {
    rules: {
      complexity: ["error", 10],
      "no-console": "error",
      "no-var": "warn",
    },
    overrides: [
      {
        files: ["**/*.test.ts"],
        rules: {
          complexity: ["warn", 20],
          "no-console": "off",
        },
      },
    ],
  };
}

{
  const config = exampleConfig();
  setRuleSeverity(config, "complexity", "warn");
  assert.deepEqual(config.rules?.complexity, ["warn", 10]);
  assert.deepEqual(config.overrides?.[0]?.rules?.complexity, ["warn", 20]);
  setRuleSeverity(config, "missing-rule", "error");
  assert.equal(config.rules?.["missing-rule"], undefined);
}

{
  const config = exampleConfig();
  configureRule(config, "complexity", [{ max: 30 }]);
  assert.deepEqual(config.rules?.complexity, ["error", { max: 30 }]);
  assert.deepEqual(config.overrides?.[0]?.rules?.complexity, [
    "warn",
    { max: 30 },
  ]);
  configureRule(config, "no-console", [{ allow: ["warn"] }]);
  assert.deepEqual(config.rules?.["no-console"], [
    "error",
    { allow: ["warn"] },
  ]);
}

{
  const config = exampleConfig();
  disableRule(config, "complexity");
  assert.equal(config.rules?.complexity, "off");
  assert.equal(config.overrides?.[0]?.rules?.complexity, "off");
  disableRule(config, "complexity");
  assert.equal(config.rules?.complexity, "off");
}

{
  const config: OxlintConfig = {};
  addRule(config, "no-alert", "error");
  addRule(config, "complexity", "warn", [5]);
  assert.equal(config.rules?.["no-alert"], "error");
  assert.deepEqual(config.rules?.complexity, ["warn", 5]);
}

{
  const config = exampleConfig();
  disableAllRulesBut(config, "complexity");
  assert.deepEqual(config.rules?.complexity, ["error", 10]);
  assert.equal(config.rules?.["no-console"], "off");
  assert.equal(config.rules?.["no-var"], "off");
  assert.deepEqual(config.overrides?.[0]?.rules?.complexity, ["warn", 20]);
  assert.equal(config.overrides?.[0]?.rules?.["no-console"], "off");
}

{
  const withoutAi = composeProfiles(["core"], { level: "essential" });
  const withAi = composeProfiles(["core"], {
    ai: true,
    level: "essential",
  });
  assert.equal(withoutAi.rules?.["eslint/valid-typeof"], "error");
  assert.deepEqual(withAi.rules?.["eslint/valid-typeof"], [
    "error",
    { requireStringLiterals: true },
  ]);
}

console.log("Rule customization helpers and AI reuse verified.");

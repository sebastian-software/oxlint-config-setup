import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");

function read(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

const manifest = JSON.parse(read("package.json")) as {
  peerDependencies?: Record<string, string>;
  publishConfig?: Record<string, unknown>;
};
assert.deepEqual(manifest.peerDependencies, {
  oxlint: "1.77.0",
  "oxlint-tsgolint": "7.0.2001",
});
assert.deepEqual(manifest.publishConfig, {
  access: "public",
  provenance: true,
});

const contributing = read("CONTRIBUTING.md");
assert.match(contributing, /US English \(`en-US`\)/u);
assert.match(contributing, /ADRs are living records/iu);

const adrConvention = read("docs/adr/README.md");
assert.match(adrConvention, /living, mutable records/iu);
assert.match(adrConvention, /update the existing ADR in place/iu);
assert.doesNotMatch(adrConvention, /0013/u);

const projectLanguageDecision = read(
  "docs/adr/0006-use-us-english-as-the-project-language.md",
);
assert.match(projectLanguageDecision, /\*\*Status:\*\* Accepted/u);
assert.match(projectLanguageDecision, /US English \(`en-US`\)/u);

const nodeLtsDecision = read("docs/adr/0010-require-node-24-lts.md");
assert.match(nodeLtsDecision, /\*\*Status:\*\* Accepted/u);
assert.match(nodeLtsDecision, /before the initial\nnpm publication/u);
assert.doesNotMatch(nodeLtsDecision, /is still an unpublished beta/u);

const configLevelDecision = read(
  "docs/adr/0007-add-essential-and-standard-config-levels.md",
);
assert.match(configLevelDecision, /\*\*Status:\*\* Superseded/u);
assert.match(configLevelDecision, /ADR 0008/u);

const policyAndAiDecision = read(
  "docs/adr/0008-separate-policy-levels-from-ai-guardrails.md",
);
assert.match(policyAndAiDecision, /\*\*Status:\*\* Accepted/u);
assert.match(policyAndAiDecision, /three nested policy levels/iu);
assert.match(policyAndAiDecision, /AI is an overlay/u);

assert.match(policyAndAiDecision, /`correctness` category/u);
assert.match(policyAndAiDecision, /`suspicious` and `perf`/u);
assert.match(policyAndAiDecision, /nursery.*stays disabled/su);

const closedV01Contract = read(
  "docs/rfcs/0003-close-the-v01-configuration-contract.md",
);
assert.match(closedV01Contract, /\*\*Status:\*\* Accepted and implemented/u);
assert.match(closedV01Contract, /Levels control membership only/u);
assert.match(closedV01Contract, /no cross-host millisecond SLA/u);

const ruleCustomizationContract = read(
  "docs/rfcs/0004-add-rule-customization-helpers.md",
);
assert.match(
  ruleCustomizationContract,
  /\*\*Status:\*\* Superseded by \[RFC 0005\]/u,
);
const mergedRuleOptionsContract = read(
  "docs/rfcs/0005-merge-rule-option-updates.md",
);
assert.match(
  mergedRuleOptionsContract,
  /\*\*Status:\*\* Accepted and implemented/u,
);
assert.match(mergedRuleOptionsContract, /merged recursively/u);
assert.match(
  mergedRuleOptionsContract,
  /including arrays, scalars, and `null`/u,
);

const readme = read("README.md");
assert.match(readme, /113 active base rules/iu);
assert.match(readme, /484 at Strict/iu);
assert.match(readme, /mapped about 85\.3%/iu);
assert.match(readme, /level: "essential"/u);
assert.match(readme, /level: "strict"/u);
assert.match(readme, /never activates a level-controlled rule/iu);
for (const helper of [
  "setRuleSeverity",
  "configureRule",
  "disableRule",
  "addRule",
  "disableAllRulesBut",
]) {
  assert.match(readme, new RegExp(helper, "u"));
}
for (const surface of [
  "getOxlintConfig",
  "getSyntaxOnlyOxlintConfig",
  "getVitestOxlintConfig",
  "getJestOxlintConfig",
  "getExperimentalReactCompilerOxlintConfig",
]) {
  assert.match(readme, new RegExp(surface, "u"));
}

const migration = read("docs/migration.md");
for (const assignment of [
  "Oxlint",
  "Companion tool",
  "Research",
  "Accepted gap",
]) {
  assert.match(migration, new RegExp("\\|\\s+" + assignment + "\\s+\\|", "u"));
}
for (const concern of [
  "JavaScript correctness",
  "TypeScript syntax",
  "TypeScript semantics",
  "Imports and modules",
  "React and JSX",
  "React ESLint ecosystems",
  "Node.js",
  "Vitest",
  "Jest",
  "Regular expressions",
  "Testing Library",
  "Playwright",
  "Storybook",
  "SonarJS",
  "Sorting and formatting",
  "JSON and package metadata",
  "Markdown and MDX",
  "Spelling",
  "AI-assisted development",
]) {
  assert.match(migration, new RegExp(concern.replace(".", "\\."), "u"));
}

const review = read("docs/release-review.md");
assert.match(review, /\*\*Review status:\*\* \*\*Complete\*\*/u);
for (const decision of ["KEEP", "ADJUST", "DEFER"]) {
  assert.match(review, new RegExp(`\\| ${decision} \\|`, "u"));
}

const notes = read("docs/releases/v0.1.0-beta.1.md");
assert.match(notes, /Stable surfaces/u);
assert.match(notes, /Experimental surface/u);
assert.match(notes, /Known gaps/u);

const compatibility = read("docs/compatibility.md");
for (const version of ["1.77.0", "7.0.2001", "7.0.2", "11.20.0"]) {
  assert.match(compatibility, new RegExp(version.replaceAll(".", "\\."), "u"));
}

console.log("v0.1 beta release review and documentation gate verified.");

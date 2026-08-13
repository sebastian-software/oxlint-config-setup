import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "yaml";

import { ruleLedger } from "../src/ledger.js";
import {
  expectedInstallCommand,
  expectedPackageManager,
  expectedPeerDependencies,
  expectedVersions,
} from "./expected-toolchain.js";

const repositoryRoot = resolve(import.meta.dirname, "..");

function read(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

type YamlRecord = Record<string, unknown>;

function asRecord(value: unknown, description: string): YamlRecord {
  assert.ok(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${description} must be a YAML mapping`,
  );
  return value as YamlRecord;
}

function asArray(value: unknown, description: string): unknown[] {
  assert.ok(Array.isArray(value), `${description} must be a YAML sequence`);
  return value;
}

function asString(value: unknown, description: string): string {
  assert.equal(typeof value, "string", `${description} must be a string`);
  return value as string;
}

function asNumber(value: unknown, description: string): number {
  assert.equal(typeof value, "number", `${description} must be a number`);
  return value as number;
}

const generatedStats = asRecord(
  JSON.parse(read("docs/app/generated/config-stats.json")) as unknown,
  "generated configuration stats",
);
const generatedConfigurations = asArray(
  generatedStats.configurations,
  "generated configuration stats configurations",
);

function baseRuleCount(level: string): number {
  for (const [index, value] of generatedConfigurations.entries()) {
    const configuration = asRecord(
      value,
      `generated configuration stats configurations[${index}]`,
    );
    const selection = asRecord(
      configuration.selection,
      `generated configuration stats configurations[${index}].selection`,
    );
    if (
      selection.level === level &&
      selection.react === false &&
      selection.node === false &&
      selection.ai === false
    ) {
      return asNumber(
        configuration.activeRules,
        `generated configuration stats configurations[${index}].activeRules`,
      );
    }
  }
  throw new Error(`Missing generated base configuration stats for ${level}`);
}

function section(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

function readWorkflow(relativePath: string): YamlRecord {
  const document = parseDocument(read(relativePath), { uniqueKeys: true });
  assert.equal(
    document.errors.length,
    0,
    `${relativePath} must be valid YAML: ${document.errors.map(String).join("; ")}`,
  );
  return asRecord(document.toJS(), relativePath);
}

const manifest = JSON.parse(read("package.json")) as {
  devDependencies?: Record<string, string>;
  packageManager?: string;
  peerDependencies?: Record<string, string>;
  publishConfig?: Record<string, unknown>;
};
assert.deepEqual(manifest.peerDependencies, expectedPeerDependencies);
assert.equal(
  manifest.devDependencies?.oxlint,
  expectedPeerDependencies.oxlint,
);
assert.equal(
  manifest.devDependencies?.["oxlint-tsgolint"],
  expectedPeerDependencies["oxlint-tsgolint"],
);
assert.equal(manifest.devDependencies?.typescript, expectedVersions.typescript);
assert.equal(manifest.packageManager, expectedPackageManager);
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
assert.match(
  adrConvention,
  /0013-release-coordinated-toolchain-pins\.md/u,
);

const toolchainPolicyDecision = read(
  "docs/adr/0013-release-coordinated-toolchain-pins.md",
);
assert.match(toolchainPolicyDecision, /\*\*Status:\*\* Accepted/u);
assert.match(toolchainPolicyDecision, /exact, coordinated.*peer versions/su);
assert.match(
  toolchainPolicyDecision,
  /canary tests the latest upstream.*without changing the supported pair/su,
);

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
const essentialRuleCount = baseRuleCount("essential");
const recommendedRuleCount = baseRuleCount("recommended");
const strictRuleCount = baseRuleCount("strict");
assert.ok(
  readme.includes(
    `materializes ${essentialRuleCount} native active base rules at\nEssential, ${recommendedRuleCount} at Recommended, and ${strictRuleCount} at Strict`,
  ),
  "README native rule counts must match generated configuration stats",
);
assert.ok(
  readme.includes(`owns ${ruleLedger.length} curated ledger entries`),
  "README curated ledger count must match src/ledger.ts",
);
assert.ok(
  readme.includes(expectedInstallCommand),
  "README install command must match the expected toolchain",
);
assert.match(readme, /one exact, coordinated\npeer pair/u);
assert.match(readme, /ADR 0013/u);
const supportedMatrix = section(
  readme,
  "## Supported matrix",
  "## Project documents",
);
for (const version of [
  expectedVersions.node,
  expectedVersions.oxlint,
  expectedVersions.oxlintTsgolint,
  expectedVersions.typescript,
  expectedVersions.testingLibrary,
  expectedVersions.playwright,
  expectedVersions.storybook,
  expectedVersions.sonarjs,
  expectedVersions.eslint,
  expectedVersions.pnpm,
]) {
  assert.ok(
    supportedMatrix.includes(version),
    `README supported matrix must include ${version}`,
  );
}
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
  "getComposedOxlintConfig",
  "getSyntaxOnlyOxlintConfig",
  "getExperimentalReactCompilerOxlintConfig",
]) {
  assert.match(readme, new RegExp(surface, "u"));
}

const migration = read("docs/migration.md");
assert.ok(
  migration.includes(`all ${ruleLedger.length} curated ledger entries`),
  "migration guide curated ledger count must match src/ledger.ts",
);
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

const adoption = read("docs/adoption.md");
assert.ok(
  adoption.includes(expectedInstallCommand),
  "adoption guide install command must match the expected toolchain",
);
assert.ok(
  adoption.includes(`Node.js \`${expectedVersions.node}\` or later`),
  "adoption guide Node.js requirement must match the expected toolchain",
);

const review = read("docs/release-review.md");
assert.match(review, /\*\*Review status:\*\* \*\*Complete\*\*/u);
for (const decision of ["KEEP", "ADJUST", "DEFER"]) {
  assert.match(review, new RegExp(`\\| ${decision} \\|`, "u"));
}

const notes = read("docs/releases/v0.1.0-beta.1.md");
assert.match(notes, /Stable surfaces/u);
assert.match(notes, /Experimental surface/u);
assert.match(notes, /Known gaps/u);

assert.match(readme, /npm Trusted Publishing with GitHub Actions OIDC/u);
assert.match(readme, /Published npm versions are immutable/u);
assert.match(readme, /follow-up patch release/u);
assert.match(readme, /Package \/ Required/u);

const publishWorkflow = read(".github/workflows/publish.yml");
assert.match(publishWorkflow, /Verify published npm artifact/u);
assert.match(publishWorkflow, /timeout-minutes: 15/u);
assert.match(publishWorkflow, /tsx scripts\/verify-published-package\.ts/u);
assert.match(publishWorkflow, /npm publish --access public --provenance/u);
assert.match(publishWorkflow, /already exists in npm; preserving the immutable/u);

const releasePleaseAction =
  "googleapis/release-please-action@0dfd8538845b8e92600d271a895a5372865d4062";
const publishJobs = asRecord(
  readWorkflow(".github/workflows/publish.yml").jobs,
  "publish workflow jobs",
);
const releasePleaseJob = asRecord(
  publishJobs["release-please"],
  "publish workflow release-please job",
);
const releasePleaseSteps = asArray(
  releasePleaseJob.steps,
  "publish workflow release-please job steps",
);
const releasePleaseStepsByAction = releasePleaseSteps.filter((step) => {
  const stepRecord = asRecord(step, "publish workflow release-please step");
  return stepRecord.uses === releasePleaseAction;
});
assert.equal(
  releasePleaseStepsByAction.length,
  1,
  "publish workflow must have exactly one pinned Release Please action step",
);
const releasePleaseInputs = asRecord(
  asRecord(
    releasePleaseStepsByAction[0],
    "pinned Release Please action step",
  ).with,
  "pinned Release Please action inputs",
);
assert.equal(
  releasePleaseInputs.token,
  "${{ secrets.RELEASE_PLEASE_TOKEN }}",
  "pinned Release Please action must use only the dedicated release token",
);

const packageJobs = asRecord(
  readWorkflow(".github/workflows/package.yml").jobs,
  "Package workflow jobs",
);
const packageVerifyJob = asRecord(
  packageJobs.verify,
  "Package verify job",
);
const packageVerifyStrategy = asRecord(
  packageVerifyJob.strategy,
  "Package verify job strategy",
);
const packageVerifyMatrix = asRecord(
  packageVerifyStrategy.matrix,
  "Package verify job matrix",
);
const packageVerifyRows = asArray(
  packageVerifyMatrix.include,
  "Package verify job matrix include",
);
assert.equal(packageVerifyRows.length, 2);
for (const [index, value] of packageVerifyRows.entries()) {
  const row = asRecord(value, `Package verify job matrix include[${index}]`);
  assert.equal(row.oxlint, expectedVersions.oxlint);
  assert.equal(row.tsgolint, expectedVersions.oxlintTsgolint);
  assert.equal(row.typescript, expectedVersions.typescript);
  assert.equal(row.pnpm, expectedVersions.pnpm);
}
const requiredPackageJob = asRecord(
  packageJobs.required,
  "Package required job",
);
assert.equal(requiredPackageJob.name, "Required");
assert.equal(requiredPackageJob.if, "${{ always() }}");
const requiredPackageNeeds = asArray(
  requiredPackageJob.needs,
  "Package required job needs",
).map((need, index) => asString(need, `Package required job needs[${index}]`));
const blockingPackageJobs = Object.keys(packageJobs)
  .filter((jobName) => jobName !== "required")
  .sort();
assert.deepEqual(
  [...requiredPackageNeeds].sort(),
  blockingPackageJobs,
  "Package required job must wait for every blocking Package job",
);

const requiredPackageSteps = asArray(
  requiredPackageJob.steps,
  "Package required job steps",
);
assert.equal(requiredPackageSteps.length, 1);
const requiredPackageGate = asRecord(
  requiredPackageSteps[0],
  "Package required job gate step",
);
const requiredPackageGateEnvironment = asRecord(
  requiredPackageGate.env,
  "Package required job gate environment",
);
const requiredPackageGateRun = asString(
  requiredPackageGate.run,
  "Package required job gate script",
);
const expectedResultVariables = requiredPackageNeeds.map(
  (jobName) => `${jobName.toUpperCase()}_RESULT`,
);
for (const [index, jobName] of requiredPackageNeeds.entries()) {
  const resultVariable = expectedResultVariables[index];
  assert.equal(
    requiredPackageGateEnvironment[resultVariable],
    `\${{ needs.${jobName}.result }}`,
    `Package required job must read ${jobName}'s result`,
  );
}
assert.ok(
  requiredPackageGateRun.includes(
    `for result_name in ${expectedResultVariables.join(" ")}; do`,
  ),
  "Package required job must evaluate every blocking job result",
);
assert.ok(
  requiredPackageGateRun.includes('if [ "$result" != "success" ]; then'),
  "Package required job must fail for a non-success result",
);

const releaseAutomation = read("docs/release-automation.md");
for (const requiredText of [
  "RELEASE_PLEASE_TOKEN",
  "fine-grained personal access token",
  "Issues: Read and write",
  "Package / Required",
  "pnpm run release:check",
  "OIDC Trusted Publishing",
]) {
  assert.match(releaseAutomation, new RegExp(requiredText, "u"));
}

const publishedPackageVerifier = read("scripts/verify-published-package.ts");
assert.match(
  publishedPackageVerifier,
  /preparePublishedPackageBaseline\(\)/u,
);
assert.match(
  read("scripts/test-published-package-verifier.ts"),
  /Fresh published-package baseline includes the built dist artifact/u,
);
assert.match(
  read("scripts/test-published-package-timeouts.ts"),
  /Published-package timeout guards fail stalled operations promptly/u,
);

const compatibility = read("docs/compatibility.md");
for (const version of [
  expectedVersions.node,
  expectedVersions.oxlint,
  expectedVersions.oxlintTsgolint,
  expectedVersions.typescript,
  expectedVersions.testingLibrary,
  expectedVersions.playwright,
  expectedVersions.storybook,
  expectedVersions.sonarjs,
  expectedVersions.eslint,
  expectedVersions.pnpm,
]) {
  assert.match(compatibility, new RegExp(version.replaceAll(".", "\\."), "u"));
}
assert.match(compatibility, /one exact, coordinated Oxlint/iu);
assert.match(compatibility, /ADR 0013/u);

const upstreamCanary = read(".github/workflows/upstream-canary.yml");
assert.doesNotMatch(upstreamCanary, /pnpm: latest/u);
const upstreamCanaryPnpmVersions = [
  ...upstreamCanary.matchAll(/^\s+pnpm: (\S+)$/gmu),
].map(([, version]) => version);
assert.equal(upstreamCanaryPnpmVersions.length, 2);
assert.deepEqual(
  [...new Set(upstreamCanaryPnpmVersions)],
  [expectedVersions.pnpm],
  "upstream canary must use the pinned repository pnpm in both matrix rows",
);

assert.doesNotMatch(
  read("docs/release-review.md"),
  /DEFER \| Expanded version ranges/u,
);

console.log("v0.1 beta release review and documentation gate verified.");

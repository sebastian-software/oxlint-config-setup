import assert from "node:assert/strict";

import { aggregateReports, checkpointReports, classifyDeltas, corpusProjects, currentCheckoutRevision, deltaClassifications, loadCheckpointReports, normalizeEslintDiagnostics, normalizeOxlintDiagnostics, normalizeFilename, probeFixes, scorecard, validateProjectPaths } from "./differential-corpus.js";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

assert.equal(corpusProjects.length, 5, "the corpus must retain all required project classes");
assert.equal(new Set(corpusProjects.map((project) => project.revision)).size, 5, "every public source revision must be pinned independently");
assert.deepEqual(deltaClassifications, ["native coverage", "optional-plugin candidate", "companion-tool concern", "accepted gap", "defect"]);

const eslint = normalizeEslintDiagnostics([{ filePath: "/corpus/src/example.ts", messages: [{ column: 1, fix: { range: [0, 1] }, line: 2, ruleId: "@typescript-eslint/no-floating-promises", severity: 2 }, { column: 4, line: 3, ruleId: "testing-library/await-async-utils", severity: 1 }] }], "/corpus");
const oxlint = normalizeOxlintDiagnostics({ diagnostics: [{ code: "typescript(no-floating-promises)", filename: "/corpus/src/example.ts", labels: [{ span: { column: 1, line: 2 } }], severity: "error" }, { code: "eslint(no-debugger)", filename: "/corpus/src/example.ts", labels: [{ span: { column: 1, line: 7 } }], severity: "error" }] }, "/corpus");
const comparison = classifyDeltas(eslint, oxlint);
assert.equal(comparison.matched, 1);
assert.deepEqual(comparison.deltas.map((delta) => [delta.kind, delta.classification]), [["eslint-only", "review-required"], ["oxlint-only", "review-required"]]);
assert(comparison.deltas.every((delta) => delta.adjudication.falsePositive === "review-required" && delta.adjudication.suppression === "review-required"), "unknown deltas must require an explicit human decision");
const currentRevision = currentCheckoutRevision();
assert.match(currentRevision, /^[0-9a-f]{40}$/u, "the report must use the current checkout's full Git revision");
const markdown = scorecard([{ deltas: comparison.deltas, diagnostics: { eslint, oxlint }, id: "fixture", matched: comparison.matched, outcome: "complete", suppressions: [], timings: { eslint: { coldMs: 10, warmMs: 5 }, oxlint: { coldMs: 3, warmMs: 2 } } }], { oxlintConfigSetup: currentRevision, predecessor: "predecessor-fixture" });
assert.match(markdown, /\| fixture \| 1 \| 1 \| 1 \| 10\/5 ms \| 3\/2 ms \|/u);
assert.match(markdown, /review-required/u);
assert(markdown.includes(`Oxlint Config Setup: \`${currentRevision}\``));
assert.equal(normalizeEslintDiagnostics([{ filePath: "/corpus/src/invalid.ts", messages: [{ column: 1, line: 1, ruleId: null, severity: 2 }] }], "/corpus")[0]?.defectClass, "predecessor parser-service incompatibility");
assert.equal(normalizeFilename("/corpus", "src/example.ts"), "src/example.ts");
assert.equal(normalizeFilename("/corpus", "/corpus/src/example.ts"), "src/example.ts");
assert.equal(normalizeFilename("C:\\corpus", "C:\\corpus\\src\\example.ts"), "src/example.ts");

const collidingEslint = [eslint[0]!, eslint[0]!];
const collidingOxlint = [oxlint[0]!, oxlint[0]!];
const collidingComparison = classifyDeltas(collidingEslint, collidingOxlint);
assert.equal(collidingComparison.matched, 2, "colliding diagnostics must match one-for-one");
assert.deepEqual(collidingComparison.deltas, [], "fully matched colliding diagnostics must not be discarded as deltas");

const temporaryProject = resolve(tmpdir(), "oxlint-corpus-path-test");
rmSync(temporaryProject, { force: true, recursive: true });

const checkpointRoot = resolve(tmpdir(), "oxlint-corpus-checkpoint-test");
rmSync(checkpointRoot, { force: true, recursive: true });
checkpointReports(checkpointRoot, [{ deltas: [], diagnostics: { eslint: [], oxlint: [] }, failure: "simulated preparation failure", id: "failed-project", matched: 0, outcome: "failed", suppressions: [], timings: { eslint: { coldMs: 0, warmMs: 0 }, oxlint: { coldMs: 0, warmMs: 0 } } }], { oxlintConfigSetup: currentRevision, predecessor: "predecessor-fixture" }, { eslint: "unavailable", host: "fixture", node: "fixture", oxlint: "fixture", pnpm: "fixture", tsgolint: "fixture", typescript: "fixture" });
assert.match(readFileSync(resolve(checkpointRoot, "report.json"), "utf8"), /simulated preparation failure/u);
assert.match(readFileSync(resolve(checkpointRoot, "scorecard.md"), "utf8"), /failed-project \(failed\)/u);
assert.equal(loadCheckpointReports(checkpointRoot, { oxlintConfigSetup: currentRevision, predecessor: "predecessor-fixture" }).length, 1, "a checkpoint can be resumed");
const resumed = aggregateReports(loadCheckpointReports(checkpointRoot, { oxlintConfigSetup: currentRevision, predecessor: "predecessor-fixture" }), [{ deltas: [], diagnostics: { eslint: [], oxlint: [] }, id: "vitest", matched: 0, outcome: "complete", suppressions: [], timings: { eslint: { coldMs: 1, warmMs: 1 }, oxlint: { coldMs: 1, warmMs: 1 } } }]);
assert.deepEqual(resumed.map((report) => report.id), ["vitest", "failed-project"].filter((id) => corpusProjects.some((project) => project.id === id)), "aggregation retains only manifest projects in manifest order");
rmSync(checkpointRoot, { force: true, recursive: true });
mkdirSync(temporaryProject, { recursive: true });
writeFileSync(resolve(temporaryProject, "present.ts"), "export {};\n");
const fixProbe = probeFixes(process.execPath, ["-e", "require('node:fs').writeFileSync(process.argv.at(-1), 'fixed\\n')"], temporaryProject, ["present.ts"], "--");
assert.deepEqual(fixProbe, { availability: "available", changedFiles: 1, equivalence: "not-reviewed", probe: "completed", safety: "not-reviewed" }, "fix probing must write only to a disposable copy");
assert.equal(readFileSync(resolve(temporaryProject, "present.ts"), "utf8"), "export {};\n", "fix probing must not modify corpus source");
validateProjectPaths({ ...corpusProjects[0]!, paths: ["present.ts"] }, temporaryProject);
assert.throws(() => validateProjectPaths({ ...corpusProjects[0]!, paths: ["missing.ts"] }, temporaryProject), /missing pinned paths/u);
rmSync(temporaryProject, { force: true, recursive: true });

console.log("Differential corpus normalization checks passed.");

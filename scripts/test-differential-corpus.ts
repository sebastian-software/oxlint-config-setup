import assert from "node:assert/strict";

import { classifyDeltas, corpusProjects, currentCheckoutRevision, deltaClassifications, normalizeEslintDiagnostics, normalizeOxlintDiagnostics, scorecard } from "./differential-corpus.js";

assert.equal(corpusProjects.length, 5, "the corpus must retain all required project classes");
assert.equal(new Set(corpusProjects.map((project) => project.revision)).size, 5, "every public source revision must be pinned independently");
assert.deepEqual(deltaClassifications, ["native coverage", "optional-plugin candidate", "companion-tool concern", "accepted gap", "defect"]);

const eslint = normalizeEslintDiagnostics([{ filePath: "/corpus/src/example.ts", messages: [{ column: 1, fix: { range: [0, 1] }, line: 2, ruleId: "@typescript-eslint/no-floating-promises", severity: 2 }, { column: 4, line: 3, ruleId: "testing-library/await-async-utils", severity: 1 }] }], "/corpus");
const oxlint = normalizeOxlintDiagnostics({ diagnostics: [{ code: "typescript(no-floating-promises)", filename: "/corpus/src/example.ts", labels: [{ span: { column: 1, line: 2 } }], severity: "error" }, { code: "eslint(no-debugger)", filename: "/corpus/src/example.ts", labels: [{ span: { column: 1, line: 7 } }], severity: "error" }] }, "/corpus");
const comparison = classifyDeltas(eslint, oxlint);
assert.equal(comparison.matched, 1);
assert.deepEqual(comparison.deltas.map((delta) => [delta.kind, delta.classification]), [["eslint-only", "optional-plugin candidate"], ["oxlint-only", "native coverage"]]);
const currentRevision = currentCheckoutRevision();
assert.match(currentRevision, /^[0-9a-f]{40}$/u, "the report must use the current checkout's full Git revision");
const markdown = scorecard([{ deltas: comparison.deltas, diagnostics: { eslint, oxlint }, id: "fixture", matched: comparison.matched, timings: { eslint: { coldMs: 10, warmMs: 5 }, oxlint: { coldMs: 3, warmMs: 2 } } }], { oxlintConfigSetup: currentRevision, predecessor: "predecessor-fixture" });
assert.match(markdown, /\| fixture \| 1 \| 1 \| 1 \| 10\/5 ms \| 3\/2 ms \|/u);
assert.match(markdown, /optional-plugin candidate/u);
assert(markdown.includes(`Oxlint Config Setup: \`${currentRevision}\``));
assert.deepEqual(normalizeEslintDiagnostics([{ filePath: "/corpus/src/invalid.ts", messages: [{ column: 1, line: 1, ruleId: null, severity: 2 }] }], "/corpus")[0]?.classification, "defect");

const collidingEslint = [eslint[0]!, eslint[0]!];
const collidingOxlint = [oxlint[0]!, oxlint[0]!];
const collidingComparison = classifyDeltas(collidingEslint, collidingOxlint);
assert.equal(collidingComparison.matched, 2, "colliding diagnostics must match one-for-one");
assert.deepEqual(collidingComparison.deltas, [], "fully matched colliding diagnostics must not be discarded as deltas");

console.log("Differential corpus normalization checks passed.");

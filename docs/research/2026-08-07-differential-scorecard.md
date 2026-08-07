# Reviewed real-project differential scorecard

- **Status:** Partial evidence; not migration clearance.
- **Generated source revision:** `d59da95478d3368484ac4fc0ab4866ac6d2730d9`
- **Predecessor revision:** `4543246c62326047f7372765931f260f04beea56`
- **Environment:** Node `v24.18.0`, pnpm `11.20.0`, ESLint `v10.6.0`, Oxlint
  `1.77.0`, tsgolint `7.0.2001`, TypeScript `7.0.2`, Darwin `25.5.0`.

This is the durable review summary from the machine-readable run produced by
`pnpm corpus --prepare --project <id>` for every manifest entry. The complete
local JSON and Markdown artifacts were written to `.corpus/report/` and are
intentionally ignored because they are run-specific and can contain absolute
local paths. No third-party source is committed.

| Project | Outcome | Matched | ESLint only | Oxlint only | Review-required | ESLint cold/warm | Oxlint cold/warm |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| React Testing Library consumer | complete | 0 | 2 | 8 | 8 | 3241.54/2864.68 ms | 352.77/260.87 ms |
| p-queue Node.js library | complete | 0 | 102 | 4 | 103 | 4968.81/3150.8 ms | 308.27/215.28 ms |
| Turborepo React/Node monorepo | complete | 0 | 42 | 38 | 80 | 6450.33/5909.14 ms | 407.02/382.22 ms |
| Vitest | failed | 0 | 0 | 0 | 0 | — | — |
| Playwright | complete | 1 | 882 | 21 | 903 | 4951.42/4579.11 ms | 335.97/379.88 ms |

## Evidence and decisions

The four completed projects preserve individual cold/warm process timings,
normalized diagnostics, and actual Oxlint disposable-copy fix probes. ESLint
fix probes were attempted in equivalent disposable copies but were unavailable
where the predecessor configuration could not resolve from the isolated copy;
their availability remains `unknown`, not `none`.

Every unmatched non-parser diagnostic in this result is `review-required`.
The runner records classification, false-positive confidence, suppression
decision, fix equivalence, and fix safety for each delta. It does not infer an
accepted gap from being ESLint-only, nor native coverage from being Oxlint-only.
The only current recorded decision is the predecessor parser-service failure
class, which is a configuration defect rather than a migration decision.

Vitest is an explicit incomplete-evidence result: the pinned predecessor
configuration fails before diagnostics with `EslintPluginImportResolveError:
node with invalid interface loaded as resolver` under ESLint `10.6.0`. The
runner still emits both artifacts and exits nonzero. This scorecard therefore
does not claim complete corpus coverage or release readiness.

For the corpus protocol, pinned paths, provenance checks, and rerun commands,
see the [real-project differential corpus](2026-08-07-real-project-differential-corpus.md).

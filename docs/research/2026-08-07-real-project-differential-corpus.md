# Real-project ESLint/Oxlint differential corpus

- **Status:** Reproducible evidence protocol
- **Measured tool revisions:** `oxlint-config-setup` `173812f`; `eslint-config-setup` `4543246c62326047f7372765931f260f04beea56`
- **Runner:** `pnpm corpus --prepare`

## Purpose

This corpus replaces rule-identifier mapping as the primary parity signal with
diagnostic, fix, noise, and timing evidence from public projects. It compares
the predecessor's `getEslintConfig()` preset with the generated configuration
in this repository. It does not claim equivalent messages, rule counts, or
custom-format coverage.

The runner writes `report.json` for review tooling and `scorecard.md` for
humans. Both are intentionally generated below ignored `.corpus/report/` and
are not committed: a result is valid only for its recorded source revisions,
tool versions, host, and local checkout state.

## Selection and provenance

Projects are public, permissively accessible Git repositories. The runner
clones each exact commit into ignored `.corpus/projects/`; it never copies or
commits third-party files. The manifest in
[`scripts/differential-corpus.ts`](../../scripts/differential-corpus.ts)
contains the authoritative URL, immutable commit ID, context flags, and the
smallest useful source paths.

| Required evidence | Project and pinned revision | Scoped paths | Why it is included |
| --- | --- | --- | --- |
| React with Testing Library | [`testing-library/react-testing-library`](https://github.com/testing-library/react-testing-library/tree/be9d81d91314c9f0bafaa363f70b409b4b31989c) `be9d81d` | Two React Testing Library implementation modules | Public React library representing the Testing Library ecosystem. |
| Node.js library | [`sindresorhus/p-queue`](https://github.com/sindresorhus/p-queue/tree/180ab9e25cd10b6f548767d7176076b50d25e188) `180ab9e` | Queue entry point and implementation | Small TypeScript Node.js library with a conventional source layout. |
| Mixed React/Node monorepo | [`vercel/turborepo`](https://github.com/vercel/turborepo/tree/a98e5cde97796088c6107684a64a40a967cd1ef0) `a98e5cd` | with-yarn React page, UI component, and Node generator | Preserves workspace and React/Node resolution while limiting noise. |
| Vitest | [`vitest-dev/vitest`](https://github.com/vitest-dev/vitest/tree/c67d296f42f93ec888ff148e821877194969cea9) `c67d296` | Two Vitest Node implementation modules | Maintained implementation of the required runner. |
| Playwright | [`microsoft/playwright`](https://github.com/microsoft/playwright/tree/931121dc6f1ce8d672ce2bd5845220203cb98920) `931121d` | Playwright test runner and fixtures modules | Suitable maintained public Playwright source is available. |

The selected paths deliberately exclude documentation, generated output, lock
files, and package metadata. This is a source-code corpus, not a claim that
Oxlint replaces Markdown, spelling, JSON, or package validation tools.

## Running the corpus

From the repository root, install this repository's pinned dependencies and
build its generated configuration first:

```sh
pnpm install --frozen-lockfile
pnpm corpus --prepare
```

`--prepare` clones the public projects and the predecessor at their pinned
commits, installs the predecessor from its frozen lockfile, and builds its
generated preset. Later runs can reuse those verified checkouts:

```sh
pnpm corpus
```

Use `--corpus-root` to place the ignored checkouts elsewhere and `--output` to
place the two reports elsewhere. Do not point either option at a tracked
directory. Re-run with `--prepare` when a checkout is missing or its commit no
longer matches the manifest.

Each tool runs once cold and once warm for every project. The warm diagnostic
output is normalized into file, line, column, severity, rule, fix availability,
and defect class. Matching requires the same location, severity, and normalized
defect class; message text is not used as a parity proxy.

## Delta decisions and evidence boundary

Every unmatched diagnostic receives exactly one reviewable classification:

| Classification | Meaning |
| --- | --- |
| Native coverage | An Oxlint-only finding from the supported native configuration. |
| Optional-plugin candidate | A testing, Playwright, Storybook, or regexp concern that needs a separate conformance decision. |
| Companion-tool concern | Formatting, spelling, JSON, MDX, package metadata, or ordering concern outside the source-linter boundary. |
| Accepted gap | An ESLint-only concern currently outside the supported native surface. |
| Defect | A manually adjudicated runner/configuration or false-positive defect; add the decision to the report review. |

The report preserves raw rule identity alongside defect classes. Known native
replacement pairs—such as `@typescript-eslint/no-floating-promises` and
`typescript/no-floating-promises`—are grouped together. Unknown pairs remain
`rule:<id>` until a reviewer records a semantic alias; this avoids silently
claiming semantic equivalence from similar messages.

High-severity predecessor classes already have executable native Oxlint evidence
in the repository-owned harness: unhandled promise rejections, duplicate
imports, missing React keys, conditional hooks, CommonJS export reassignment,
and focused Vitest tests. The corpus report is adoption evidence for those
classes; it does not replace their focused fixture evidence. Any predecessor-only
high-severity class found by the corpus must be marked `accepted gap` or
`defect` before it can be treated as a migration decision.

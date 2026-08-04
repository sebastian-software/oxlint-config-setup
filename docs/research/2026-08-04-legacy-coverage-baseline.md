# Legacy coverage baseline

- **Measured:** 2026-08-04
- **Source:** [`sebastian-software/eslint-config-setup`][predecessor]
- **Purpose:** Bound the opportunity for an Oxlint-only successor

## Executive result

The current platform makes an Oxlint-only successor credible, but raw migration
counts do not yet prove a 90% product outcome.

For the predecessor's broad React + Node.js + AI configuration, the automatic
migration surface maps about **85.3% of source-code rule identifiers** after
removing rules for file types Oxlint does not analyze. Nursery rules raise the
discovery ceiling to about **86.0%**. Type-aware Oxlint covers all 55 type-aware
rule identifiers used by this measured preset.

The remaining path to a 90% quality outcome should come from native semantic
replacement, removing low-value or out-of-scope rules, and a few targeted plugin
domains—not from loading JavaScript React plugins for numerical parity.

## Versions

| Component | Version used |
| --- | --- |
| Oxlint | 1.77.0 |
| `@oxlint/migrate` | 1.77.0 |
| `oxlint-tsgolint` | 7.0.2001 |
| TypeScript | 7.0.2 |

The predecessor itself was still pinned to an earlier Oxlint/TypeScript generation
at the time of measurement. This comparison intentionally asks what a new project
can use now, rather than what the existing release lock already generates.

## Input and method

1. Resolve the predecessor preset with its React, Node.js, and AI concerns enabled.
2. Collect unique active rule identifiers after flat-config composition.
3. Classify that same set with `@oxlint/migrate` under increasingly broad modes:
   native stable rules, type-aware rules, automatic JavaScript plugins, and
   nursery rules.
4. Separate rules whose target files are JSON, package JSON, Markdown, or MDX.
   Oxlint's JavaScript-plugin support does not make those custom formats
   executable.
5. Probe the latest type-aware backend with a known unhandled-promise fixture.
6. Audit the predecessor's generated split for duplicate ownership between its
   ESLint and Oxlint halves.

Migration classification was used as a discovery mechanism. This study did not
claim behavioral equivalence for every mapped identifier.

## Results

The broad input contains **785** unique active rule identifiers.

| Discovery mode | Mapped identifiers | Share of all 785 |
| --- | ---: | ---: |
| Native stable rules | 373 | 47.5% |
| Native stable + type-aware | 428 | 54.5% |
| Automatic JavaScript-plugin candidates | 679 | 86.5% |
| Automatic candidates + nursery | 684 | 87.1% |

Of the 785 identifiers, **64** concern JSON/package JSON or Markdown/MDX. They may
appear mapped through compatibility metadata but do not represent executable
source-code coverage in Oxlint. Removing them gives a 721-rule code-analysis set:

| Adjusted view | Mapped code identifiers | Share of 721 |
| --- | ---: | ---: |
| Automatic candidates | 615 | 85.3% |
| Automatic candidates + nursery | 620 | 86.0% |

The current `@oxlint/migrate` type-aware catalog covers all **55** type-aware rule
identifiers enabled by the measured predecessor preset. A direct backend probe
also reported an unhandled promise through
`typescript/no-floating-promises`, confirming that the installed toolchain—not
only static migration metadata—was active.

## React finding

A separate compatibility experiment showed why React rule-count maximization is
the wrong target:

- non-type-aware JavaScript React rules can add mapped identifiers;
- a type-aware React rule failed because the JavaScript-plugin environment did not
  provide the expected parser services;
- adding compatible React and hooks plugins could push the identifier proxy above
  90%, but would make React compatibility plugins part of the architecture.

The proposed product deliberately rejects that shortcut. Its React coverage is
native Oxlint behavior plus a separately reviewed experimental compiler profile.

## Predecessor ownership drift

The checked-in hybrid generation classified 284 of the broad preset's identifiers
as moved to Oxlint and left 501 with ESLint. A current audit found **89 identifiers**
that were classified as migrated but were not disabled in the ESLint output:

| Family | Duplicate identifiers |
| --- | ---: |
| ESLint core | 76 |
| Vitest | 9 |
| Node.js | 3 |
| Perfectionist | 1 |

This is not a criticism of the predecessor's original design; it is evidence that
dual ownership becomes increasingly expensive as Oxlint's coverage changes.

## What the numbers do and do not mean

They support these conclusions:

- an Oxlint-only code-analysis baseline can cover a substantial majority today;
- type-aware TypeScript is no longer an automatic reason to keep ESLint;
- a small number of plugin-domain choices can materially change breadth;
- unsupported formats must be measured separately;
- a single-runtime successor avoids real synchronization failure modes.

They do **not** prove:

- equivalent messages, options, autofixes, or edge-case behavior;
- that every mapped plugin rule runs without unsupported APIs;
- that every predecessor rule is valuable enough to retain;
- that nursery or JavaScript-plugin behavior is stable enough for a default;
- that 85.3% identifiers equals 85.3% defect coverage.

## Follow-up validation

Rerun this baseline whenever Oxlint, `@oxlint/migrate`, or `oxlint-tsgolint` changes
its relevant rule surface. The implementation RFC should replace migration counts
with a generated ledger and behavioral fixtures before the first beta.

## Primary references

- [Predecessor repository][predecessor]
- [Oxlint migration guide][migration]
- [Oxlint type-aware linting][type-aware]
- [Oxlint JavaScript plugins and limitations][js-plugins]
- [Oxlint compatibility status][compatibility]
- [Oxlint versioning and stability][versioning]

[predecessor]: https://github.com/sebastian-software/eslint-config-setup
[migration]: https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html
[type-aware]: https://oxc.rs/docs/guide/usage/linter/type-aware.html
[js-plugins]: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
[compatibility]: https://oxc.rs/compatibility.html
[versioning]: https://oxc.rs/docs/guide/usage/linter/versioning.html

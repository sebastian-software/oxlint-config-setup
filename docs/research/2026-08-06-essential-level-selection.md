# Essential level selection baseline

- **Date:** 2026-08-06
- **Pinned runtime:** Oxlint 1.77.0 with `oxlint-tsgolint` 7.0.2001 and
  TypeScript 7.0.2
- **Scope:** Classify the existing 27-rule ledger; do not add new rules

## Question

Which existing rules form a small, high-signal entry preset without weakening
the current `standard` default or copying an upstream preset without review?

## Method

The review compared the existing behavioral ledger with current first-party
guidance from Oxlint, ESLint, typescript-eslint, React, eslint-plugin-react,
eslint-plugin-jsx-a11y, eslint-plugin-import, and eslint-plugin-n. It also ran
the pinned Oxlint binary with its default correctness category across the
repository's invalid fixtures.

Upstream membership is evidence of broad applicability. It is not sufficient by
itself because upstream presets have different scopes and compatibility
contracts. The essential level additionally requires:

1. a direct correctness, safety, accessibility, or framework invariant;
2. stable native execution and a repository-owned behavioral fixture;
3. low expected false-positive cost for a new adopter; and
4. a defect whose consequence is more than redundant or stylistically
   inconsistent code.

The `standard` level retains all ledger rules. Experimental rules remain
isolated from both configurable levels.

## First classification

| Profile | Essential | Standard-only rationale |
| --- | --- | --- |
| Core | `no-debugger`, `no-dupe-keys`, `no-unsafe-finally`, `valid-typeof` | All four are ESLint recommended and Oxlint correctness defaults with direct runtime consequences. |
| Imports | — | `no-duplicates` primarily improves ownership and diffs; `no-self-import` is useful but outside the upstream recommended preset. |
| TypeScript syntax | `ban-ts-comment`, `no-duplicate-enum-values` | `no-extra-non-null-assertion` reports redundant syntax and is safely fixable rather than protecting a distinct runtime invariant. |
| TypeScript type-aware | `no-floating-promises`, `await-thenable` | `switch-exhaustiveness-check` is intentionally stricter and is not part of typescript-eslint's stable recommended-type-checked preset. |
| React | `jsx-key`, `jsx-no-undef`, `rules-of-hooks` | These protect reconciliation, identifier resolution, and React's required Hook ordering. |
| JSX accessibility | `alt-text` | The rule is present in both recommended and strict jsx-a11y presets and protects a basic accessible-name requirement. |
| Node.js | `no-exports-assign` | `no-path-concat` and `no-new-require` are useful but are not selected by eslint-plugin-n's recommended configs. |
| AI-assisted development | `no-warning-comments` when `ai` is explicit | This warning is the profile's explicit provisional-code signal; it does not enter essential unless the caller opts into AI. |

Vitest and Jest remain named complete configurations. Their existing rules are
marked essential in the ledger because they protect suite execution and result
identity, but this change does not add a level option to named artifacts. The
experimental React Compiler warning remains standard-only and isolated.

The resulting fully enabled configurable surface contains 14 essential rules
versus 20 standard rules. A default essential project without React, Node.js, or
AI selects eight rules and only the TypeScript native plugin.

## Caveats and review trigger

This is a first classification over a deliberately small ledger, not a claim
that upstream recommended presets are complete or interchangeable. Rerun the
review when the ledger grows, a pinned linter version changes rule behavior, an
upstream preset reclassifies a selected rule, or adopter evidence identifies
material false positives.

## Primary sources

- [Oxlint correctness-focused defaults](https://oxc.rs/docs/guide/usage/linter.html#correctness-focused-defaults)
- [Oxlint rule categories](https://oxc.rs/docs/guide/usage/linter/config.html#enable-groups-of-rules-with-categories)
- [ESLint recommended rules](https://eslint.org/docs/latest/rules/)
- [typescript-eslint shared configs](https://typescript-eslint.io/users/configs/)
- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [eslint-plugin-react recommended config](https://github.com/jsx-eslint/eslint-plugin-react#recommended)
- [eslint-plugin-jsx-a11y recommended config](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y#shareable-configs)
- [eslint-plugin-import recommended config](https://github.com/import-js/eslint-plugin-import#config---flat-eslintconfigjs)
- [eslint-plugin-n recommended configs](https://github.com/eslint-community/eslint-plugin-n#-configs)

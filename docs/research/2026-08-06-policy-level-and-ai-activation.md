# Policy-level and AI activation

- **Date:** 2026-08-06
- **Pinned runtime:** Oxlint 1.77.0 with `oxlint-tsgolint` 7.0.2001 and
  TypeScript 7.0.2
- **Predecessor revision:** `eslint-config-setup` at
  `4543246c62326047f7372765931f260f04beea56`
- **Scope:** Reclassify the existing 27-rule ledger and define the AI boundary

## Questions

1. Which ordered policy levels give adopters meaningful, conventional steps?
2. Does the predecessor's AI mode only tune limits, or does it change rule
   activation?
3. How can AI-specific enforcement remain useful without changing the meaning
   of a selected policy level?

## Method

The review combined the repository's behavioral ledger with first-party Oxlint,
ESLint, and typescript-eslint preset guidance. Upstream membership was treated
as classification evidence rather than copied as a compatibility promise.

The predecessor was checked out at the revision above. Its base and AI-assisted
compositions were rendered and structurally compared. The comparison counted
90 added scoped entries, 19 changed entries, and 12 removed block entries. These
numbers describe configuration structure rather than distinct rule identifiers,
but they establish that the old AI flag did substantially more than lower
numeric thresholds: it changed composition and activation across domains.

The current ledger was then classified using these criteria:

- `essential`: stable, low-noise protection against direct correctness, safety,
  accessibility, or framework defects;
- `recommended`: broadly useful maintainability or redundancy policy suitable
  for the default;
- `strict`: useful but more opinionated policy with higher adoption cost;
- `ai`: a guardrail useful for generated code but too burdensome or specialized
  for the general hierarchy; and
- `named`: behavior owned by a separate execution contract.

AI overrides were evaluated independently. An override is eligible only when it
tightens a rule already active at the selected level, has a written rationale,
and has a fixture that distinguishes the plain and AI configurations.

## First classification

| Profile | Essential | Recommended adds | Strict adds |
| --- | --- | --- | --- |
| Core | `no-debugger`, `no-dupe-keys`, `no-unsafe-finally`, `valid-typeof` | — | — |
| Imports | — | `no-duplicates` | `no-self-import` |
| TypeScript syntax | `ban-ts-comment`, `no-duplicate-enum-values` | `no-extra-non-null-assertion` | — |
| TypeScript type-aware | `no-floating-promises`, `await-thenable` | — | `switch-exhaustiveness-check` |
| React | `jsx-key`, `jsx-no-undef`, `rules-of-hooks` | — | — |
| JSX accessibility | `alt-text` | — | — |
| Node.js | `no-exports-assign` | — | `no-path-concat`, `no-new-require` |

A fully context-enabled configuration therefore contains 13 level-controlled
rules at essential, 15 at recommended, and 19 at strict. The levels are nested.
Vitest, Jest, and React Compiler rules remain named rather than entering that
hierarchy.

`eslint/no-warning-comments` is the first AI-only rule. It warns about
provisional markers that automated generation can leave behind, while requiring
the same discipline manually would be too workflow-specific for a general
level.

`eslint/valid-typeof` is the first AI override. It is essential at every level;
AI changes its options to require string literals in `typeof` comparisons.
The override therefore tightens an already-active rule without importing policy
from recommended or strict.

## Conclusions

- `essential`, `recommended`, and `strict` match established preset vocabulary
  and provide three materially distinct policy surfaces.
- `recommended` is the appropriate default: typescript-eslint describes its
  recommended configurations as stable, broadly applicable starting points,
  while its strict configurations are intentionally more opinionated.
- AI must not remain an unrestricted profile because its composition would make
  level selection conditional and surprising.
- A purely option-only AI flag is unnecessarily restrictive. Explicit AI-only
  activation plus non-weakening overrides of active rules gives the feature a
  useful but auditable boundary.

## Caveats and review triggers

The predecessor counts are a structural snapshot, not a behavioral-equivalence
claim. The current classification covers a deliberately small ledger and may
change before a stable release as fixtures and adopter evidence improve. Rerun
the review when the ledger grows materially, pinned linter behavior changes, an
upstream preset reclassifies a selected rule, or AI-only entries begin to overlap
general policy concerns.

## Primary sources

- [Oxlint rule categories](https://oxc.rs/docs/guide/usage/linter/config.html#enable-groups-of-rules-with-categories)
- [ESLint recommended configuration](https://eslint.org/docs/latest/use/configure/configuration-files#using-predefined-configurations)
- [typescript-eslint shared configurations](https://typescript-eslint.io/users/configs/)

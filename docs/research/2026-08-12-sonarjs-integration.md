# SonarJS integration decision

- **Date:** 2026-08-12
- **Issue:** [#62](https://github.com/sebastian-software/oxlint-config-setup/issues/62)
- **Inputs:** `eslint-plugin-sonarjs` 4.2.0, Oxlint 1.78.0, ESLint 10.8.1,
  TypeScript 7.0.2, and the predecessor configuration at
  [`4543246c`][predecessor]
- **Scope:** Restore predecessor SonarJS policy wherever the Oxlint
  JavaScript-plugin bridge can execute it, with package, fixture, consumer,
  fixer, and performance evidence.

## Decision

Every TypeScript loader enables the 13 syntax-only base rules from the
predecessor configuration. AI mode adds its six former AI-only rules. The
package resolves and owns the plugin runtime; consumers do not install, select,
or configure it separately. No SonarJS preset is inherited, and the 24 prebuilt
JSON artifacts remain unchanged because copied JSON cannot retain a
package-relative plugin path.

`sonarjs/no-all-duplicated-branches` is not selected. It was not in the
predecessor and overlaps `no-duplicated-branches` on fully duplicated `if` and
`switch` structures. Its additional conditional-expression path remains an
accepted gap.

## Predecessor inventory

The predecessor enabled 20 base rules and six additional AI rules. Syntax-only
rules are restored even where native diagnostics overlap; this deliberately
prioritizes predecessor policy parity. Only rules whose SonarJS metadata
declares `requiresTypeChecking` remain incompatible.

| Predecessor rule | Disposition | Reason |
| --- | --- | --- |
| `no-identical-functions` | Base | Syntax-only predecessor rule. |
| `no-collapsible-if` | Base | Syntax-only predecessor rule. |
| `no-redundant-boolean` | Base | Syntax-only predecessor rule. |
| `no-unused-collection` | Base | Syntax-only predecessor rule. |
| `prefer-immediate-return` | Incompatible | Requires TypeScript parser services. |
| `prefer-single-boolean-return` | Base | Syntax-only predecessor rule. |
| `no-identical-expressions` | Base | Syntax-only predecessor rule. |
| `no-inverted-boolean-check` | Base | Syntax-only predecessor rule. |
| `no-collection-size-mischeck` | Incompatible | Requires TypeScript parser services. |
| `no-identical-conditions` | Base | Syntax-only predecessor rule. |
| `no-duplicated-branches` | Base | Syntax-only predecessor rule with dedicated fixture evidence. |
| `no-ignored-return` | Incompatible | Requires TypeScript parser services. |
| `no-redundant-jump` | Base | Syntax-only predecessor rule. |
| `no-exclusive-tests` | Base | Syntax-only predecessor rule. |
| `no-misleading-array-reverse` | Incompatible | Requires TypeScript parser services. |
| `reduce-initial-value` | Incompatible | Requires TypeScript parser services. |
| `no-async-constructor` | Incompatible | Requires TypeScript parser services. |
| `no-redundant-optional` | Incompatible | Requires TypeScript parser services. |
| `no-duplicate-in-composite` | Base | Syntax-only predecessor rule. |
| `no-hardcoded-secrets` | Base | Retains warning severity. |
| `no-nested-switch` | AI | Syntax-only predecessor AI rule. |
| `no-nested-template-literals` | AI | Syntax-only predecessor AI rule. |
| `max-union-size` | AI | Retains threshold 5. |
| `prefer-type-guard` | AI | Syntax-only predecessor AI rule. |
| `public-static-readonly` | AI | Syntax-only predecessor AI rule. |
| `no-duplicate-string` | AI | Retains threshold 3. |

SonarJS 4.2.0 transitively uses `@typescript-eslint` packages whose published
peer ranges stop below TypeScript 6.1. This repository targets TypeScript 7.0.2.
The workspace records a parent-specific peer allowance for those four
transitive packages rather than a global TypeScript exception. The enabled
rules are syntax-only, and the exact combination is covered by the local
runtime, clean-consumer, and package tests. Any SonarJS or TypeScript upgrade
must revisit that allowance.

## Executable evidence

The focused integration evidence covers:

- valid distinct `if`, `switch`, and conditional branches;
- invalid pairwise `if` and `switch` bodies, with exactly two diagnostics;
- native overlap where `oxc/branches-sharing-code` reports and SonarJS does not;
- a conditional-expression gap that stays clean by design;
- an AI-only nested switch that stays clean in base mode and reports in AI mode;
- fixer safety through byte-identical output; and
- clean npm and pnpm consumers that resolve the package-owned plugin path.

Every TypeScript loader result contains the plugin and 13 base rules; AI
loaders contain all 19 rules. Copied JSON artifacts contain neither.

## Performance boundary

`pnpm run benchmark:sonarjs` runs the repository `src` tree with one thread,
two warmups, and ten measured iterations. Both configurations disable native
categories; the candidate adds the 13-rule base policy through the public
SonarJS entrypoint.

| Configuration | Median | p95 |
| --- | ---: | ---: |
| Native empty baseline | 64.56 ms | 68.08 ms |
| 13-rule SonarJS base policy | 517.08 ms | 533.02 ms |

The observed median ratio is 8.01x. This dated local measurement is evidence
for the repository reference input, not a portable latency claim.

The same-host automatic-integration budget is below 10x; the benchmark fails at
or above that boundary. This is a regression tripwire, not a cross-host
millisecond SLA. The plugin exposes its full entrypoint rather than stable
public per-rule modules, so plugin startup dominates this path. The standalone
copied-JSON path does not load SonarJS.

## Review triggers

Rerun the inventory, fixtures, clean consumers, and benchmark when any of these
changes:

- Oxlint changes its JavaScript-plugin compatibility contract;
- SonarJS is upgraded or exposes stable per-rule entrypoints;
- SonarJS changes the type-information requirements of a predecessor rule; or
- the accepted conditional-expression gap becomes a product requirement.

[predecessor]: https://github.com/sebastian-software/eslint-config-setup/blob/4543246c62326047f7372765931f260f04beea56/packages/eslint-config/src/configs/sonarjs.ts

# RFC 0004: Add rule customization helpers

- **Status:** Superseded by [RFC 0005](0005-merge-rule-option-updates.md)
- **Date:** 2026-08-06
- **Owners:** Sebastian Software
- **Source contract:** `eslint-config-setup` rule helpers at
  `4543246c62326047f7372765931f260f04beea56`

## Summary

Port the predecessor's five rule customization helpers to the Oxlint-native
package. Consumers can adjust a selected prebuilt configuration without
forking it, while generated artifacts remain deterministic before explicit
consumer customization.

The AI overlay uses the same severity and options helpers internally. This
keeps AI tightening and consumer customization on one tested transformation
path.

## Motivation

Prebuilt configurations make selection fast and reproducible, but projects
still need narrow exceptions and project-specific additions. Requiring callers
to understand Oxlint's scalar and tuple rule representations would make common
changes verbose and easy to apply inconsistently across file overrides.

The predecessor already established useful behavior:

- change severity while preserving options;
- replace options while preserving severity;
- disable a rule;
- add a rule; and
- isolate one rule for diagnostics.

Those behaviors map directly to Oxlint. Named ESLint config-block scopes do not:
the Oxlint package returns one root object with optional file overrides rather
than an array of named blocks.

## Decision

Export these in-place helpers from the package root:

| Function | Behavior |
| --- | --- |
| `setRuleSeverity(config, rule, severity)` | Change every explicit occurrence to `off`, `warn`, or `error` while preserving its options. |
| `configureRule(config, rule, options)` | Replace the complete option list for every explicit occurrence while preserving each occurrence's severity. |
| `disableRule(config, rule)` | Replace every explicit occurrence with `off`. |
| `addRule(config, rule, severity, options?)` | Add or replace the rule in the root configuration. |
| `disableAllRulesBut(config, rule)` | Disable every other explicit rule in the root and file overrides for diagnostics. |

“Explicit occurrence” means an entry in the root `rules` map or an existing
file override's `rules` map. The helpers do not attempt to resolve category
defaults or recursively rewrite `extends`. They accept string identifiers so
native, external-plugin, and future rule names remain usable. Oxlint validates
the resulting identifier and option schema when the configuration executes.

All helpers mutate the provided `OxlintConfig` and return `void`, preserving the
predecessor's observable API. Every package loader returns a newly parsed object,
so customizing one loaded configuration does not modify generated artifacts or
later loader results.

`configureRule` replaces the full positional options list; it never deep-merges
option objects. Oxlint rules accept heterogeneous positional arrays, so a
generic merge could not reliably determine which entries or nested values a
rule intends to replace. Callers and AI ledger entries therefore declare the
complete desired options list.

The old `{ scope }` parameter is not ported. Current Oxlint artifacts have no
named override scopes, and pretending to preserve names such as `tests` or
`scripts` would create an API without a stable target. A future scoped API must
use Oxlint-native file override semantics and requires separate evidence.

## Consequences

- Consumers regain the predecessor's concise rule toggling and configuration
  workflow.
- Severity and option transformations have one implementation shared by the
  public API and AI composition.
- Options replacement is deterministic and directly testable.
- Helpers modify only explicit entries; category- or `extends`-derived rules
  need a root `addRule` override.
- The initial API cannot target a file override by a friendly scope name.
- Customized objects intentionally differ from their source prebuilt JSON
  artifact after the helper call.

## Validation and acceptance criteria

- Direct tests port representative predecessor cases for scalar and configured
  rules, file overrides, missing rules, idempotent disabling, additions, and
  diagnostic isolation.
- A focused test proves AI still tightens `eslint/valid-typeof` through the
  shared helper path.
- The packed-package verifier exercises every helper from a clean consumer and
  type-checks the exported `RuleSeverity` type.
- Generated snapshots remain unchanged by the internal refactor.

## References

- [RFC 0003: Close the v0.1 configuration contract](0003-close-the-v01-configuration-contract.md)
- [ADR 0008: Separate policy levels from AI guardrails](../adr/0008-separate-policy-levels-from-ai-guardrails.md)
- [Predecessor helper implementation at the reviewed revision](https://github.com/sebastian-software/eslint-config-setup/blob/4543246c62326047f7372765931f260f04beea56/packages/eslint-config/src/api/rule-helpers.ts)
- [Predecessor rule-helper decision](https://sebastian-software.github.io/eslint-config-setup/adr/0014-rule-helpers)

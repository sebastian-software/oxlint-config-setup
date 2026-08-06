# 0008. Separate policy levels from AI guardrails

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Sebastian Software maintainers
- **Supersedes:** [ADR 0007](0007-add-essential-and-standard-config-levels.md)

## Context

ADR 0007 introduced `essential` and `standard` as rule-intensity levels while
retaining AI-assisted development as a freely combinable Boolean dimension.
That model makes two different decisions look equivalent: how much general
policy a project adopts, and whether it wants automation-friendly guardrails.
It also permits an AI profile to activate rules that a caller would reasonably
expect to be excluded by the selected level.

The predecessor `eslint-config-setup` demonstrates the risk. Its AI mode does
not merely adjust numeric limits: it changes composition, adds rule blocks, and
changes or removes existing entries. Preserving that behavior as an opaque
profile would make combinations such as `essential` plus AI difficult to
explain and review.

At the same time, constraining AI to option changes alone would be too narrow.
Some checks are valuable for generated code precisely because they are tedious
for a person to enforce consistently, yet they do not belong in a general
policy progression.

## Decision

Expose three nested policy levels:

1. `essential` is the small, low-noise correctness, safety, accessibility, and
   framework floor.
2. `recommended` is the default and broadly applicable project policy.
3. `strict` is the complete, more opinionated policy surface.

`ConfigOptions.level` therefore accepts
`"essential" | "recommended" | "strict"` and defaults to `recommended`.
Every rule controlled by this hierarchy has exactly one minimum level, and each
higher level is a strict superset of the lower levels. Upstream recommended and
strict presets are evidence for classification, not definitions that are copied
without review.

AI is an overlay, not a fourth policy level or a project context. When `ai` is
enabled, it may do exactly two things:

- modify the severity or options of a level-controlled rule only when that rule
  is already active at the selected level; and
- activate a rule explicitly classified as AI-only and therefore intentionally
  outside the level hierarchy.

AI must not activate a level-controlled rule from a higher level, disable an
active rule, or reduce its severity. Option overrides require a rationale and a
behavioral fixture because whether an option is stricter cannot be inferred
mechanically. AI-only rules are reserved for useful, automation-friendly
guardrails whose manual enforcement cost makes them unsuitable for the general
level progression. They are not a route around level classification.

The ledger represents these boundaries with a discriminated activation model:
`level` entries own a minimum level and may declare an AI override; `ai` entries
are AI-only; and `named` entries belong only to a named configuration. Schema
validation rejects ambiguous combinations. Generated artifacts, snapshots, the
rule catalog, and behavioral tests derive from this model.

React and Node.js remain independent project-context switches. The generator
emits all 24 combinations of three levels with React, Node.js, and AI. Existing
unprefixed JSON names such as `default`, `react`, and `ai` select the recommended
level. Essential and strict artifacts use `essential-` and `strict-` prefixes.
Syntax-only TypeScript, Vitest, Jest, and the experimental React Compiler remain
four named complete configurations and use strict policy where applicable.

This package has not yet published a stable release, so changing the earlier
`standard` name and default is preferable to preserving a misleading contract.
All unaffected decisions from ADR 0005 remain in force: build-time composition,
prebuilt JSON selection, direct Oxlint execution, deterministic packaging,
pinned compatibility versions, and no ESLint runtime.

## Decision drivers

- Match established preset language with an approachable default between a
  minimum baseline and an opinionated maximum.
- Keep general policy intensity independent from AI-specific enforcement.
- Make every AI addition and override explicit, reviewable, and testable.
- Prevent `essential` plus AI from silently acquiring recommended or strict
  rules.
- Preserve deterministic, runtime-free selection for every supported option
  combination.

## Options considered

### Treat AI as a fourth strictness level

This would make the hierarchy easy to enumerate but would incorrectly imply
that AI policy is simply stricter general policy and could not be combined with
different adoption levels.

### Permit AI to change options but never add rules

This provides a strong boundary, but excludes checks that are specifically
valuable for generated code and deliberately unsuitable for general policy.

### Keep AI as an unrestricted independent profile

This preserves the predecessor's flexibility but permits surprising cross-level
activation and makes the effective meaning of each level dependent on another
flag.

### Use nested levels plus a constrained AI overlay

This separates the two decisions while supporting both active-rule tightening
and a small, explicitly governed AI-only rule category.

## Consequences

### Positive

- The default aligns with the common `recommended` convention.
- `essential`, `recommended`, and `strict` communicate an ordered adoption path.
- AI behavior cannot silently widen the selected general policy level.
- AI-specific guardrails remain possible without misclassifying them as strict
  general policy.
- The ledger and generated catalog expose the activation reason for every rule.

### Negative

- Configurable artifacts grow from sixteen to 24.
- Existing pre-release consumers using `standard` must rename it to `strict` or
  intentionally adopt the new recommended default.
- AI option overrides need human review in addition to schema validation.
- Each added level or Boolean selector multiplies the artifact space and package
  verification work.

## Validation and review triggers

Ledger validation enforces exclusive activation categories, valid nested levels,
non-weakening AI severities, and rationales for AI overrides. The fixture harness
runs every complete invalid fixture through every level with and without AI. It
asserts that AI adds only AI-classified rules, never adds higher-level rules, and
changes option behavior only for already-active rules. Package tests verify all
24 selector mappings, all public JSON exports, and the four named configurations.

Review this decision if adopter evidence shows that the three levels do not
provide meaningful steps, AI-only rules become a policy dumping ground, option
overrides routinely need weakening, or the generated artifact matrix becomes
materially costly.

## References

- [Policy-level and AI activation research](../research/2026-08-06-policy-level-and-ai-activation.md)
- [Rule selection and validation RFC](../rfcs/0002-rule-selection-and-validation.md)
- [Generated rule catalog](../rule-catalog.md)

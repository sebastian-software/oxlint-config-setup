# 0007. Add essential and standard config levels

- **Status:** Superseded
- **Date:** 2026-08-06
- **Deciders:** Sebastian Software maintainers
- **Supersedes:** [ADR 0005](0005-author-configs-in-typescript-and-publish-json.md)
- **Superseded by:** [ADR 0008](0008-separate-policy-levels-from-ai-guardrails.md)

## Context

ADR 0005 fixed React, Node.js, and AI-assisted development as three Boolean
dimensions and generated eight complete configurations. The resulting
`standard` rule set is intentionally opinionated, but adoption also needs a
smaller starting point containing only the rules that the project considers
non-negotiable.

Calling that starting point `relaxed` would imply that known problems are
accepted. Calling it `light` would describe size without explaining the policy.
The name `essential` instead communicates a small correctness floor. This rule
intensity is independent of React, Node.js, and AI project context.

## Decision

Add `level?: "essential" | "standard"` to `ConfigOptions`. `standard` remains
the default, so existing calls and their generated artifact names, hashes, rule
sets, and JSON export paths remain unchanged.

`essential` is a reviewed subset of `standard`. A rule enters `essential` only
when it protects a direct correctness, safety, accessibility, or framework
invariant with stable native behavior and low expected false-positive cost.
Appearance in an upstream recommended preset is supporting evidence, not an
automatic inclusion decision. Redundancy checks, maintainability preferences,
and more opinionated policies remain `standard` even when an upstream project
recommends them.

The rule ledger owns each rule's minimum level. Generated configs, effective
config snapshots, and the rule catalog derive from that field. `standard` must
remain a strict superset of `essential`. The explicitly selected AI profile may
retain a warning-level essential signal; no warning enters the essential base
implicitly.

React, Node.js, and AI remain independent Boolean dimensions. The generator
therefore emits eight `standard` and eight `essential` permutations. Public
essential JSON exports use the `essential` prefix, such as
`./json/essential`, `./json/essential-react`, and
`./json/essential-react-node-ai`. Internal essential artifacts use a separate
hash namespace so the reviewed v0.1 standard mapping remains byte-for-byte
stable.

Every configurable artifact remains type-aware. Syntax-only TypeScript, Vitest,
Jest, and the experimental React Compiler remain named complete configurations
and do not gain a level option.

All other architecture and packaging decisions from ADR 0005 remain in force,
including build-time composition, prebuilt JSON selection, direct Oxlint
execution, deterministic packaging, pinned compatibility versions, and the
absence of an ESLint runtime.

## Decision drivers

- Offer an adoption path with a small, explainable correctness floor.
- Keep project context separate from rule intensity.
- Preserve existing API behavior and public JSON paths by default.
- Keep every supported combination deterministic and available without runtime
  rule composition.
- Make rule promotion and demotion reviewable in the existing ledger.

## Options considered

### Add a `relaxed` Boolean

A Boolean is compact, but it does not scale to another future level and its
positive value describes weaker enforcement rather than the selected policy.

### Add a named, non-combinable light configuration

One extra artifact avoids doubling the option space, but adopters could not
combine the entry level with React, Node.js, or AI context.

### Add an explicit level union

A string union makes the default and alternatives self-documenting, rejects
unknown JavaScript input at runtime, and leaves room for a separately justified
future level without introducing Boolean interactions.

## Consequences

### Positive

- Existing consumers receive exactly the same `standard` configuration.
- New adopters can start with a smaller preset while retaining type-aware
  correctness and relevant React, Node.js, or AI rules.
- The package exposes a typed API and portable JSON for every supported
  combination.
- Empty plugins are omitted when a level selects none of their rules.

### Negative

- Configurable artifacts double from eight to sixteen.
- Every ledger rule now needs a reviewed minimum-level classification.
- Adding a future level would expand the artifact space again and needs an
  explicit size and maintenance review.

## Validation and review triggers

The fixture harness runs standard-only invalid cases through an essential
configuration and requires exactly the essential diagnostic set. Package tests
verify all sixteen option mappings, preserve the original eight hashes, compare
loader and JSON output, validate JavaScript input, and install the packed result
into clean consumers.

Review the decision if essential adoption produces material false positives,
if essential and standard converge enough to lose meaning, if the option space
becomes costly to package, or if an upstream recommended preset changes the
evidence for a ledger classification.

## References

- [Essential level selection research](../research/2026-08-06-essential-level-selection.md)
- [Rule selection and validation RFC](../rfcs/0002-rule-selection-and-validation.md)
- [Generated rule catalog](../rule-catalog.md)

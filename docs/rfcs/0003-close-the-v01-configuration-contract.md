# RFC 0003: Close the v0.1 configuration contract

- **Status:** Accepted and implemented for v0.1 beta
- **Date:** 2026-08-06
- **Owners:** Sebastian Software
- **Resolves:** Open questions in [RFC 0001](0001-product-contract.md) and
  [RFC 0002](0002-rule-selection-and-validation.md)

## Summary

Close the remaining v0.1 product-contract questions without rewriting the two
accepted RFCs that raised them. This RFC records the implemented answers and
makes policy-level behavior explicit: levels control rule membership only.

## Motivation

RFC 0001 and RFC 0002 were accepted before the package spike, production
implementation, fixture harness, and policy-level design were complete. Their
open-question sections correctly preserve that earlier uncertainty, but most of
the questions now have executable answers. A new contributor should be able to
find those answers without reconstructing them from Git history.

The level model also needs one precise boundary. `essential`, `recommended`,
and `strict` are ordered rule sets, not alternative configurations of the same
rule. Without stating that explicitly, a future change could make a shared rule
silently stricter merely because a higher level was selected.

## Decision

### Levels control membership only

A level-controlled ledger entry has one minimum level and one base severity and
options configuration. Selecting a higher level may activate additional rules,
but it does not change the severity or options of a rule already active at a
lower level.

The AI overlay is the only current mechanism allowed to tighten an already
active level-controlled rule. Its separate constraints remain defined by
[ADR 0008](../adr/0008-separate-policy-levels-from-ai-guardrails.md). Adding
level-specific severity or option overrides would change the public meaning of
the level hierarchy and requires a new accepted contract before changing the
ledger schema.

### Resolve RFC 0001 open questions

| Question | v0.1 resolution |
| --- | --- |
| Package name and exports | Publish `oxlint-config-setup` with typed loader functions and equivalent public JSON subpaths. Generated internal hashes remain private. |
| Type-aware selection | Every configurable level is type-aware. A separate named syntax-only configuration supports projects without a TypeScript project graph. |
| Test and regular-expression plugins | No JavaScript plugin qualifies for v0.1. Native Vitest and Jest rules ship as separate named configurations; regex and other plugin-backed domains remain research. |
| Representative fixture corpus | Repository-owned rule, interaction, project-reference, profile-mismatch, effective-config, failure-mode, and clean-consumer fixtures are sufficient for the beta claim. External predecessor repositories are not a beta gate. |
| React Compiler checks | The native `react/react-compiler` diagnostic ships only in the named experimental configuration and begins as a warning. |

### Resolve RFC 0002 open questions

| Question | v0.1 resolution |
| --- | --- |
| Performance budget | v0.1 has no cross-host millisecond SLA. Reproducible measurements on the pinned environment are comparative evidence. Any JavaScript-plugin proposal must define and pass its own startup and execution budget before acceptance. |
| Warning-level defaults | The three base levels contain no warnings. Warning-level policy requires an explicit overlay or named experimental configuration; v0.1 uses AI and React Compiler respectively. |
| Public migration fixtures | Focused repository-owned fixtures and clean packed consumers support the beta's behavioral-coverage claim. A broader compatibility claim would require a separately reviewed public migration corpus. |
| Ledger implementation | TypeScript owns the schema, ledger, generators, package source, and validation scripts. Generated JSON and Markdown remain committed outputs checked for drift. |
| First-beta plugin domains | None. Testing Library, Playwright, Storybook, SonarJS, and regular-expression plugins remain research until they pass the existing inclusion gate. |

## Consequences

- The level hierarchy remains predictable: higher levels add policy without
  reinterpreting policy already accepted at lower levels.
- AI tightening remains visible in the ledger rather than being confused with
  ordinary level selection.
- The accepted historical RFCs retain their original questions, while this
  indexed resolution record provides the implemented answers.
- Native v0.1 performance remains measurable but is not presented as a portable
  latency guarantee.
- Future plugin, compatibility, or level-dependent configuration work needs an
  explicit proposal instead of silently expanding the beta contract.

## Validation and acceptance criteria

- Ledger tests compare every rule shared by adjacent levels and require its
  non-AI configuration to be identical.
- Package tests continue to verify all 24 configurable artifacts and four named
  configurations.
- The release documentation gate requires this RFC and its membership-only
  level contract.

## References

- [ADR 0008: Separate policy levels from AI guardrails](../adr/0008-separate-policy-levels-from-ai-guardrails.md)
- [Policy-level and AI activation research](../research/2026-08-06-policy-level-and-ai-activation.md)
- [Compatibility evidence](../compatibility.md)
- [Generated rule catalog](../rule-catalog.md)

# RFC 0005: Merge rule option updates

- **Status:** Accepted and implemented for v0.1 beta
- **Date:** 2026-08-06
- **Owners:** Sebastian Software
- **Supersedes:** [RFC 0004](0004-add-rule-customization-helpers.md)

## Summary

Change `configureRule` from complete option replacement to a recursive merge.
Consumers and the AI overlay can update one detail without repeating the rest of
an existing rule configuration.

The function signature, in-place mutation model, severity preservation, and
root-plus-file-override targeting remain unchanged.

## Motivation

Rule option objects can contain several independent and nested settings. Full
replacement requires a caller to know and repeat every existing setting when it
only intends to change one. That is verbose, makes preset evolution harder to
inherit, and creates a realistic risk of accidentally dropping unrelated
guardrails.

Merge behavior better matches the name `configureRule` and common configuration
composition expectations. Arrays still need explicit replacement because
concatenating allowlists or ordered values would have rule-specific meaning that
a generic helper cannot infer.

## Goals

- Preserve unspecified object properties and positional options.
- Support nested object updates without requiring a complete replacement value.
- Keep array, scalar, and `null` replacement deterministic.
- Apply identical behavior to every explicit root and file-override occurrence.
- Reuse the public behavior for partial AI option tightening.

## Non-goals

- Concatenate or otherwise infer rule-specific array semantics.
- Introduce a deletion sentinel for object properties or positional options.
- Resolve category defaults, `extends`, or non-explicit rules.
- Restore the predecessor's named ESLint config scopes.

## Proposal

For each supplied positional option, `configureRule` compares the update with
the existing option at the same index:

1. When both values are plain objects, their properties are merged recursively.
2. In every other case, including arrays, scalars, and `null`, the supplied
   value replaces the existing value.
3. Existing positional options beyond the supplied array length are retained.
4. Supplied positions beyond the existing array length are appended.
5. An empty options array is a no-op and preserves the existing scalar or tuple
   representation.

Plain objects are objects whose prototype is `Object.prototype` or `null`.
Class instances and other specialized values follow replacement semantics.

Given this rule:

```ts
["error", { allow: ["legacy"], limits: { min: 1, max: 10 } }, "secondary"]
```

this update:

```ts
configureRule(config, "plugin/rule", [
  { allow: ["modern"], limits: { max: 20 } },
]);
```

produces:

```ts
["error", { allow: ["modern"], limits: { min: 1, max: 20 } }, "secondary"]
```

The array at `allow` is replaced, while `limits.min` and the second positional
option are retained. Each file override merges against its own current value,
so override-specific settings remain local.

## User experience

Callers specify only the properties and positions they intend to change.
Severity continues to be managed independently through `setRuleSeverity`, and
`addRule` remains the root-level API for adding or fully replacing a rule.

AI ledger overrides may likewise declare only the option values they tighten.
They still cannot weaken an active rule or activate a higher-level rule.

## Validation and acceptance criteria

- A direct regression test proves recursive object merging.
- The same test proves arrays and scalars replace, trailing positions remain,
  and root and file overrides merge independently.
- An empty update is a structural no-op.
- Package-level and clean-consumer tests exercise the shipped helper.
- Existing generated AI artifacts remain unchanged.

## Alternatives considered

### Replace the complete options list

This matches the predecessor implementation but forces consumers to repeat
unrelated details and makes preset additions easy to discard accidentally.

### Shallow-merge only the first object

This helps top-level settings but still requires complete replacement of nested
option groups and does not define multiple positional options.

### Concatenate arrays

Rejected because arrays may be allowlists, ordered tuples, or complete sets.
Replacement is the only generic behavior that does not invent rule-specific
meaning.

## Risks and mitigations

- Merge semantics do not remove an existing object property or trailing
  positional option. A caller that needs complete root replacement can use
  `addRule`; evidence of broader demand should lead to a separately named
  replacement API rather than an ambiguous flag.
- Recursive merging could hide an unintended inherited value. Documentation and
  tests make the preservation rule explicit, and arrays remain atomic.

## Open questions

None for v0.1 beta.

## References

- [RFC 0004: Add rule customization helpers](0004-add-rule-customization-helpers.md)
- [ADR 0008: Separate policy levels from AI guardrails](../adr/0008-separate-policy-levels-from-ai-guardrails.md)

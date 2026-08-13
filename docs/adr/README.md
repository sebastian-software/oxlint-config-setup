# Architecture Decision Records

ADRs preserve the project's current durable technical decisions and their
tradeoffs. Files use a zero-padded sequence and a short descriptive slug.

## Living-record lifecycle

This repository treats ADRs as living, mutable records. An accepted ADR always
describes the current decision for its established scope. When that decision
evolves, update the existing ADR in place instead of creating a successor only
to record the update. Git history preserves earlier versions.

A new ADR is appropriate only for a genuinely separate durable decision with a
different scope. Do not create a new ADR merely because implementation details,
evidence, constraints, or the chosen direction of an existing decision changed.

Semantic updates must:

- keep the existing ADR number and filename;
- update or add the `Last updated` field;
- rewrite context, decision, tradeoffs, consequences, validation, and references
  so the whole record is internally current; and
- update this index and enforcement artifacts when their claims change.

Statuses use these meanings:

- `Proposed`: under discussion and not yet binding;
- `Accepted`: the current project decision;
- `Deprecated`: no longer applicable and has no replacement;
- `Rejected`: considered and deliberately not adopted; and
- `Superseded`: retained only for legacy records created before the
  living-record convention.

The older supersession links in ADRs 0005 and 0007 remain as historical
navigation. Future updates use the living-record lifecycle above.

## Index

| ADR                                                                | Decision                                              | Status             |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------ |
| [0001](0001-use-oxlint-as-the-only-linter-runtime.md)              | Use Oxlint as the only standard linter runtime        | Accepted           |
| [0002](0002-prefer-native-rules-over-javascript-plugins.md)        | Prefer native rules over JavaScript plugins           | Accepted           |
| [0003](0003-use-native-type-aware-linting.md)                      | Use native type-aware linting for TypeScript          | Accepted           |
| [0004](0004-separate-non-code-quality-tools.md)                    | Separate non-code quality tools                       | Accepted           |
| [0005](0005-author-configs-in-typescript-and-publish-json.md)      | Generate config permutations and select prebuilt JSON | Superseded by 0007 |
| [0006](0006-use-us-english-as-the-project-language.md)             | Use US English as the project language                | Accepted           |
| [0007](0007-add-essential-and-standard-config-levels.md)           | Add essential and standard config levels              | Superseded by 0008 |
| [0008](0008-separate-policy-levels-from-ai-guardrails.md)          | Separate policy levels from AI guardrails             | Accepted           |
| [0009](0009-use-ardo-for-the-product-and-documentation-site.md)    | Use Ardo for the product and documentation site       | Accepted           |
| [0010](0010-require-node-24-lts.md)                                | Require Node.js 24 LTS or newer                       | Accepted           |
| [0011](0011-publish-the-documentation-site-with-github-actions.md) | Publish the documentation site with GitHub Actions    | Accepted           |
| [0012](0012-make-the-homepage-light-first-and-user-switchable.md)  | Make the homepage light-first and user-switchable     | Accepted           |
| [0013](0013-release-coordinated-toolchain-pins.md)                 | Release coordinated toolchain pins                    | Accepted           |

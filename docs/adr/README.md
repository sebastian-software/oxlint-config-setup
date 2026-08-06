# Architecture Decision Records

ADRs preserve durable technical decisions and their trade-offs. Files use a
zero-padded sequence and a short descriptive slug.

## Lifecycle

- `proposed`: under discussion and not yet binding;
- `accepted`: the current decision;
- `deprecated`: retained for history but no longer recommended;
- `superseded`: replaced by a newer ADR that links back to it;
- `rejected`: considered and deliberately not chosen.

Accepted ADRs are immutable apart from typo or link fixes. Changed circumstances
are handled by a new ADR that supersedes the previous decision.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-use-oxlint-as-the-only-linter-runtime.md) | Use Oxlint as the only standard linter runtime | Accepted |
| [0002](0002-prefer-native-rules-over-javascript-plugins.md) | Prefer native rules over JavaScript plugins | Accepted |
| [0003](0003-use-native-type-aware-linting.md) | Use native type-aware linting for TypeScript | Accepted |
| [0004](0004-separate-non-code-quality-tools.md) | Separate non-code quality tools | Accepted |
| [0005](0005-author-configs-in-typescript-and-publish-json.md) | Generate config permutations and select prebuilt JSON | Superseded by 0007 |
| [0006](0006-use-us-english-as-the-project-language.md) | Use US English as the project language | Accepted |
| [0007](0007-add-essential-and-standard-config-levels.md) | Add essential and standard config levels | Superseded by 0008 |
| [0008](0008-separate-policy-levels-from-ai-guardrails.md) | Separate policy levels from AI guardrails | Accepted |
| [0009](0009-use-ardo-for-the-product-and-documentation-site.md) | Use Ardo for the product and documentation site | Accepted |
| [0010](0010-require-node-24-lts.md) | Require Node.js 24 LTS or newer | Accepted |
| [0011](0011-publish-the-documentation-site-with-github-actions.md) | Publish the documentation site with GitHub Actions | Accepted |
| [0012](0012-make-the-homepage-light-first-and-user-switchable.md) | Make the homepage light-first and user-switchable | Accepted |

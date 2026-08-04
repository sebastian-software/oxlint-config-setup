# Contributing

The project is currently design-first. Small, reviewable pull requests are
preferred over a single large specification dump.

## Proposal types

- **RFCs** live in `docs/rfcs/` and specify product behavior, user experience,
  rule policy, or validation requirements. New RFCs begin as `proposed`.
- **ADRs** live in `docs/adr/` and preserve durable architectural decisions.
  Accepted ADRs are immutable; a later ADR may supersede one.
- **Research notes** live in `docs/research/` and capture dated evidence. They do
  not become requirements merely by being documented.

## Review expectations

A proposal should state its scope, alternatives, consequences, and validation
criteria. Claims about current Oxlint capabilities should link to primary
documentation and include a review trigger when the capability is experimental
or outside Oxlint's semantic-versioning guarantees.

Implementation should follow an accepted contract. A rule is not included only
because it existed in the predecessor preset; it needs a clear defect class,
acceptable noise, and a sustainable execution path in Oxlint.

## Pull requests

- Keep one coherent decision or specification area per pull request.
- Use present tense in commits and explain user-visible consequences.
- Prefer native Oxlint behavior over ESLint compatibility shims.
- Mark unresolved product choices explicitly instead of hiding them in code.

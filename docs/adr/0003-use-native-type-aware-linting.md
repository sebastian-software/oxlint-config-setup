# 0003. Use native type-aware linting for TypeScript

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Sebastian Software maintainers

## Context

Syntax-only linting cannot reliably find important TypeScript defects such as
unhandled promises or unsafe operations whose meaning depends on resolved types.
Historically, these checks were a central reason to retain typescript-eslint in
the predecessor's ESLint half.

Oxlint's type-aware mode delegates supported rules to `oxlint-tsgolint`, which is
built on the native TypeScript Go port. This creates an Oxlint-native execution
path for most of that value without reintroducing ESLint.

Oxlint's documentation identifies type-aware behavior as a stability area that is
not covered by its normal semantic-versioning policy. The backend is also a
separate versioned dependency.

## Decision

The TypeScript product includes Oxlint's native type-aware linting backed by
`oxlint-tsgolint`. Type-aware rules are selected deliberately and tested as part
of the preset; they are not inferred solely from a migrated ESLint config.

Supported Oxlint and backend versions are pinned or constrained as a tested pair.
Syntax-only profiles remain useful for editors, partial checkouts, or projects
without a valid TypeScript project graph, but they do not define the complete
TypeScript quality bar.

## Decision drivers

- Preserve high-value semantic TypeScript diagnostics.
- Keep ESLint out of the runtime architecture.
- Benefit from the TypeScript compiler's native project understanding.
- Make the cost and prerequisites of type-aware checks explicit.

## Options considered

### Omit type-aware rules

This simplifies setup but creates correctness gaps that are too important for an
opinionated TypeScript preset.

### Run typescript-eslint separately

This has a mature rule surface but violates the single-runtime decision and
reintroduces dual ownership.

### Use Oxlint with `oxlint-tsgolint`

This keeps the user-facing workflow in Oxlint while retaining semantic checks,
at the cost of a fast-moving backend and project-graph requirements.

## Consequences

### Positive

- Promise and type-safety defect classes remain part of the intended baseline.
- Consumers use one linter entry point.
- Type-aware coverage can grow as Oxlint and TypeScript Go evolve.

### Negative

- CI needs a valid TypeScript project graph and additional backend binary.
- Upgrades require compatibility verification beyond normal semver expectations.
- Editor and CI profiles may have different latency characteristics.

## Validation and review triggers

- Maintain positive and negative fixtures for every enabled type-aware rule.
- Test monorepos, project references, path aliases, and generated-file boundaries.
- Record the tested Oxlint, `oxlint-tsgolint`, and TypeScript versions.
- Re-run the suite on every upgrade of any member of that version trio.
- Revisit the packaging choice when Oxlint changes how the backend is installed or
  discovered.

## References

- [Oxlint type-aware linting][type-aware]
- [Type-aware linting stability announcement][stable]
- [Oxlint versioning and stability][versioning]

[type-aware]: https://oxc.rs/docs/guide/usage/linter/type-aware.html
[stable]: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable.html
[versioning]: https://oxc.rs/docs/guide/usage/linter/versioning.html

# 0001. Use Oxlint as the only standard linter runtime

- **Status:** Accepted
- **Date:** 2026-08-04
- **Last updated:** 2026-08-11
- **Deciders:** Sebastian Software maintainers

## Context

The predecessor [`eslint-config-setup`][predecessor] coordinates ESLint and
Oxlint. That architecture was useful while Oxlint covered a smaller part of the
desired rule surface, but it requires two runtimes, two configuration models, and
continuous bookkeeping about which tool owns each rule.

Oxlint now offers a much larger native rule catalog and a native path for
type-aware TypeScript checks. This project is intentionally a new successor, so
it does not need to retain the predecessor's compatibility contract.

## Decision

Oxlint is the only linter process in the standard execution path. Published
profiles are loaded and executed by Oxlint; the package does not invoke the
ESLint CLI or maintain a second configuration pipeline.

Oxlint-compatible JavaScript plugins may be package-owned runtime dependencies
when they cover a valuable domain with no adequate native implementation. Their
required ESLint compatibility APIs are part of that plugin runtime, not a second
linter. ESLint configuration packages, parsers, and migration helpers remain
research-only dependencies.

The predecessor remains maintained independently for users who need its hybrid
coverage or legacy behavior.

## Decision drivers

- One command and one diagnostic ownership model.
- Faster installation, startup, and CI execution.
- No synchronization layer for rules that move between linters.
- Freedom to select rules by current value instead of historical implementation.
- A product identity that is clear to adopters.

## Options considered

### Continue ESLint and Oxlint side by side

This maximizes near-term parity and minimizes migration gaps. It retains the
complexity this successor is meant to remove.

### Make ESLint an optional fallback

An optional fallback appears flexible, but every documented fallback becomes an
API and support obligation. It also makes it unclear whether an enabled rule is
part of the standard quality bar.

### Use Oxlint only

This accepts explicit gaps in exchange for a coherent product and lets new native
capabilities replace gaps without reorganizing the runtime architecture.

## Consequences

### Positive

- Consumers install and operate a smaller linting stack.
- Duplicate diagnostics and rule ownership drift are structurally avoided.
- Configuration and documentation can speak in terms of project concerns.

### Negative

- Some predecessor rules will not be available at launch.
- Unsupported file formats and ESLint-only APIs require separate tools or accepted
  gaps.
- Projects that require exact predecessor behavior must remain on the predecessor.

## Validation and review triggers

Verify in CI that Oxlint remains the only invoked linter, package-owned plugins
stay file-scoped, and clean consumers resolve their complete runtime without
extra installation steps. Revisit only if Oxlint loses a critical capability
with no sustainable native, type-aware, or plugin-backed replacement.

## References

- [Predecessor repository][predecessor]
- [Migrating from ESLint to Oxlint][migration]

[predecessor]: https://github.com/sebastian-software/eslint-config-setup
[migration]: https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html

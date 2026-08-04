# 0004. Separate non-code quality tools

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Sebastian Software maintainers

## Context

The predecessor preset includes concerns beyond JavaScript and TypeScript program
analysis, including JSON/package metadata, Markdown/MDX, spelling, and formatting
adjacent policies. Raw rule counts mix those file types with rules that Oxlint can
actually execute on source code.

Oxlint's JavaScript-plugin support does not currently add custom parsers or custom
file formats. Keeping ESLint only for these concerns would undermine the new
project's single-runtime contract without making Oxlint responsible for them.

## Decision

The core project owns JavaScript and TypeScript program linting through Oxlint.
Formatting, spelling, Markdown/MDX, JSON schemas, and package metadata validation
are separate concerns with separately chosen tools and commands.

The project may publish integration guidance or a companion quality script, but
those tools are not represented as Oxlint rule coverage and do not add ESLint to
the standard lint path.

## Decision drivers

- Honest capability boundaries and coverage reporting.
- Use purpose-built tools for non-program formats.
- Avoid retaining an entire runtime for a small set of unrelated checks.
- Allow teams to adopt the Oxlint preset without adopting every quality tool.

## Options considered

### Retain ESLint for unsupported formats

This preserves predecessor behavior but also preserves a second linter and its
configuration ecosystem.

### Drop all unsupported concerns without guidance

This keeps the package small but makes migrations unnecessarily lossy and hides
quality gaps.

### Separate concerns and document a complete toolchain

This keeps ownership clear while giving users an explicit path to equivalent
repository-wide checks.

## Consequences

### Positive

- Oxlint coverage metrics describe files Oxlint actually analyzes.
- Each concern can use a tool with native format understanding.
- Consumers can compose only the repository checks they need.

### Negative

- A complete quality setup may still contain several commands.
- The project must clearly distinguish its core package from companion guidance.
- Predecessor migrations need a checklist for checks that move outside linting.

## Validation and review triggers

Maintain a migration matrix that assigns every predecessor concern to Oxlint, a
named companion tool, or an accepted gap. Revisit if Oxlint gains stable native
support for one of these formats; do not treat JavaScript-plugin loadability alone
as proof of format support.

## References

- [Oxlint compatibility status][compatibility]
- [Oxlint JavaScript-plugin limitations][js-plugins]

[compatibility]: https://oxc.rs/compatibility.html
[js-plugins]: https://oxc.rs/docs/guide/usage/linter/js-plugins.html

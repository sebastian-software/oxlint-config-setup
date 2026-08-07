# 0004. Separate non-code quality tools

- **Status:** Accepted
- **Date:** 2026-08-04
- **Last updated:** 2026-08-07
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
are separate concerns with separately chosen tools and commands. Their supported
delivery model is a version-pinned, repository-owned template at
`templates/companion-quality`, backed by a clean fixture verifier. It is not a
new package, initializer, or runtime dependency of `oxlint-config-setup`.

The template owns these exact development-only tools:

- Biome for formatting and import organization;
- markdownlint-cli2 for Markdown and MDX policy;
- CSpell for spelling and prose;
- Ajv CLI for JSON syntax and project-owned JSON Schema validation; and
- publint plus sort-package-json for package metadata validation and ordering.

The template includes maintained configurations, exact npm and pnpm commands,
VS Code recommendations, a staged-file Husky/lint-staged hook, and a GitHub
Actions workflow. `scripts/test-companion-quality.ts` copies the template to
clean npm and pnpm directories, verifies the full passing stack and ignored
generated artifacts by creating malformed source, Markdown, and JSON files,
executes the installed Husky hook through real Git commits after staging the
complete template, and proves representative failures including a malformed
hook. These tools are not represented as Oxlint rule coverage and do not enter
the standard lint path.

## Decision drivers

- Honest capability boundaries and coverage reporting.
- Use purpose-built tools for non-program formats.
- Avoid retaining an entire runtime for a small set of unrelated checks.
- Allow teams to adopt the Oxlint preset without adopting every quality tool.
- Make the supported companion path executable, versioned, and independently
  reproducible without expanding the published package boundary.

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

### Publish a separate companion package

This would centralize updates, but introduces a second product, publishing and
support contract, and a dependency-management boundary before consumers have
shown that a reusable package API is needed.

### Build an initializer

An initializer could copy files once, but creates a generator runtime and gives
users less transparent control over a small, static set of configuration files.

## Consequences

### Positive

- Oxlint coverage metrics describe files Oxlint actually analyzes.
- Each concern can use a tool with native format understanding.
- Consumers can compose only the repository checks they need.
- Consumers can inspect, copy, and pin every owned configuration without adding
  anything to the Oxlint package installation.
- Maintainers have an executable npm and pnpm compatibility proof instead of a
  prose-only migration matrix.

### Negative

- A complete quality setup may still contain several commands.
- The project must clearly distinguish its core package from companion guidance.
- Predecessor migrations need a checklist for checks that move outside linting.
- Tool upgrades require refreshing both template lockfiles and the clean-fixture
  evidence.

## Validation and review triggers

Maintain a migration matrix that assigns every predecessor concern to Oxlint, a
named companion tool, or an accepted gap. Revisit if Oxlint gains stable native
support for one of these formats; do not treat JavaScript-plugin loadability alone
as proof of format support.

Run `pnpm run test:companion` for every template or tool-version change. The
test must install from both checked-in lockfiles, execute `npm run quality` and
`pnpm run quality`, demonstrate representative failures, and show malformed
generated files are ignored. Reconsider a companion package only when the static
template cannot express a repeated, versioned integration requirement.

## References

- [Oxlint compatibility status][compatibility]
- [Oxlint JavaScript-plugin limitations][js-plugins]
- [Biome organize-imports assist][biome]
- [markdownlint-cli2 configuration][markdownlint]
- [Ajv CLI JSON Schema validation][ajv]

[compatibility]: https://oxc.rs/compatibility.html
[js-plugins]: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
[biome]: https://biomejs.dev/assist/actions/organize-imports/
[markdownlint]: https://github.com/DavidAnson/markdownlint-cli2
[ajv]: https://ajv.js.org/packages/ajv-cli.html

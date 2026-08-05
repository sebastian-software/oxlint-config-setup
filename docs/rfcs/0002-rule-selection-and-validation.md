# RFC 0002: Rule selection and validation policy

- **Status:** Accepted and implemented for v0.1 beta
- **Date:** 2026-08-04
- **Owners:** Sebastian Software

## Summary

Select rules by the defects they prevent, their diagnostic quality, and their
execution risk. Maintain a versioned rule ledger and fixture corpus instead of
treating an ESLint-to-Oxlint migration report as the preset specification.

This policy is how the project can pursue roughly 90% of the predecessor's useful
quality intent without promising 100% rule-name parity.

## Motivation

Rule identifiers are an attractive but weak coverage metric:

- multiple historical rules may collapse into one broader native diagnostic;
- a migrated JavaScript-plugin rule may load but still depend on unsupported APIs;
- JSON, Markdown, or MDX rules do not execute merely because a migration tool can
  classify their names;
- stylistic and low-signal rules count the same as correctness checks;
- experimental and type-aware rules have different upgrade risks.

The preset needs a selection contract that turns current platform capability into
a maintainable quality bar.

## Terminology

- **Defect class:** a user-visible failure mode, such as an unhandled promise or
  an invalid React hook call.
- **Identifier mapping:** a tool reports an existing ESLint rule as supported or
  migratable. This is discovery evidence only.
- **Behavioral coverage:** fixtures prove that the selected execution path catches
  and permits the intended cases.
- **Profile:** a composable group representing project intent, such as `react` or
  `node`, rather than a migration mechanism.
- **Execution path:** native, native type-aware, native experimental, JavaScript
  plugin, companion tool, or accepted gap.

## Proposal

### Rule ledger

Every candidate is recorded in a machine-readable ledger before the stable
release. Each record contains at least:

| Field | Meaning |
| --- | --- |
| `id` | Oxlint or plugin rule identifier |
| `defectClass` | Stable description of the behavior being protected |
| `profile` | Public concern that owns the rule |
| `executionPath` | Native, type-aware, experimental, or named plugin |
| `severity` | Off, warning, or error with rationale |
| `stability` | Stable, version-pinned, or experimental |
| `source` | Primary documentation and predecessor references |
| `fixtures` | Positive and negative behavioral tests |
| `replaces` | Historical rules whose useful intent it subsumes |
| `conflicts` | Rules or tools that must not run alongside it |
| `reviewTrigger` | Version or capability change that requires reevaluation |

Generated configuration and human-readable catalogs derive from this ledger so
documentation cannot silently drift from the package.

### Inclusion gate

A stable profile enables a rule only when all of these are true:

1. The defect class is relevant to the profile and worth enforcing broadly.
2. The rule has an acceptable execution path under the native-first hierarchy.
3. Repository fixtures demonstrate useful diagnostics and representative valid
   code.
4. False-positive, overlap, and autofix behavior are understood.
5. The rule does not create an undocumented dependency on framework version,
   project layout, or unavailable type information.
6. Its cold-start and whole-repository cost fits the profile's performance budget.
7. A maintainer can explain when the rule should be removed or reevaluated.

Rules that fail only the stability gate may enter an explicitly experimental
profile. Rules that fail the value or correctness gates remain off regardless of
compatibility.

### Severity policy

- Correctness defects with reliable diagnostics default to errors.
- Probable defects with contextual exceptions begin as warnings or opt-in rules.
- Stylistic preference does not enter the default preset unless it prevents a
  demonstrated maintenance problem that a formatter cannot own.
- Experimental rules never become default errors in their first release.

### Native and type-aware rules

Native Oxlint rules are evaluated first. Type-aware rules are treated as native
product capability but carry their backend version and project-graph
prerequisites in the ledger.

When a native rule replaces several predecessor rules, fixtures should validate
the shared defect intent. The coverage report may list all replaced identifiers,
but release criteria use the fixtures, not the size of that list.

### React rules

The standard React profile selects only native Oxlint React and JSX rules. It does
not load the historical Meta plugin, a successor React plugin, or `react-hooks`
through the JavaScript compatibility layer simply to increase mapped identifiers.

Experimental native compiler checks live in a separate opt-in profile. Important
gaps are documented by defect class and proposed upstream before a JavaScript
React fallback is considered; changing this restriction requires a new ADR.

### JavaScript-plugin rules

Plugin candidates must pass the normal inclusion gate plus:

- documented Oxlint conformance or a repository-owned compatibility suite;
- a proof that no enabled rule needs custom parsers, custom formats, or TypeScript
  parser services unavailable to JavaScript plugins;
- crash isolation across all supported source extensions;
- a measured startup and execution budget;
- an explicit native replacement/removal trigger.

Candidates should enter through focused optional profiles. The initial research
queue may include regular expressions, testing-library, Playwright, Storybook, and
SonarJS where native coverage is insufficient; appearance in that queue is not an
acceptance decision.

### Scope exclusions

JSON/package metadata, Markdown/MDX, spelling, import sorting, and code formatting
are not counted as missing Oxlint code coverage. They are assigned to companion
tools or recorded as accepted gaps in the migration guide.

## Validation model

### Fixture layers

1. **Rule fixtures:** minimal valid and invalid examples for each ledger record.
2. **Interaction fixtures:** overlapping rules, fixes, and profile combinations.
3. **Project fixtures:** TypeScript projects, project references, React, Node.js,
   and test-framework repositories with realistic configuration.
4. **Migration fixtures:** selected predecessor consumers that reveal practical
   regressions and accepted differences.
5. **Performance fixtures:** cold and warm execution on small and representative
   monorepo-shaped projects.

Fixtures should assert diagnostic identity, file, location, and message category
without unnecessarily freezing wording owned by upstream.

### Upgrade checks

Every supported Oxlint upgrade regenerates a capability snapshot and runs all
fixtures. Upgrades of `oxlint-tsgolint`, TypeScript, or any JavaScript plugin run
their targeted compatibility suites as well. A newly native capability opens a
review to remove the fallback; it does not silently change execution paths.

### Coverage reporting

Release notes report three separate views:

1. defect classes with behavioral fixtures;
2. predecessor identifiers replaced, excluded, or still open;
3. execution paths and their stability level.

Raw identifier percentages may be published as dated research, never as the only
quality claim.

## Initial release gate

A beta is ready when:

- the core, TypeScript, and selected framework profiles have complete ledger
  records and fixtures;
- the full suite runs without ESLint;
- no standard React diagnostic comes from a JavaScript React plugin;
- every optional JavaScript plugin has its own compatibility and performance
  result;
- the migration matrix accounts for every active predecessor concern;
- measured gaps are documented without an arbitrary 100% parity blocker.

## Alternatives considered

### Generate the preset directly from `@oxlint/migrate`

This is fast and remains useful for discovery. Its classifications do not express
signal, profile ownership, unsupported file formats, or acceptable diagnostic
differences.

### Start with all available rules and remove noisy ones

This gives rapid breadth but makes early adopters the false-positive test suite.
It also creates compatibility obligations before the rationale is known.

### Require a fixed 90% identifier threshold

This is easy to communicate but encourages low-value plugin work and depends on
the chosen denominator. Ninety percent remains a useful ambition for quality
intent, not a release equation.

## Risks and mitigations

- **Subjective selection:** require defect classes, fixtures, and recorded
  alternatives for controversial rules.
- **Ledger overhead:** generate public config and docs from the same data.
- **Upstream churn:** pin tested pairs and make execution-path changes explicit.
- **Under-counted gaps:** keep the predecessor migration matrix exhaustive even
  when a concern is excluded from the core package.

## Open questions

- Which concrete performance budgets should block a stable profile?
- Should warning-level rules ship in the default preset or a stricter opt-in set?
- Which predecessor repositories can be used as public migration fixtures?
- What schema and generator language should back the rule ledger?
- Which plugin-backed domains provide enough value for the first beta?

## References

- [Oxlint JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [Oxlint type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [Oxlint versioning and stability](https://oxc.rs/docs/guide/usage/linter/versioning.html)

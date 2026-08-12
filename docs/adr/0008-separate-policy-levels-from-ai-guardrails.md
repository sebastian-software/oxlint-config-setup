# 0008. Separate policy levels from AI guardrails

- **Status:** Accepted
- **Date:** 2026-08-06
- **Last updated:** 2026-08-11
- **Deciders:** Sebastian Software maintainers
- **Supersedes:** [ADR 0007](0007-add-essential-and-standard-config-levels.md)

## Context

The configuration needs to express three independent choices without making
their effects surprising:

1. how much general project policy a team adopts;
2. whether React or Node.js rules apply to the project; and
3. whether automation-friendly AI guardrails should tighten the selected
   policy.

The predecessor `eslint-config-setup` had broad coverage, but its AI mode also
changed composition and could pull in policy beyond the expected base preset.
The first Oxlint implementation avoided that coupling by selecting only
individually reviewed ledger rules. That boundary was predictable, but it left
Recommended with a baseline too small for an opinionated general-purpose
preset.

Oxlint already classifies native rules into stable categories. Those categories
provide a maintained broad baseline. Publishing category switches directly,
however, would keep the exact rule set implicit and would prevent the package's
rule customization helpers from operating consistently on every active rule.

## Decision

Expose three nested policy levels:

1. `essential` enables Oxlint's stable `correctness` category;
2. `recommended` adds `suspicious` and `perf` and remains the default; and
3. `strict` adds `pedantic`, `style`, and `restriction`.

`nursery` stays disabled at every level. Each higher level is a strict
superset of the lower levels. Stable configurable core artifacts use only native
Oxlint plugins; JavaScript plugins do not enter through category expansion.

Category-enabled configurations are internal build drafts. During generation,
the pinned Oxlint binary expands every draft with `--print-config`. The
generator normalizes the result into a complete explicit rule map, turns all
categories off, reapplies curated repository overrides and exclusions, and
publishes only the materialized JSON.

This preserves runtime-free artifact selection and deterministic packaging
while making every effective rule visible and compatible with
`setRuleSeverity`, `configureRule`, `disableRule`, and the other public
customization helpers. An Oxlint dependency upgrade therefore produces
reviewable generated diffs instead of silently changing consumer behavior.

The rule ledger owns curated additions, exclusions, conflicts, option choices,
AI changes, and repository-controlled behavioral evidence. It does not
duplicate the entire upstream category registry.

AI is an overlay, not a fourth policy level or a project context. When `ai` is
enabled, it may do exactly two things:

- modify the severity or options of a level-controlled rule only when that rule
  is already active at the selected level; and
- activate a rule explicitly classified as AI-only and intentionally outside
  the level hierarchy.

AI must not enable another category, activate a higher-level rule, disable an
active rule, or reduce its severity. Option overrides require a rationale and a
behavioral fixture. AI-only rules remain explicit exclusions whenever the
overlay is disabled, even if an upstream category would otherwise activate
them.

React and Node.js remain independent project-context switches. Their native
plugin categories enter only when the corresponding context is selected. The
generator emits all 24 combinations of three levels with React, Node.js, and AI.
Existing unprefixed JSON names select Recommended; Essential and Strict
artifacts use their level prefix.

Mixed repositories use a separate TypeScript-only composition boundary rather
than adding file classes to that matrix. `getComposedOxlintConfig()` selects the
same prebuilt core root, appends explicitly ordered Oxlint file overrides, and
keeps `options.typeAware` on the root. React and Node context deltas are scoped
to selected file globs; Vitest and Jest add native runner rules only to canonical
test patterns. Scripts, config files, and declaration files have narrow native
fragments. Testing Library is an automatic package-owned override on canonical
`*.test.{ts,tsx}` and `__tests__/**/*.{ts,tsx}` patterns and does not add a
public scope or runner dependency. It inherits `flat/dom` from the plugin by
default and `flat/react` when the configuration selects React. Playwright is an
automatic package-owned override on canonical `*.spec.ts` files; it inherits the
plugin's `flat/recommended` preset without a public scope or runner dependency.
Package-created scope identities let public rule helpers target one override and
reject unknown or unselected scopes.

Composition has explicit merge semantics. The root plugin array is the ordered
union of the root and selected fragment plugins. A consumer override is appended
after package fragments and its plugin list is unioned with that required set,
because Oxlint otherwise replaces base plugins for an override. Rule maps,
environments, and globals remain separate Oxlint entries, so later matching
consumer overrides have Oxlint's normal precedence without destructive package
merging. Root loaders select the same complete core artifacts as the public JSON
exports, then append the runtime-resolved Testing Library, Playwright, and
Storybook overrides. Static JSON exports remain core-only because copied JSON cannot
retain those package-relative plugin paths.

Testing Library, Playwright, and Storybook follow the automatic override model
without separate public flags, with upstream-owned preset membership and
package-boundary evidence rather than duplicated per-rule fixture suites.
Storybook is deliberately limited to `*.stories.{ts,tsx}`; `.story.*`, MDX,
custom story globs, and `.storybook/main.*` are outside the automatic contract.

Syntax-only TypeScript remains a narrower named configuration without
type-aware category expansion. The experimental React Compiler remains a
separate named configuration. Vitest and Jest are selected as mutually
exclusive file-scoped policies on canonical test files rather than complete
root configurations.

Exact rule counts are generated product data rather than architecture. They may
change only through a reviewed Oxlint version or policy update and remain
visible in snapshots, homepage data, and package diffs.

## Decision drivers

- Provide a credible general-purpose default in the same broad class as the
  predecessor.
- Match established Essential, Recommended, and Strict preset language.
- Reuse Oxlint's maintained native classification instead of manually
  reclassifying hundreds of upstream rules.
- Keep every published active rule explicit, deterministic, and customizable.
- Keep general policy intensity independent from AI-specific enforcement.
- Prevent Essential plus AI from silently acquiring Recommended or Strict
  policy.
- Keep JavaScript-plugin exceptions file-scoped, removable, and outside static
  core artifacts.

## Options considered

### Maintain an exhaustive hand-authored ledger

This gives every rule a repository-specific rationale, but duplicates upstream
classification work and keeps the useful preset surface too small.

### Publish category switches directly

This is compact, but makes the effective output implicit and weakens the
customization API contract.

### Keep AI as an unrestricted profile

This preserves predecessor flexibility, but makes level meaning dependent on
another flag and permits surprising cross-level activation.

### Materialize native categories and constrain AI

This combines a broad maintained baseline with explicit deterministic output.
The ledger remains focused on decisions the repository actually owns, while AI
cannot widen the selected policy level.

## Consequences

### Positive

- Recommended is a useful broad default and Essential remains a clear first
  adoption step.
- Strict approaches the predecessor's scale through native Oxlint execution
  paths.
- Published JSON exposes every active rule and supports all customization
  helpers.
- Policy levels, project contexts, and AI behavior remain independently
  explainable.
- Oxlint upgrades create explicit generated diffs.
- AI-specific guardrails remain possible without being misclassified as general
  strictness.

### Negative

- Generated artifacts, snapshots, and homepage data are substantially larger.
- Build and documentation generation invoke the pinned Oxlint binary.
- Category-owned rules rely on upstream classification and documentation rather
  than one repository fixture per identifier.
- Strict intentionally includes opinionated restriction rules and may need
  project-specific exceptions.
- An upstream category reassignment can change level membership during a
  reviewed dependency upgrade.
- Each additional selector still multiplies the artifact matrix.
- Composition is a TypeScript configuration path and is not represented by a
  standalone JSON export.
- Scoped helper identities apply only to package-created overrides on the
  returned object; user-authored overrides remain unscoped Oxlint data.

## Validation and review triggers

Tests verify the category-to-level mapping, nested active rule sets, disabled
`nursery`, explicit published rule maps, project-context deltas, AI
constraints, deterministic builds, and clean-consumer execution. Composition
tests cover canonical scope globs, consumer plugin union, rule/environment/global
override behavior, and scoped helper errors. The behavioral harness runs matching
and nonmatching composition fixtures through Oxlint diagnostics for React + Vitest
overlap, Node scripts and configuration files, declaration-only relaxations,
retained consumer plugins, and consumer-override precedence. Generated
effective-config snapshots and
homepage data expose root artifact rule membership.

Review this decision when Oxlint changes its category model, stable categories
produce unacceptable noise, AI-only entries become a policy dumping ground,
materialization materially harms build time or package size, or adopter evidence
suggests a different Recommended baseline.

## References

- [Oxlint configuration](https://oxc.rs/docs/guide/usage/linter/config.html)
- [Oxlint rules and categories](https://oxc.rs/docs/guide/usage/linter/rules.html)
- [Predecessor eslint-config-setup](https://github.com/sebastian-software/eslint-config-setup)
- [Policy-level and AI activation research](../research/2026-08-06-policy-level-and-ai-activation.md)
- [Rule selection and validation RFC](../rfcs/0002-rule-selection-and-validation.md)
- [Generated rule catalog](../rule-catalog.md)

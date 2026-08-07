# Regexp, SonarJS, and Storybook coverage decisions

- **Measured:** 2026-08-07
- **Pinned runtime:** Oxlint 1.77.0
- **Scope:** Resolve the Regexp, SonarJS, and Storybook JavaScript-plugin
  research queue without adding a production profile

## Method and boundary

This review assesses defect classes, not plugin rule totals. Oxlint names all
three plugins as conformance-tested, but describes JavaScript plugins as alpha.
The repository's single-runtime package gate rejects every dependency whose name
contains `eslint`, including a development-only plugin and its lockfile entries.
That makes a pinned, repository-owned JavaScript-plugin fixture unavailable
under the current product contract. This is an intentional boundary, not a
reason to loosen the package verifier for a research candidate.

The project-wide profile model also has no file-scoped composition mechanism.
Consequently, no domain passes the value, ownership, execution, fixture, and
bounded-performance gates for a production or experimental profile. No
implementation issue is proposed or created.

## Decision summary

| Domain | User value | Native overlap and exclusions | Runtime and stability | Performance evidence | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Regexp | A duplicate or unreachable regex alternative can conceal an error or make a repeated pattern needlessly expensive. | Native `eslint/no-invalid-regexp`, `eslint/no-control-regex`, `eslint/no-empty-character-class`, and `eslint/no-regex-spaces` retain syntax and character-class ownership. `regexp/no-invalid-regexp` is removed as a native duplicate. `regexp/no-dupe-disjunctions` is distinct but has no approved execution path. | It requires the alpha JavaScript-plugin API and an `eslint-plugin-regexp` dependency, which the package gate rejects. It is syntax-only but cannot bypass that dependency boundary. | **Not measured.** A performance probe without a permitted, pinned repository-owned runtime would not be reproducible evidence. | **Deferred.** Revisit only if the project explicitly approves an isolated plugin-runtime contract; then add valid/invalid fixtures, native-overlap and fixer-safety tests, and a representative performance budget before proposing implementation. |
| SonarJS | Some rules can identify redundant branches or error-prone flow. | Reject raw complexity and duplication policy: `sonarjs/cognitive-complexity` is a subjective complexity threshold, `sonarjs/no-duplicate-string` is a noisy extraction heuristic, and `sonarjs/no-identical-functions` is a cross-file maintenance heuristic. Native `eslint/no-dupe-else-if` remains the owner of duplicate conditional branches. No remaining candidate demonstrates a distinct, broadly portable defect class. | Would require the alpha JavaScript-plugin path and a prohibited `eslint-plugin-sonarjs` dependency. Rules requiring types, parser services, or custom file handling are excluded. | **Not measured.** No candidate passed the defect-class and noise gates, so a package install or benchmark would measure rejected runtime rather than a proposed profile. | **Deferred.** Do not add a SonarJS dependency or profile; revisit only with a specific syntax-only correctness defect, fixture pair, and bounded representative suite. |
| Storybook | Story-specific interaction and metadata diagnostics can catch unawaited interactions, malformed CSF, and invalid Storybook configuration. | No native Storybook family exists. Native React and JSX accessibility rules continue to cover production `.jsx`/`.tsx` files. Storybook's documented `**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)` scope is required to isolate interaction, CSF metadata, and story-export rules from production React files. MDX is unsupported by the Storybook plugin. | It requires the alpha JavaScript-plugin path, a prohibited `eslint-plugin-storybook` dependency, and a Storybook peer. Oxlint does not supply a Storybook/MDX parser. | **Not measured.** This repository has no story files, and its public configuration cannot express the required file scope. Measuring a global plugin would not prove isolation. | **Deferred pending Issue #32 and an approved isolated plugin runtime.** A later pilot must prove story-only matching and framework behavior with fixtures. |

## Regexp decision

The native rule catalog covers invalid patterns, control characters, empty
character classes, and regex whitespace. Those are the portable defects that
the existing native runtime owns. The Regexp plugin's
`no-dupe-disjunctions` rule would address a separate duplicate-alternative
class, but its documented repair is a manually reviewed editor suggestion, not
a safe automatic mutation. It therefore cannot be proposed without both a
repository-owned fixture pair and an explicit fixer-safety assertion.

Adding the plugin for that evidence fails the existing package gate because the
manifest and lockfile must remain free of ESLint-named dependencies. The decision
is to defer the candidate rather than create a hidden test-only exception. If an
isolated runtime is later approved, its implementation issue must:

1. add only the distinct duplicate-alternative rule and preserve the native
   syntax-rule owners;
2. add valid/invalid and native-overlap fixtures plus a non-mutating `--fix`
   check;
3. measure a representative consumer-shaped suite with a regression budget; and
4. make the profile opt-in, alpha-labeled, and reviewable on every Oxlint minor
   release or native Regexp replacement.

## SonarJS exclusions

SonarJS has a large mixed rule surface, which is precisely why it is not a
profile boundary. `cognitive-complexity` and duplicate-string/function rules
encode local maintenance preferences without a portable correctness threshold.
`no-duplicate-string` has documented test-code noise concerns; it is not a
replacement for a demonstrated defect. `no-all-duplicated-branches` and related
conditional rules must be compared with the existing native branch diagnostics
before any future selection, not enabled as a group.

Native duplicates and unsupported paths are explicitly removed from
consideration: native category diagnostics retain their ownership, and no
JavaScript-plugin rule that requires TypeScript parser services, a custom parser,
or a custom file format is eligible. The dependency gate is an additional
runtime constraint, not a substitute for the defect-class and performance gates.

## Storybook scope evidence

Storybook documents the story glob
`**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)` for rule overrides and explicitly says
that its plugin does not support MDX. Its interaction rules include
`storybook/await-interactions` and `storybook/context-in-play-function`; its
metadata rules include default export, component, and story export checks. Those
are valuable only for the matching story files and `.storybook` configuration,
not for production React components.

The repository's `PROFILE_ORDER` has only project-wide React and JSX
accessibility profiles. It cannot represent the documented story glob, and
`find . -type f \( -name '*.stories.*' -o -name '*.story.*' \)` found no story
fixtures in this checkout. Issue #32 owns canonical scoped-target composition.
Until it lands, a Storybook plugin would either miss stories or apply
Storybook-specific rules to production `.tsx` files; both fail the isolation
gate.

## Review triggers and primary references

Rerun the decisions when Oxlint changes JavaScript-plugin stability or its
native regexp and branch rule surface; when the project changes its
single-runtime dependency contract; or when Issue #32 supplies file-scoped
composition. Review SonarJS only when a specific syntax-only correctness
candidate has repository evidence. Review Storybook when its parser/file support
or the project's canonical story patterns change.

- [Oxlint JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [Oxlint native rule catalog](https://oxc.rs/docs/guide/usage/linter/rules.html)
- [Regexp `no-dupe-disjunctions` rule](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-dupe-disjunctions.html)
- [SonarJS source and rule implementation](https://github.com/SonarSource/sonarjs)
- [Storybook ESLint plugin](https://storybook.js.org/docs/configure/integration/eslint-plugin)
- [Oxlint supported source extensions](https://oxc.rs/docs/guide/usage/linter.html)

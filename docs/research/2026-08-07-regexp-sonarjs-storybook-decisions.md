# Regexp, SonarJS, and Storybook coverage decisions

- **Measured:** 2026-08-07
- **Pinned runtime:** Oxlint 1.77.0
- **Pinned product baseline:** `oxlint-config-setup` 0.1.1 at
  [`53fe5c554db83e8c95169458d0f7b6ae8533d361`][product-baseline]
- **Pinned predecessor:** `eslint-config-setup` at
  [`4543246c62326047f7372765931f260f04beea56`][predecessor]
- **Pinned research inputs:** `eslint-plugin-regexp` 3.1.1
  ([`8ca0cb78cf5a83f3320916ef7bd904eb9382ed56`][regexp-source]),
  `eslint-plugin-sonarjs` 3.0.5
  ([`c474a31cb640ab5dc09a12ebf2c654725b6984bf`][sonarjs-source]), and
  `eslint-plugin-storybook` 0.12.0
  ([`3f7508794231f931f0d1c80d7be1c05bab713739`][storybook-source]) with
  `@storybook/csf` 0.1.11
  ([`4630c856c9dee1f54e239de89d4ae66b0fc287c1`][csf-source])
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
The pinned packages above are source inputs, not dependencies: none is added to
the manifest or lockfile. Consequently, no domain passes the value, ownership,
execution, fixture, and bounded-performance gates for a production or
experimental profile. No implementation issue is proposed or created.

The evaluated candidate sets are deliberately small and defect-class based:

| Domain | Candidate input from the pinned source | Disposition by defect class |
| --- | --- | --- |
| Regexp | `regexp/no-invalid-regexp`, `regexp/no-dupe-disjunctions` | The invalid-pattern rule duplicates native syntax ownership. The duplicate-alternative rule is distinct, but its manual suggestion needs an approved runtime and fixture evidence. |
| SonarJS | `sonarjs/no-all-duplicated-branches`, `sonarjs/no-duplicated-branches`, `sonarjs/cognitive-complexity`, `sonarjs/no-duplicate-string`, `sonarjs/no-identical-functions` | The two branch rules cover distinct all-branch and pairwise if/switch paths; the former also covers ternaries. Neither has a demonstrated equivalent native owner. They are deferred candidates pending runtime, fixture, and performance evidence. The remaining rules are, respectively, subjective complexity, noisy extraction, and a cross-file maintenance heuristic. |
| Storybook | `storybook/await-interactions`, `storybook/context-in-play-function`, `storybook/csf-component`, `storybook/default-exports`, `storybook/story-exports` | Interaction and CSF/export defects have user value only when they are restricted to the consuming project's configured stories. No global profile is eligible. |

## Decision summary

| Domain | User value | Native overlap and exclusions | Runtime and stability | Performance evidence | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Regexp | A duplicate or unreachable regex alternative can conceal an error or make a repeated pattern needlessly expensive. | Native `eslint/no-invalid-regexp`, `eslint/no-control-regex`, `eslint/no-empty-character-class`, and `eslint/no-regex-spaces` retain syntax and character-class ownership. `regexp/no-invalid-regexp` is removed as a native duplicate. `regexp/no-dupe-disjunctions` is distinct but has no approved execution path. | It requires the alpha JavaScript-plugin API and an `eslint-plugin-regexp` dependency, which the package gate rejects. It is syntax-only but cannot bypass that dependency boundary. | **Not measured.** A performance probe without a permitted, pinned repository-owned runtime would not be reproducible evidence. | **Deferred.** Revisit only if the project explicitly approves an isolated plugin-runtime contract; then add valid/invalid fixtures, native-overlap and fixer-safety tests, and a representative performance budget before proposing implementation. |
| SonarJS | Redundant conditional bodies can conceal a copy/paste logic error and create divergent maintenance paths. | `sonarjs/no-all-duplicated-branches` has distinct fully equivalent if, switch, and ternary paths; predecessor-selected `sonarjs/no-duplicated-branches` has distinct pairwise if/switch paths. Strict `oxc/branches-sharing-code` is If-only shared-prefix/suffix detection, and native `eslint/no-dupe-else-if` owns repeated tests, not bodies. Reject `sonarjs/cognitive-complexity` as a subjective threshold, `sonarjs/no-duplicate-string` as a noisy extraction heuristic, and `sonarjs/no-identical-functions` as a cross-file maintenance heuristic. | Would require the alpha JavaScript-plugin path and a prohibited `eslint-plugin-sonarjs` dependency. Rules requiring types, parser services, or custom file handling are excluded. | **Not measured.** The two deferred branch candidates have no permitted runtime, repository-owned valid/invalid/native-overlap fixtures, fixer-safety evidence, or bounded representative suite. | **Deferred.** Do not add a SonarJS dependency or profile. Revisit the two branch candidates only with an approved isolated runtime, per-path fixtures, native-overlap evidence, and a bounded representative suite. |
| Storybook | Story-specific interaction and metadata diagnostics can catch unawaited interactions, malformed CSF, and invalid Storybook configuration. | No native Storybook family exists. Native React and JSX accessibility rules continue to cover production `.jsx`/`.tsx` files. Both documented `*.stories.*` and `*.story.*` conventions must be constrained to the consumer's `.storybook/main.*` `stories` value, never a project-wide React glob. MDX is unsupported by the plugin. | The pinned plugin has only an ESLint peer and packages `@storybook/csf`; it does **not** declare a Storybook peer. It still requires the alpha JavaScript-plugin path and prohibited `eslint-plugin-storybook` dependency. Oxlint does not supply a Storybook/MDX parser. | **Not measured.** This repository has no story files, and its public configuration cannot express the required file scope. Measuring a global plugin would not prove isolation. | **Deferred pending Issue #32 and an approved isolated plugin runtime.** A later pilot must prove story-only matching and framework behavior with fixtures. |

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

## SonarJS branch evaluation and exclusions

The pinned source shows two separate branch-body defect classes. They have
maintainability value and can reveal a copy/paste logic error, but neither is an
accepted rule: both fail the current runtime, fixture, fixer-safety, and bounded
performance gates.

| Candidate | Exact syntax paths | Native comparison at Oxlint 1.77.0 | Decision |
| --- | --- | --- | --- |
| [`sonarjs/no-all-duplicated-branches`][sonarjs-no-all-duplicated-branches] | Fully equivalent `if` chains with an `else`, `switch` statements with a `default`, and conditional expressions. | [`oxc/branches-sharing-code`][branches-sharing-code-source] visits only `IfStatement` and reports a shared non-total prefix or suffix; it does not own fully equal bodies, switches, or ternaries. `eslint/no-dupe-else-if` owns repeated tests only. | **Deferred candidate.** Add valid/invalid/native-overlap fixtures for all three paths and a non-mutating fixer check before proposing a profile. |
| [`sonarjs/no-duplicated-branches`][sonarjs-no-duplicated-branches] | Equivalent pairs within `if` chains and `switch` cases, including but not limited to an all-duplicated structure. It is enabled by the [pinned predecessor config][predecessor-sonarjs-config]. | No equivalent native pairwise-branch owner is demonstrated. The two native rules above remain narrower and differently scoped. | **Deferred candidate.** Add separate if/switch valid/invalid/native-overlap fixtures and a bounded suite before proposing a profile. |

The distinction is material: `no-all-duplicated-branches` includes the ternary
path that `no-duplicated-branches` does not, while `no-duplicated-branches`
reports pairwise duplicated if/switch bodies that need not make every branch
equal. Neither rule is proposed for implementation, and no implementation issue
is created.

SonarJS has a large mixed rule surface, which is precisely why it is not a
profile boundary. `cognitive-complexity` and duplicate-string/function rules
encode local maintenance preferences without a portable correctness threshold.
`no-duplicate-string` has documented test-code noise concerns; it is not a
replacement for a demonstrated defect. These three candidates are rejected on
the value/noise gate, independently of the dependency gate.

Native duplicates and unsupported paths are explicitly removed from
consideration: native category diagnostics retain their ownership, and no
JavaScript-plugin rule that requires TypeScript parser services, a custom parser,
or a custom file format is eligible. The dependency gate is an additional
runtime constraint, not a substitute for the defect-class and performance gates.

## Storybook scope evidence

The pinned `eslint-plugin-storybook` package declares `eslint` as its only peer
and brings `@storybook/csf` 0.1.11 as a dependency. It is therefore inaccurate
to describe this input as requiring a Storybook peer. Its CSF dependency is not
framework support: the Storybook 9 primary framework matrix marks CSF stories
and interactions for React, Vue 3, Angular, and Web Components, while the
plugin research boundary remains script-based JavaScript, TypeScript, JSX, and
TSX only. It makes no claim for MDX or framework-template story files; the
plugin documentation explicitly excludes MDX.

Storybook documents both `**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)` and
`**/*.story.@(ts|tsx|js|jsx|mjs|cjs)` as recommended story conventions. Its
override must match the consumer's `.storybook/main.*` `stories` property, which
may instead be a custom glob or a `StoriesSpecifier`. A future scoped-composition
contract must carry that configured scope as data; it must not substitute either
default glob. Its interaction rules include `storybook/await-interactions` and
`storybook/context-in-play-function`; its metadata rules include default export,
component, and story export checks. Those are valuable only for the configured
story scope and `.storybook` configuration, never for production React
components.

The repository's `PROFILE_ORDER` has only project-wide React and JSX
accessibility profiles. It cannot represent the documented story scope, and
`find . -type f \( -name '*.stories.*' -o -name '*.story.*' \)` found no story
fixtures in this checkout. Issue #32 owns canonical scoped-target composition.
Until it lands, a Storybook plugin would either miss consumer-defined stories or
apply Storybook-specific rules to production `.tsx` files; both fail the
isolation gate. Any later Storybook issue must depend on #32 and include:

1. fixtures for both documented singular and plural story conventions across
   JavaScript, TypeScript, JSX, and TSX, a consumer-defined `stories` scope, and
   an explicit rejection fixture for a production React file;
2. framework/CSF evidence for the pinned React, Vue 3, Angular, and Web
   Components boundary, distinguishing supported script-based files from
   unsupported MDX or framework-template stories;
3. valid/invalid cases for each accepted interaction, accessibility, or metadata
   rule; and
4. a story-only performance measurement with the plugin and any consumer-
   selected Storybook runtime versions pinned.

## Review triggers and primary references

Rerun the decisions when Oxlint changes JavaScript-plugin stability or its
native regexp and branch rule surface; when the project changes its
single-runtime dependency contract; or when Issue #32 supplies file-scoped
composition. Review the note when any pinned source package, the Storybook 9
framework/CSF matrix, or the predecessor revision changes. Review the two
deferred SonarJS branch candidates when Oxlint changes the native branch-rule
surface or an approved runtime can supply their per-path fixture, fixer-safety,
and bounded-performance evidence. Review Storybook when its parser/file support
or the project's canonical story patterns change.

- [Oxlint JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [Oxlint native rule catalog](https://oxc.rs/docs/guide/usage/linter/rules.html)
- [Regexp `no-dupe-disjunctions` rule](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-dupe-disjunctions.html)
- [SonarJS 3.0.5 package input][sonarjs-package]
- [Storybook ESLint plugin][storybook-plugin-docs]
- [Storybook 9 framework support][storybook-frameworks]
- [Oxlint supported source extensions](https://oxc.rs/docs/guide/usage/linter.html)

[product-baseline]: https://github.com/sebastian-software/oxlint-config-setup/tree/53fe5c554db83e8c95169458d0f7b6ae8533d361
[predecessor]: https://github.com/sebastian-software/eslint-config-setup/tree/4543246c62326047f7372765931f260f04beea56
[regexp-source]: https://github.com/ota-meshi/eslint-plugin-regexp/commit/8ca0cb78cf5a83f3320916ef7bd904eb9382ed56
[sonarjs-source]: https://github.com/SonarSource/SonarJS/commit/c474a31cb640ab5dc09a12ebf2c654725b6984bf
[storybook-source]: https://github.com/storybookjs/storybook/commit/3f7508794231f931f0d1c80d7be1c05bab713739
[csf-source]: https://github.com/ComponentDriven/csf/commit/4630c856c9dee1f54e239de89d4ae66b0fc287c1
[sonarjs-no-all-duplicated-branches]: https://github.com/SonarSource/SonarJS/blob/c474a31cb640ab5dc09a12ebf2c654725b6984bf/packages/jsts/src/rules/S3923/rule.ts
[sonarjs-no-duplicated-branches]: https://github.com/SonarSource/SonarJS/blob/c474a31cb640ab5dc09a12ebf2c654725b6984bf/packages/jsts/src/rules/S1871/rule.ts
[predecessor-sonarjs-config]: https://github.com/sebastian-software/eslint-config-setup/blob/4543246c62326047f7372765931f260f04beea56/packages/eslint-config/src/configs/sonarjs.ts
[branches-sharing-code-source]: https://github.com/oxc-project/oxc/blob/9a423f2f485b79c2353c49442c0c7f60f900261d/crates/oxc_linter/src/rules/oxc/branches_sharing_code.rs
[sonarjs-package]: https://www.npmjs.com/package/eslint-plugin-sonarjs/v/3.0.5
[storybook-plugin-docs]: https://storybook.js.org/docs/9/configure/integration/eslint-plugin
[storybook-frameworks]: https://storybook.js.org/docs/9/configure/integration/frameworks-feature-support

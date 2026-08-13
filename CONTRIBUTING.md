# Contributing

The project combines design records with a published pre-1.0 package. Small,
reviewable pull requests are preferred over a single large specification dump.

## Project language

US English (`en-US`) is the canonical language for project-authored text. Use
American spelling, vocabulary, and punctuation in documentation, code comments,
package metadata, diagnostics, release notes, issues, and pull requests.

Keep API names, code identifiers, product and organization names, URLs, verbatim
quotations, and external titles unchanged. Localized user-facing surfaces may
define an explicit alternative locale; otherwise, US English is their source and
fallback language. [ADR 0006](docs/adr/0006-use-us-english-as-the-project-language.md)
records the scope and rationale.

## Proposal types

- **RFCs** live in `docs/rfcs/` and specify product behavior, user experience,
  rule policy, or validation requirements. New RFCs begin as `proposed`.
- **ADRs** live in `docs/adr/` and preserve durable architectural decisions.
  Accepted ADRs are living records; update the existing ADR in place when its
  decision evolves instead of creating a successor for the update.
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

## Package checks

The repository uses the pnpm version pinned in `package.json`. Run the complete
production package gate from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run release:check
```

Package and toolchain pins are owned by `package.json` and
`scripts/expected-toolchain.ts`. Update both in the same dependency change;
package verification, generated statistics, public documentation, and the
release gate derive from or validate against that shared expected-version
module.

All repository scripts are TypeScript. `tsx` executes them, `tsc --noEmit`
checks them, and tsdown builds the publishable ESM and declarations. The package
verifier performs two clean byte-identical builds, verifies the exact tarball,
and installs it into clean npm and pnpm consumers.

The pinned Oxlint categories provide the broad native rule baseline. Every
curated addition, exclusion, conflict, option choice, AI change, or named-rule
boundary starts in `src/ledger.ts` with complete rationale, ownership,
activation, source, fixture, replacement, and review-trigger metadata. Add its
valid and invalid case under `fixtures/rules/`, then run `pnpm generate`.

The generated rule catalog and effective-config snapshots are committed source
artifacts; `pnpm generate:check` rejects drift. An Oxlint upgrade must review
the complete materialized rule diff in addition to any ledger changes.

`essential` materializes `correctness`. `recommended` adds `suspicious`
and `perf` and is the default. `strict` adds `pedantic`, `style`, and
`restriction`; `nursery` remains off. Every higher level must remain a
strict superset of the lower levels. Levels control membership only: a curated
rule's base severity and options remain identical in every level where it is
active. Policy changes update
[ADR 0008](docs/adr/0008-separate-policy-levels-from-ai-guardrails.md) in place
and adjust the corresponding schema, generators, and tests.

AI activation is not a policy level. An AI override may only tighten the
severity or options of an already-active level rule and needs a rationale plus a
behavioral fixture. An AI-only rule must address an automation-friendly
guardrail whose manual enforcement cost makes it unsuitable for the general
level hierarchy. AI entries must not be used to bypass a level classification,
and AI must never disable or weaken an active rule. Named activation is reserved
for the Vitest, Jest, and React Compiler execution contracts.

AI severity and option overrides use the public rule-helper transformations.
`configureRule` recursively merges plain option objects and replaces arrays,
scalars, and `null`. Ledger entries should declare only the values the AI
overlay intends to tighten; unspecified base options remain active.

Do not commit `dist` or its generated release JSON. Those files are deterministic
package output created by `build` and `prepack`; CI rejects tracked release output
and tracked changes caused by the package gate.

## Documentation site

The Ardo workspace in `docs/` contains the public product homepage, guides,
reference, and generated API documentation. Run it locally from the repository
root:

```sh
pnpm docs:dev
```

Run `pnpm docs:check` before submitting documentation or public API changes. The
check generates configuration statistics and the routed rule catalog, lints and
type-checks the workspace, performs Ardo link and frontmatter validation, builds
every static route, and verifies the required product contract in the output.

Use [docs/PRODUCT.md](docs/PRODUCT.md) for audience, voice, and evidence rules and
[docs/DESIGN.md](docs/DESIGN.md) for the visual and interaction system. Durable
framework and register choices are recorded in
[ADR 0009](docs/adr/0009-use-ardo-for-the-product-and-documentation-site.md).

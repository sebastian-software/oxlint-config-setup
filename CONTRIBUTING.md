# Contributing

The project combines design records with an executable pre-beta package. Small,
reviewable pull requests are preferred over a single large specification dump.

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

## Package checks

The repository uses the pnpm version pinned in `package.json`. Run the complete
production package gate from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run release:check
```

All repository scripts are TypeScript. `tsx` executes them, `tsc --noEmit`
checks them, and tsdown builds the publishable ESM and declarations. The package
verifier performs two clean byte-identical builds, verifies the exact tarball,
and installs it into clean npm and pnpm consumers.

Every enabled rule starts in `src/ledger.ts` with complete rationale, ownership,
source, fixture, conflict, replacement, and review-trigger metadata. Add its
valid and invalid case under `fixtures/rules/`, then run `pnpm generate`.
The generated rule catalog and effective-config snapshots are committed source
artifacts; `pnpm generate:check` rejects drift.

Do not commit `dist` or its generated release JSON. Those files are deterministic
package output created by `build` and `prepack`; CI rejects tracked release output
and tracked changes caused by the package gate.

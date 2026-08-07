# Companion quality template

This is the turnkey companion stack for concerns intentionally outside Oxlint.
It is a repository-owned starter, not a dependency of
`oxlint-config-setup`. Copy the template root (including dotfiles and both
lockfiles) into a new repository, then merge the configuration files into an
existing repository deliberately.

## Install and run

Use one package manager per checkout. The checked-in lockfiles make both paths
reproducible:

```sh
npm ci
npm run quality
```

```sh
pnpm install --frozen-lockfile
pnpm run quality
```

Apply safe formatting, import organization, Markdown fixes, and package-key
ordering before committing:

```sh
npm run quality:fix
```

```sh
pnpm run quality:fix
```

## Ownership and commands

| Concern | Tool | Maintained configuration | Check command | Fix command |
| --- | --- | --- | --- | --- |
| Formatting and import organization | Biome | `biome.json` | `quality:format` | `biome check --write .` |
| Markdown and MDX | markdownlint-cli2 | `.markdownlint-cli2.jsonc` | `quality:markdown` | `markdownlint-cli2 --fix` |
| Spelling and prose | CSpell | `cspell.json` | `quality:spelling` | Review diagnostics; add approved terms sparingly |
| JSON syntax and schema | Ajv CLI | `config/app.schema.json` | `quality:json` | Edit the data or schema intentionally |
| Package metadata and ordering | publint and sort-package-json | `package.json` | `quality:package` | `sort-package-json package.json` |

`quality` runs every check in that order. The template pins each tool exactly in
`devDependencies`; update a tool only with a fresh clean-fixture run.

## Generated and ignored files

`generated/`, `dist/`, `coverage/`, and `node_modules/` are excluded in every
tool configuration and in `.gitignore`. The clean-fixture verifier creates
malformed generated source, Markdown, and JSON files before running `quality`;
the passing command proves that ignored generated artifacts cannot block checks.
Only add a generated path after its source and regeneration command are clear.

## Editor, pre-commit, and CI

Install the recommended VS Code extensions in `.vscode/extensions.json`. The
settings file enables Biome formatting plus explicit Biome organize-imports and
fix actions on save. CSpell and markdownlint read the same repository
configuration in their respective extensions.

`npm ci` and `pnpm install --frozen-lockfile` run Husky's `prepare` hook. The
`.husky/pre-commit` hook invokes `lint-staged`, so staged code and JSON are
formatted, staged Markdown/MDX receives markdownlint fixes, and staged prose is
spell-checked. Run it directly when diagnosing a hook:

```sh
npm exec -- lint-staged
```

```sh
pnpm exec lint-staged
```

`.github/workflows/quality.yml` runs the same frozen pnpm installation and
`pnpm run quality` in pull requests and on `main`. Keep CI on the full command;
the pre-commit hook is intentionally a fast staged-file check, not a replacement
for repository-wide validation. The repository clean-fixture verifier proves
both npm and pnpm install the executable hook, run it through a real Git commit,
and reject a malformed distributed hook.

## Evidence

Biome documents its formatter and
[organize-imports assist](https://biomejs.dev/assist/actions/organize-imports/).
[markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) supports
repository configuration and glob-based Markdown checks. CSpell owns prose
spelling, while [Ajv CLI](https://ajv.js.org/packages/ajv-cli.html) validates
JSON against JSON Schema and exits nonzero for invalid data. publint validates
published-package shape, and sort-package-json gives package metadata a stable
key order.

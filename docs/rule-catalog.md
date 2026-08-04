# Initial rule capability catalog

This is a product-level inventory, not yet the generated rule ledger proposed by
RFC 0002. It prevents early implementation work from confusing profiles with
plugin packages or migration buckets.

| Concern | Initial route | Release posture | Notes |
| --- | --- | --- | --- |
| JavaScript correctness | Native Oxlint | Core | Stable, high-signal rules first |
| TypeScript syntax | Native Oxlint | Core | Compose with type-aware coverage |
| TypeScript semantics | Native type-aware + `oxlint-tsgolint` | Core with version matrix | Requires project graph and fixtures |
| Imports and modules | Native Oxlint | Core | Test overlap with Node.js rules |
| React and JSX | Native Oxlint | Optional stable profile | No JavaScript React plugin |
| React compiler diagnostics | Native experimental rule | Experimental opt-in | Review stability and diagnostic breadth |
| JSX accessibility | Native Oxlint | Optional with UI profiles | Validate framework-specific false positives |
| Node.js | Native Oxlint | Optional stable profile | Separate ESM and CommonJS expectations |
| Vitest/Jest | Native Oxlint where adequate | Optional framework profiles | Add plugin fallbacks only for proven gaps |
| Regular expressions | Native review, then conformant plugin candidate | Research | Accept only a focused, measured subset |
| Testing Library | JavaScript-plugin candidate | Research | Custom API and performance suite required |
| Playwright | JavaScript-plugin candidate | Research | Custom API and performance suite required |
| Storybook | JavaScript-plugin candidate | Research | Confirm source extensions and parser needs |
| SonarJS | JavaScript-plugin candidate | Research | Select defect rules; avoid volume as a goal |
| React ESLint ecosystems | None | Excluded | Native React policy supersedes plugin parity |
| Sorting and formatting | Formatter or separate tool | Outside core | Do not spend linter budget on layout |
| JSON and package metadata | Schema/package tool | Companion guidance | Not counted as Oxlint source coverage |
| Markdown and MDX | Markdown-aware tool | Companion guidance | Custom formats are outside plugin support |
| Spelling | Spell checker | Companion guidance | Repository quality, not program linting |
| Project-specific AI rules | Evaluate by defect class | Research | Generalize useful rules; exclude policy trivia |

## Next catalog pass

The next pass should expand each accepted concern into individual ledger entries,
attach fixtures, and identify predecessor rules that are replaced, intentionally
dropped, or assigned to companion tools. No row marked `Research` is approved for
the published default merely by appearing here.

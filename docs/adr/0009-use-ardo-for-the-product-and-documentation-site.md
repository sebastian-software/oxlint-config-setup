# 0009. Use Ardo for the product and documentation site

- **Status:** Accepted
- **Date:** 2026-08-06
- **Last updated:** 2026-08-12
- **Deciders:** Sebastian Software maintainers

## Context

The package needs a public surface that can explain its position before asking a
visitor to read configuration reference material. The repository already owns
precise README, adoption, RFC, ADR, and generated rule-catalog content, but a
repository tree does not provide a coherent product narrative, searchable
documentation, or a stable API reference.

The predecessor project proved a useful split: a marketing homepage makes the
case for the product, while the documentation shell remains optimized for
reading. Reusing that product pattern should not preserve the predecessor's
ESLint/Oxlint hybrid message or its older documentation-stack integration.

## Decision

Maintain a dedicated `docs/` workspace built with Ardo, React, React Router, and
Vite. Ardo is the canonical public documentation framework and supplies the
static shell, navigation, search, Markdown/MDX rendering, TypeDoc integration,
link validation, and agent-readable documentation outputs.

The homepage uses the persuade register for TypeScript maintainers evaluating
the package. Its primary action is copying the supported install command, with
the getting-started guide as the next path. It uses a precise, candid,
engineering-oriented voice and supports claims with repository artifacts rather
than testimonials or estimated metrics.

The primary homepage promise is the verified product mechanism: complete,
prebuilt configurations combine native Oxlint coverage with the pinned
type-aware TypeScript backend, enabled by default across the configurable policy
levels. Package-owned Testing Library, Playwright, and Storybook compatibility
runtimes extend that single Oxlint process only for canonical test, spec, and
story files. Policy levels, project contexts, and AI guardrails support this
promise instead of competing with it. Competitive novelty claims such as
"first" or "only" require dated comparison evidence; without that evidence,
public copy states the mechanism and its user-facing consequence rather than
broad market superiority.

Long-form guides, reference pages, and generated API documentation use the read
register. They prioritize predictable navigation, code examples, prerequisites,
and exact behavior over homepage art direction.

The visual direction is precision and analysis with editorial-minimalist
influence:

- product artifacts, configuration output, and verified counts are the visual
  evidence;
- hierarchy comes from typography, alignment, spacing, and hairline borders;
- one restrained green accent communicates selected and verified states;
- motion is limited to user-triggered state feedback and disappears under
  reduced-motion preferences; and
- generic card grids, decorative gradients, invented screenshots, and unsupported
  social proof are excluded.

Exact copy, tokens, spacing, component behavior, and dependency versions remain
owned by the `docs/` workspace rather than this ADR.

## Decision drivers

- Preserve the predecessor's successful marketing-versus-reference separation.
- Keep the documentation stack inside the React and TypeScript ecosystem used by
  the maintainers.
- Generate static, searchable pages that work on GitHub Pages or another static
  host.
- Connect public claims to the package's deterministic source artifacts.
- Make the combination of complete native and type-aware coverage easy to
  understand without relying on an unverifiable category claim.
- Give contributors and coding agents one discoverable documentation surface.

## Options considered

### Keep repository Markdown only

This has the lowest tooling cost, but it leaves product positioning, navigation,
search, API generation, and responsive reading to the source host.

### Use a generic hosted documentation platform

This could reduce local framework maintenance, but it would separate the public
surface from the repository's React components and make the marketing homepage
less directly reviewable with product changes.

### Use Ardo for both surfaces

Ardo keeps the content and custom homepage in one static React workspace while
allowing the homepage and documentation pages to use different registers. It
also continues a framework already used successfully by the predecessor.

## Consequences

### Positive

- Visitors get one coherent path from product promise to installation and
  detailed reference.
- Marketing numbers can be generated from the same package source as release
  artifacts.
- Search, TypeDoc, link validation, and agent-readable exports are part of the
  build rather than separate publishing systems.
- The homepage can remain distinctive without compromising documentation
  readability.

### Negative

- The repository gains a frontend workspace, dependencies, and a separate build
  gate.
- Changes to package options or public APIs may require corresponding homepage
  and guide updates.
- A static deployment target still needs to be configured separately; adopting
  Ardo does not authorize an external deployment by itself.

## Validation and review triggers

CI type-checks and statically builds the Ardo workspace, verifies expected
routes and the type-aware-by-default promise in the generated output, and
rejects drift in generated configuration statistics. Interactive controls must
remain keyboard-operable, screen-reader named, responsive, and usable with
reduced motion.

Review this decision if Ardo can no longer produce the required static output,
the product needs authenticated or server-backed documentation, the homepage
audience changes materially, or maintaining the custom surface costs more than
its product value.

## References

- [US English project-language decision](0006-use-us-english-as-the-project-language.md)
- [Product contract](../rfcs/0001-product-contract.md)
- [Policy-level and AI decision](0008-separate-policy-levels-from-ai-guardrails.md)
- [Ardo](https://github.com/sebastian-software/ardo)

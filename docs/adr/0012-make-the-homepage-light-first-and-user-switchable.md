# 0012. Make the homepage light-first and user-switchable

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Sebastian Software maintainers

## Context

ADR 0009 established an editorial-minimalist homepage built from product
artifacts, restrained color, and typographic hierarchy. The initial
implementation used a fixed dark presentation and an unusually large display
scale. Its content and information architecture are strong, but the presentation
makes scanning harder than necessary and creates an avoidable visual break from
the documentation shell.

Ardo already provides an accessible theme control with light, dark, and system
preferences. The homepage can participate in that system without adding a
second preference store or custom client-side theme logic.

## Decision

Make the homepage light-first and support light, dark, and system preferences
through Ardo's built-in theme control. The control remains available in desktop
and mobile navigation, and the static-site contract verifies that its accessible
name is rendered.

Define semantic homepage tokens for both light and dark themes. Dark mode is an
independently tuned mapping with equivalent hierarchy and contrast, not a color
inversion. Code examples may retain a dark technical surface in either theme
when that improves source readability.

Use bounded responsive typography. The hero remains the largest editorial
element without occupying most of a desktop viewport, section headings remain
clearly subordinate, and prose keeps a readable measure. Preserve the existing
homepage content, section order, product artifacts, sharp geometry, restrained
green accent, and interaction semantics established by ADR 0009.

Exact color values, type sizes, and breakpoints remain owned by the homepage
stylesheet and design guide rather than this ADR.

## Decision drivers

- Improve scanning and reading without weakening the existing product story.
- Respect visitors' visual preferences across the homepage and documentation.
- Reuse Ardo's accessible, persisted theme behavior.
- Keep light and dark presentations intentional and testable.
- Preserve the distinctive flat, technical visual language from ADR 0009.

## Options considered

### Keep a fixed dark homepage

This preserves the initial implementation, but it keeps the oversized visual
weight and ignores the theme preference already available in the site shell.

### Switch to a fixed light homepage

This improves continuity with the reading surface, but it removes a useful
preference and makes the homepage behave differently from the documentation.

### Use a light-first homepage with Ardo's theme control

This provides a calmer default while retaining user choice and one shared theme
contract. It avoids duplicate state, storage, and hydration behavior.

## Consequences

### Positive

- The homepage is calmer and easier to scan at common desktop and mobile sizes.
- Theme preference applies coherently across marketing and documentation pages.
- Existing copy, routes, controls, and generated product evidence remain intact.
- Theme behavior stays owned by the documentation framework instead of custom
  homepage JavaScript.

### Negative

- Homepage changes must be reviewed in both light and dark themes.
- Semantic color tokens add a second visual mapping to maintain.
- Dark code surfaces in light mode introduce a deliberate mixed-surface design
  that requires ongoing contrast review.

## Validation and review triggers

CI statically builds the documentation site and verifies the theme control's
accessible name. Visual changes must preserve responsive layouts, keyboard and
forced-colors behavior, reduced-motion support, browser zoom, and WCAG AA text
contrast in both theme mappings.

Review this decision if Ardo changes its theme contract, the product adopts a
different design system, or user research shows that another default materially
improves comprehension.

## References

- [Ardo site decision](0009-use-ardo-for-the-product-and-documentation-site.md)
- [Documentation design system](../DESIGN.md)
- [Homepage stylesheet](../app/homepage.css)

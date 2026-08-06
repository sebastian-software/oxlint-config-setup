# Documentation design system

## Direction

The homepage combines precision-and-analysis structure with editorial-minimalist
typography. The documentation shell remains optimized for sustained reading.
The shared product should feel deliberate, technical, and calm rather than like
a generic SaaS template.

## Visual rules

- Use product artifacts, generated configuration output, rule counts, and source
  links as the primary visual material.
- Build hierarchy with type scale, spacing, alignment, and one-pixel rules.
- Reserve the green accent for selection, verification, focus, and the closing
  action surface.
- Keep surfaces flat. Raised areas may use a small tonal change, never a shadow
  stack.
- Use the sans family for interface and editorial copy; use the mono family for
  commands, code, identifiers, indices, and measured values.
- Keep the content column at or below 76rem and protect readable prose widths.

## Hard exclusions

Do not add decorative gradients, glass effects, floating card grids, logo walls,
stock imagery, invented product screenshots, vanity counters, or ornamental
animation. Rounded controls and containers are not part of the homepage visual
language unless a native platform control requires them.

## Interaction

Controls use native radio and checkbox semantics inside larger labeled hit areas.
Selection must be communicated by more than color. Every focusable control has a
visible focus state. Dynamic configuration results use a polite live region, and
copy feedback is available as visible text and live text.

Motion is optional feedback, not narrative. Transitions are declared only inside
`prefers-reduced-motion: no-preference`. Layout and comprehension must not depend
on animation.

## Responsive behavior

Wide layouts may use asymmetric two-column composition. Below 56rem, marketing
splits and the configurator become one column. Below 40rem, commands, receipts,
and metric groups use a single column. Text scales with `clamp()` and must not
require horizontal scrolling; code and command regions may scroll internally.

## Accessibility baseline

- Use semantic headings, sections, lists, fieldsets, legends, links, and buttons.
- Maintain at least WCAG AA contrast for text and interactive states.
- Preserve a 44px minimum target in primary controls.
- Support keyboard navigation, forced-colors mode, zoom, reduced motion, and
  screen-reader names.
- Do not replace meaningful text with an icon alone. The product mark is
  decorative when the surrounding header provides the product name.

## Maintenance

Homepage-specific styles live in `app/homepage.css` under the `.hp-page`
namespace. Ardo owns the documentation shell and reading styles. When a pattern
is required in both registers, prefer an Ardo primitive or token instead of
making the homepage stylesheet a second documentation framework.

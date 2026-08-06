# Documentation design system

## Direction

The homepage combines precision-and-analysis structure with editorial-minimalist
typography. The documentation shell remains optimized for sustained reading.
The shared product should feel deliberate, technical, and calm rather than like
a generic SaaS template. Light is the default presentation, while Ardo's theme
control keeps light, dark, and system preferences available across the complete
site.

## Visual rules

- Use product artifacts, generated configuration output, rule counts, and source
  links as the primary visual material.
- Build hierarchy with type scale, spacing, alignment, and one-pixel rules.
- Use soft off-white and white surfaces in light mode. Treat dark mode as an
  independently tuned token mapping rather than an inverted light palette.
- Reserve the green accent for selection, verification, focus, and the closing
  action surface.
- Keep surfaces flat. Raised areas may use a small tonal change, never a shadow
  stack.
- Use the sans family for interface and editorial copy; use the mono family for
  commands, code, identifiers, indices, and measured values.
- Keep display type bounded by its role: the hero may be prominent without
  dominating the viewport, and section headings remain clearly subordinate.
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
and metric groups use a single column. Text scales within bounded `clamp()`
ranges, respects browser zoom, and must not require horizontal scrolling; code
and command regions may scroll internally.

## Accessibility baseline

- Use semantic headings, sections, lists, fieldsets, legends, links, and buttons.
- Maintain at least WCAG AA contrast for text and interactive states.
- Keep the labelled Ardo theme control available on desktop and mobile, and
  preserve equivalent hierarchy and contrast in light and dark themes.
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

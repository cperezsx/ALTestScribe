# AL TestScribe Design System

## Brand direction

AL TestScribe is a precise, evidence-first AL development utility. Public surfaces use a composed dark technical palette, not a dashboard aesthetic: deep blue-black for concentration, cyan for durable records, and coral only for failure state.

## Color tokens

```css
:root {
  --ink: oklch(16% 0.025 250);
  --surface: oklch(20% 0.028 250);
  --surface-raised: oklch(24% 0.03 250);
  --line: oklch(35% 0.025 250);
  --text: oklch(94% 0.012 230);
  --muted: oklch(74% 0.025 230);
  --cyan: oklch(78% 0.14 220);
  --coral: oklch(68% 0.18 30);
}
```

## Type

- Interface and body: `Manrope`, `Segoe UI`, system sans-serif.
- Code and report samples: `JetBrains Mono`, `Cascadia Mono`, monospace.
- Use strong size contrast for section headings. Keep body text under 72 characters per line.

## Components

- Buttons use modest 8px radii and a clear cyan primary action.
- Evidence blocks use full 1px borders and dark surfaces, never colored side stripes.
- Status is expressed with an icon and text in addition to color.
- Motion is limited to opacity and transform, respects `prefers-reduced-motion`, and is not required to understand content.

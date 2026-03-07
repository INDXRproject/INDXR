# INDXR Designer Skill

## Description
UI/UX design specialist for INDXR.AI. Activate when making visual changes, redesigning components, updating styling, adjusting layouts, or applying the design system. This skill enforces the INDXR Starlight/Midnight design language consistently across the entire codebase.

## When to Use
- Redesigning any page or component
- Adding new UI components
- Applying or updating color tokens
- Writing or updating Tailwind classes for visual styling
- Reviewing existing components for design consistency
- Creating new badges, buttons, cards, or form elements

## Role
You are the design system enforcer for INDXR.AI. Your job is to apply the Starlight/Midnight design language precisely and consistently. You never improvise colors or spacing — you always use the defined tokens. You never add heavy shadows, neon colors, or gradients unless explicitly specified in the design system.

## Core Principles

### Never do this
- Use arbitrary hex colors not defined in the design system
- Add heavy box-shadows (max: `0 1px 3px rgba(0,0,0,0.08)` in Starlight)
- Use neon or fully saturated colors
- Use `purple-500`, `blue-500` or other raw Tailwind colors — always use CSS variables
- Add modals where inline patterns work
- Combine copy changes + design changes in one edit — do one at a time
- Apply animations that serve no functional purpose

### Always do this
- Use CSS variables defined in `references/design-system.md`
- Apply `transition` on all interactive elements (150–200ms ease)
- Use `border-radius: 8px` for buttons/inputs, `12px` for cards, `20px` for badges/pills
- Respect both Midnight (dark) and Starlight (light) mode in every component
- Check that hover states exist for all clickable elements
- Use Inter for all text, JetBrains Mono for code/JSON/monospace content

## Tech Stack Context
- Framework: Next.js 14 App Router, TypeScript
- Styling: Tailwind CSS + shadcn/ui components
- Icons: Lucide React
- The app has a working dark/light mode toggle — always support both

## References
Read these files before making any design changes:
- `references/design-system.md` — all color tokens, typography, spacing
- `references/component-patterns.md` — buttons, badges, cards, inputs, toggles
- `references/copy-guide.md` — approved copy for landing page and key UI strings

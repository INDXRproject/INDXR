# INDXR.AI Design System
## Starlight & Midnight — Token Reference

---

## Mode Names

| Mode | Trigger | Feel |
|---|---|---|
| **Midnight** | `dark` class on `<html>` | Near-black, blue undertone, Lavender accent |
| **Starlight** | default / `light` class | Warm champagne white, Steel Blue accent |

---

## Color Tokens

Add these to `globals.css` inside `:root` and `.dark`:

```css
:root {
  /* Starlight surfaces */
  --bg-base:     #F5F3EF;
  --bg-surface:  #FDFCFA;
  --bg-elevated: #FFFFFF;
  --border:      #E8E4DC;

  /* Starlight text */
  --text-primary:   #0F0F14;
  --text-secondary: #5C5A58;
  --text-muted:     #9B9894;

  /* Starlight accent */
  --accent:          #4A90D9; /* Steel Blue */
  --accent-hover:    #3A80C9;
  --accent-subtle:   rgba(74, 144, 217, 0.08);
  --accent-border:   rgba(74, 144, 217, 0.20);

  /* Semantic — same both modes */
  --color-success:        #34C77A;
  --color-success-subtle: rgba(52, 199, 122, 0.10);
  --color-success-border: rgba(52, 199, 122, 0.20);

  --color-warning:        #F59E0B;
  --color-warning-subtle: rgba(245, 158, 11, 0.10);
  --color-warning-border: rgba(245, 158, 11, 0.20);

  --color-error:          #DC4A4A;
  --color-error-subtle:   rgba(220, 74, 74, 0.10);
  --color-error-border:   rgba(220, 74, 74, 0.20);

  --color-info:           #4A90D9;
  --color-info-subtle:    rgba(74, 144, 217, 0.10);

  --color-sage:           #A7C4B5;
  --color-sage-subtle:    rgba(167, 196, 181, 0.10);
}

.dark {
  /* Midnight surfaces */
  --bg-base:     #0A0A0F;
  --bg-surface:  #111118;
  --bg-elevated: #1A1A24;
  --border:      #242433;

  /* Midnight text */
  --text-primary:   #F0EEF8;
  --text-secondary: #9B99B0;
  --text-muted:     #55536A;

  /* Midnight accent */
  --accent:          #A78BFA; /* Soft Lavender */
  --accent-hover:    #BFA8FC;
  --accent-subtle:   rgba(167, 139, 250, 0.10);
  --accent-border:   rgba(167, 139, 250, 0.20);

  /* Semantic tokens identical — no changes needed */
}
```

---

## Accent Color Quick Reference

| Name | Hex | Mode | Use |
|---|---|---|---|
| Soft Lavender | `#A78BFA` | Midnight only | Primary CTA, focus rings, active states |
| Steel Blue | `#4A90D9` | Starlight only | Primary CTA, focus rings, active states |
| Minty Green | `#34C77A` | Both | Success states, checkmarks, "extracted" badge |
| Warm Amber | `#F59E0B` | Both | Warnings, no-speech badge, storage >60% |
| Muted Red | `#DC4A4A` | Both | Errors, failed extraction, storage >85% |
| Sage | `#A7C4B5` | Both | Collection tags, neutral badges |

---

## Typography

| Role | Font | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Hero headline | Inter | 800 | `clamp(2.5rem, 5vw, 4rem)` | `-0.03em` |
| Section headline | Inter | 700 | `1.75rem` | `-0.02em` |
| Card title | Inter | 600 | `0.9375rem` | `-0.01em` |
| Body | Inter | 400 | `1rem` | `0` |
| Small / caption | Inter | 400 | `0.8125rem` | `0` |
| Badge label | Inter | 600 | `0.6875rem` | `0.02em` (uppercase) |
| Code / JSON | JetBrains Mono | 400 | `0.875rem` | `0` |

Import in `layout.tsx` or `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

---

## Spacing & Border Radius

| Element | Border Radius |
|---|---|
| Buttons, inputs | `8px` |
| Cards, panels | `12px` |
| Large panels / modals | `16px` |
| Badges, pills, tags | `20px` |
| Avatar | `50%` |
| Icon containers | `8px` |

---

## Shadows

Only used in Starlight mode. Midnight uses border instead of shadow.

```css
/* Starlight card */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

/* Starlight card hover */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Midnight: no shadow — use border only */
```

---

## Hero Background

```css
/* Midnight hero — subtle lavender glow from top */
background:
  radial-gradient(
    ellipse 80% 50% at 50% -10%,
    rgba(167, 139, 250, 0.08) 0%,
    transparent 70%
  ),
  var(--bg-base);

/* Starlight hero — flat warm white, no gradient needed */
background: var(--bg-base);
```

---

## Storage Bar — Color Thresholds

| Usage | Bar color | Token |
|---|---|---|
| 0–59% | Minty Green | `--color-success` |
| 60–84% | Warm Amber | `--color-warning` |
| 85–100% | Muted Red | `--color-error` |

Upgrade button appears only at >50%. At >85%, label changes to "Almost full — Upgrade now →".

---

## Credit Pill (Navbar)

Always Steel Blue (`#4A90D9`) in both modes — it's an informational element, not an accent.

```css
background: var(--color-info-subtle);
color: var(--color-info);
border: 1px solid var(--color-info-subtle);
border-radius: 20px;
padding: 5px 12px;
font-size: 13px;
font-weight: 500;
```

# INDXR Component Patterns

All components must support both Midnight (dark) and Starlight (light) mode.
Use CSS variables from `design-system.md` — never hardcode hex values.

---

## Buttons

### Primary Button
```tsx
// Midnight: Lavender bg, near-black text
// Starlight: Steel Blue bg, white text
<button className="
  px-4 py-2 rounded-lg font-semibold text-sm
  bg-[var(--accent)] text-[var(--bg-base)]
  hover:bg-[var(--accent-hover)]
  active:scale-[0.97]
  transition-all duration-150 ease-out
  cursor-pointer
">
  Extract →
</button>
```

### Secondary Button
```tsx
<button className="
  px-4 py-2 rounded-lg font-medium text-sm
  bg-transparent border border-[var(--border)]
  text-[var(--text-primary)]
  hover:border-[var(--text-muted)]
  transition-all duration-150 ease-out
  cursor-pointer
">
  Cancel
</button>
```

### Ghost Button
```tsx
<button className="
  px-4 py-2 rounded-lg font-medium text-sm
  bg-transparent text-[var(--text-muted)]
  hover:text-[var(--text-secondary)]
  transition-colors duration-150
  cursor-pointer
">
  Skip
</button>
```

### Danger Button
```tsx
<button className="
  px-4 py-2 rounded-lg font-medium text-sm
  bg-[var(--color-error-subtle)]
  text-[var(--color-error)]
  border border-[var(--color-error-border)]
  hover:bg-[var(--color-error-border)]
  transition-all duration-150
  cursor-pointer
">
  Delete
</button>
```

---

## Badges

Always use a dot indicator for status badges.

```tsx
// Success
<span className="
  inline-flex items-center gap-1.5 px-2.5 py-0.5
  rounded-full text-[11px] font-semibold tracking-wide uppercase
  bg-[var(--color-success-subtle)]
  text-[var(--color-success)]
  border border-[var(--color-success-border)]
">
  <span className="w-1.5 h-1.5 rounded-full bg-current" />
  Extracted
</span>

// Warning (no-speech, processing)
// Replace success vars with warning vars

// Error
// Replace success vars with error vars

// Lavender (Whisper AI indicator) — Midnight only
// bg: rgba(167,139,250,0.10), color: #A78BFA, border: rgba(167,139,250,0.20)

// Sage (collections, tags)
// bg: var(--color-sage-subtle), color: var(--color-sage)
```

---

## Cards

```tsx
<div className="
  rounded-xl p-4 border
  bg-[var(--bg-surface)] border-[var(--border)]
  shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-none
  hover:border-[var(--text-muted)] hover:-translate-y-0.5
  transition-all duration-150 ease-out
  cursor-pointer
">
  {/* Icon container */}
  <div className="
    w-8 h-8 rounded-lg mb-3
    bg-[var(--bg-elevated)]
    flex items-center justify-center
  ">
    <Icon className="w-4 h-4 text-[var(--accent)]" />
  </div>

  <h3 className="
    text-[15px] font-semibold tracking-tight mb-1
    text-[var(--text-primary)]
  ">
    Card Title
  </h3>

  <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
    Card body text here.
  </p>
</div>
```

---

## Inputs

```tsx
<input
  className="
    w-full px-3.5 py-2.5 rounded-lg text-sm
    bg-[var(--bg-elevated)] border border-[var(--border)]
    text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
    focus:outline-none focus:border-[var(--accent)]
    focus:ring-2 focus:ring-[var(--accent-subtle)]
    transition-all duration-150
  "
  placeholder="Paste YouTube URL or playlist link…"
/>
```

---

## Toggle (iOS-style)

```tsx
// Use a controlled component. The spring cubic-bezier gives the iOS bounce.
<label className="relative flex items-center gap-2.5 cursor-pointer">
  <div className="relative w-11 h-6">
    <input type="checkbox" className="sr-only peer" />
    <div className="
      absolute inset-0 rounded-full
      bg-[var(--border)] peer-checked:bg-[var(--accent)]
      transition-colors duration-200
    " />
    <div className="
      absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
      shadow-sm
      peer-checked:translate-x-5
      transition-transform duration-200
      [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
    " />
  </div>
  <span className="text-sm font-medium text-[var(--text-secondary)]">
    Label
  </span>
</label>
```

---

## Testimonial Card

```tsx
<div className="
  rounded-xl p-5 border-l-2 border-[var(--accent)]
  bg-[var(--bg-surface)] border border-[var(--border)]
  border-l-[var(--accent)]
">
  <p className="text-[15px] italic leading-relaxed text-[var(--text-secondary)] mb-4">
    "Quote text here."
  </p>
  <div>
    <div className="text-sm font-semibold text-[var(--text-primary)]">Name</div>
    <div className="text-xs text-[var(--text-muted)]">Role</div>
  </div>
</div>
```

---

## Storage Bar

```tsx
// Thresholds: <60% green, 60-85% amber, >85% red
const pct = (used / total) * 100;
const fillColor =
  pct < 60 ? 'var(--color-success)' :
  pct < 85 ? 'var(--color-warning)' :
             'var(--color-error)';

<div className="flex flex-col gap-2">
  <div className="flex justify-between items-center">
    <span className="text-xs font-medium text-[var(--text-secondary)]">
      Storage
    </span>
    <span className="text-xs font-mono text-[var(--text-muted)]">
      {used} / {total} MB
    </span>
  </div>

  <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500 ease-out"
      style={{ width: `${pct}%`, background: fillColor }}
    />
  </div>

  {pct > 50 && (
    <button className="
      self-end text-[11px] font-medium px-2.5 py-1 rounded-md
      bg-[var(--accent-subtle)] text-[var(--accent)]
      border border-[var(--accent-border)]
      hover:bg-[var(--accent-border)]
      transition-all duration-150
    ">
      {pct > 85 ? 'Almost full — Upgrade now →' : 'Upgrade storage — 5 cr →'}
    </button>
  )}
</div>
```

---

## Micro-interaction Reference

| Interaction | CSS |
|---|---|
| Button press | `active:scale-[0.97] transition-transform duration-150` |
| Card hover lift | `hover:-translate-y-0.5 transition-transform duration-150` |
| Card hover border | `hover:border-[var(--text-muted)] transition-colors duration-150` |
| Input focus ring | `focus:ring-2 focus:ring-[var(--accent-subtle)]` |
| Toggle thumb spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` on transform |
| New transcript appear | `animate-in slide-in-from-bottom-3 duration-300` |
| Error shake | Use a CSS keyframe: `@keyframes shake { 0%,100%{translateX(0)} 25%{translateX(-2px)} 75%{translateX(2px)} }` |
| Mode switch | `transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease` on body |

"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

const colorSwatches = [
  // Surfaces
  { label: "bg", class: "bg-bg", text: "text-fg" },
  { label: "bg-subtle", class: "bg-bg-subtle", text: "text-fg" },
  { label: "surface", class: "bg-surface", text: "text-fg" },
  { label: "surface-elevated", class: "bg-surface-elevated", text: "text-fg" },
  { label: "surface-sunken", class: "bg-surface-sunken", text: "text-fg" },
  // Borders (shown as text)
  { label: "border-subtle", class: "bg-border-subtle", text: "text-fg" },
  { label: "border", class: "bg-border", text: "text-fg" },
  { label: "border-strong", class: "bg-border-strong", text: "text-fg" },
  // Foreground (shown as bg)
  { label: "fg-muted", class: "bg-fg-muted", text: "text-bg" },
  { label: "fg-subtle", class: "bg-fg-subtle", text: "text-bg" },
  { label: "fg", class: "bg-fg", text: "text-bg" },
  { label: "fg-strong", class: "bg-fg-strong", text: "text-bg" },
  // Accent
  { label: "accent", class: "bg-accent", text: "text-fg-on-accent" },
  { label: "accent-hover", class: "bg-accent-hover", text: "text-fg-on-accent" },
  { label: "accent-active", class: "bg-accent-active", text: "text-fg-on-accent" },
  { label: "accent-subtle", class: "bg-accent-subtle", text: "text-accent-fg" },
  // Success
  { label: "success", class: "bg-success", text: "text-bg" },
  { label: "success-subtle", class: "bg-success-subtle", text: "text-success-fg" },
  // Warning
  { label: "warning", class: "bg-warning", text: "text-bg" },
  { label: "warning-subtle", class: "bg-warning-subtle", text: "text-warning-fg" },
  // Error
  { label: "error", class: "bg-error", text: "text-bg" },
  { label: "error-subtle", class: "bg-error-subtle", text: "text-error-fg" },
]

const shadows = [
  { label: "shadow-xs", class: "shadow-xs" },
  { label: "shadow-sm", class: "shadow-sm" },
  { label: "shadow-md", class: "shadow-md" },
  { label: "shadow-lg", class: "shadow-lg" },
]

const radii = [
  { label: "radius-sm (4px)", class: "rounded-sm" },
  { label: "radius (8px)", class: "rounded" },
  { label: "radius-lg (12px)", class: "rounded-lg" },
]

export default function TestTokensPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-bg text-fg p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Design Token Test Page</h1>
      <p className="text-fg-muted mb-8 text-sm">OKLCH token system — V1.0</p>

      {/* Theme Controls */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Theme</h2>
        <div className="flex gap-2 flex-wrap">
          {["light", "dark", "system"].map((t) => (
            <Button
              key={t}
              variant={theme === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        <p className="text-xs text-fg-muted mt-2">Active: {theme}</p>
      </section>

      {/* Color Swatches */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Color Tokens</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {colorSwatches.map(({ label, class: bg, text }) => (
            <div key={label} className={`${bg} ${text} rounded-md p-3 border`}>
              <div className="text-xs font-mono font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography Scale */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Typography Scale</h2>
        <div className="space-y-2">
          {[
            { size: "text-xs", label: "xs — 12px" },
            { size: "text-sm", label: "sm — 14px" },
            { size: "text-base", label: "base — 16px" },
            { size: "text-lg", label: "lg — 18px" },
            { size: "text-xl", label: "xl — 20px" },
            { size: "text-2xl", label: "2xl — 24px" },
            { size: "text-3xl", label: "3xl — 30px" },
          ].map(({ size, label }) => (
            <div key={size} className="flex items-baseline gap-4">
              <span className="text-xs text-fg-muted font-mono w-32 shrink-0">{label}</span>
              <span className={`${size} font-sans`}>IBM Plex Sans — The quick brown fox</span>
            </div>
          ))}
          <div className="flex items-baseline gap-4 mt-4">
            <span className="text-xs text-fg-muted font-mono w-32 shrink-0">mono</span>
            <span className="text-base font-mono">IBM Plex Mono — 0123456789</span>
          </div>
        </div>
      </section>

      {/* Radius */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Border Radius</h2>
        <div className="flex gap-4 flex-wrap">
          {radii.map(({ label, class: r }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 bg-accent ${r}`} />
              <span className="text-xs text-fg-muted font-mono">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Shadows</h2>
        <div className="flex gap-6 flex-wrap">
          {shadows.map(({ label, class: s }) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <div className={`w-24 h-24 bg-surface rounded-lg ${s}`} />
              <span className="text-xs text-fg-muted font-mono">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Button Controls */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Button Variants</h2>
        <div className="flex gap-3 flex-wrap mb-4">
          {(["default", "outline", "secondary", "ghost", "link", "destructive"] as const).map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          {(["xs", "sm", "default", "lg"] as const).map((s) => (
            <Button key={s} size={s}>size {s}</Button>
          ))}
        </div>
      </section>

      {/* Focus Ring Demo */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Focus Ring (Tab to test)</h2>
        <div className="flex gap-3">
          <Button>Tab to me</Button>
          <input
            className="border-border rounded-md border px-3 py-2 text-sm bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-accent"
            placeholder="Tab to me too"
          />
        </div>
      </section>

      {/* Semantic States */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Semantic States</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-subtle border border-success/20 text-success-fg text-sm">
            ✓ Success state
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-subtle border border-warning/20 text-warning-fg text-sm">
            ⚠ Warning state
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error-subtle border border-error/20 text-error-fg text-sm">
            ✗ Error state
          </div>
        </div>
      </section>

      {/* WCAG Contrast Summary */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Key Color Combinations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-4 rounded-lg bg-bg border">
            <span className="text-fg font-medium">fg on bg</span>
            <span className="text-fg-muted ml-2">— main body text</span>
          </div>
          <div className="p-4 rounded-lg bg-surface border">
            <span className="text-fg font-medium">fg on surface</span>
            <span className="text-fg-muted ml-2">— card content</span>
          </div>
          <div className="p-4 rounded-lg bg-accent">
            <span className="text-fg-on-accent font-medium">fg-on-accent on accent</span>
          </div>
          <div className="p-4 rounded-lg bg-surface-elevated border">
            <span className="text-fg-muted font-medium">fg-muted on surface-elevated</span>
            <span className="text-fg-muted ml-2">— secondary</span>
          </div>
        </div>
      </section>
    </div>
  )
}

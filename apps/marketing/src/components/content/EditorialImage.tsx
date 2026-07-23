// Shared editorial-photo primitive for the /articles cards and the article hero.
// One <picture> with an AVIF → WebP → JPEG fallback, at the requested widths, fixed to a
// 16:9 box (aspect-video) so there is no layout shift, object-cover full-bleed. Files live
// at /editorial/{slug}-{width}.{avif,webp} with a single {slug}-800.jpg last-resort fallback.
// The card (400/800) and the hero (800/1440) share this component so they read as one system.
interface EditorialImageProps {
  slug: string
  alt: string
  /** srcset widths, e.g. [400, 800] for cards or [800, 1440] for the hero. */
  widths: number[]
  /** Real rendered width per breakpoint so the browser picks the right variant. */
  sizes: string
  /** Rounding class — matches the surrounding surface (rounded-xl standalone, rounded-none inside a clipped card). */
  rounded?: string
  /** Border on the image itself — off when the parent card already draws one. */
  bordered?: boolean
  /** LCP hint for the hero; cards stay lazy. */
  priority?: boolean
  className?: string
}

export function EditorialImage({
  slug,
  alt,
  widths,
  sizes,
  rounded = "rounded-xl",
  bordered = true,
  priority = false,
  className,
}: EditorialImageProps) {
  const base = `/editorial/${slug}`
  const srcset = (ext: string) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ")
  return (
    <div
      className={`relative aspect-video overflow-hidden ${rounded} ${bordered ? "border border-[var(--border)]" : ""} bg-[var(--surface-sunken)] ${className ?? ""}`}
    >
      <picture>
        <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
        <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
        <img
          src={`${base}-800.jpg`}
          alt={alt}
          sizes={sizes}
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
    </div>
  )
}

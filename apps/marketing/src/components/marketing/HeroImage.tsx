interface HeroImageProps {
  className?: string
}

// Light/dark hero. Two <picture> elements overlaid, one hidden per theme via the class-toggle
// (`dark:hidden` / `hidden dark:block`) — the existing pattern; this serves the pre-generated
// AVIF → WebP → JPEG set at explicit widths. Two art directions: a 4:5 crop below 768px and the
// 1392/752 desktop crop above (media="(max-width: 767px)" on the mobile sources — first matching
// source wins, so order is functional). The mobile JPEG source is needed so a phone without AVIF
// and WebP doesn't fall through to the desktop JPEG on the <img>. The pair is one render in two
// grades, compositionally identical, so the theme switch doesn't jump. fetchPriority="high" keeps
// the LCP hero fast. The aspect-ratio is fixed per breakpoint (aspect-[4/5] md:aspect-[1392/752],
// same 767/768 boundary as the media queries); the image is an absolutely-positioned, object-cover
// full-bleed background inside a min-h-screen section, so it is out of flow and never shifts layout.
const SIZES = "100vw"
const MOBILE = "(max-width: 767px)"

function HeroPicture({ variant, hiddenClass }: { variant: "light" | "dark"; hiddenClass: string }) {
  const base = `/hero/hero-${variant}`
  const mob = `/hero/hero-${variant}-mobile`
  return (
    <picture>
      {/* Mobile (≤767px), 4:5 crop — AVIF → WebP → JPEG. JPEG only ships 430/1290. */}
      <source media={MOBILE} type="image/avif" srcSet={`${mob}-430.avif 430w, ${mob}-860.avif 860w, ${mob}-1290.avif 1290w`} sizes={SIZES} />
      <source media={MOBILE} type="image/webp" srcSet={`${mob}-430.webp 430w, ${mob}-860.webp 860w, ${mob}-1290.webp 1290w`} sizes={SIZES} />
      <source media={MOBILE} type="image/jpeg" srcSet={`${mob}-430.jpg 430w, ${mob}-1290.jpg 1290w`} sizes={SIZES} />
      {/* Desktop (≥768px), 1392/752 crop. */}
      <source type="image/avif" srcSet={`${base}-1392.avif 1392w, ${base}-2088.avif 2088w, ${base}-2784.avif 2784w`} sizes={SIZES} />
      <source type="image/webp" srcSet={`${base}-1392.webp 1392w, ${base}-2088.webp 2088w, ${base}-2784.webp 2784w`} sizes={SIZES} />
      <img
        src={`${base}-1392.jpg`}
        srcSet={`${base}-1392.jpg 1392w, ${base}-2784.jpg 2784w`}
        sizes={SIZES}
        alt=""
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover object-[center_20%] lg:object-[center_50%] aspect-[4/5] md:aspect-[1392/752] ${hiddenClass}`}
      />
    </picture>
  )
}

export function HeroImage({ className }: HeroImageProps) {
  // The photo renders raw: no overlay, filter, mask or opacity in either theme. Every --bg gradient that
  // used to sit over it (top fade, bottom dissolve, L/R vignette, dark scrim, glow) has been removed —
  // they burned the image to white in light and to black at the bottom in dark. The image ends on a hard
  // edge against the page background. Text contrast is carried by the per-glyph text-shadow on the text
  // itself (see page.tsx h1/subhead/price), never by a layer over the image. See LESSONS 2026-09-06.
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}>
      <HeroPicture variant="light" hiddenClass="dark:hidden" />
      <HeroPicture variant="dark" hiddenClass="hidden dark:block" />
      {/* The ONLY permitted --bg transition over the photo: a strictly bounded bottom EDGE strip — the
          bottom 8% of the container, one side only, no radial and nothing over the middle. It softens the
          hard cut where the photo meets the page background. Identical in light and dark; only --bg's
          value differs. Per the sharpened LESSONS rule (2026-09-06): a --bg transition is allowed solely
          as a ≤8% edge strip on one side, never as a layer over the image field. */}
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  )
}

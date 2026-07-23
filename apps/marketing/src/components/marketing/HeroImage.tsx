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
        className={`absolute inset-0 w-full h-full object-cover object-[center_20%] lg:object-[center_30%] aspect-[4/5] md:aspect-[1392/752] ${hiddenClass}`}
      />
    </picture>
  )
}

export function HeroImage({ className }: HeroImageProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}>
      <HeroPicture variant="light" hiddenClass="dark:hidden" />
      <HeroPicture variant="dark" hiddenClass="hidden dark:block" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[var(--bg)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/70 via-transparent to-[var(--bg)]/70" />
    </div>
  )
}

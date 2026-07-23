interface HeroImageProps {
  className?: string
}

// Light/dark hero. Two <picture> elements overlaid, one hidden per theme via the class-toggle
// (`dark:hidden` / `hidden dark:block`) — the existing pattern; this swaps next/image for
// <picture> so we can serve the pre-generated AVIF → WebP → JPEG set at explicit widths.
// The pair is one render in two grades, compositionally identical, so the theme switch doesn't
// jump. fetchPriority="high" keeps the LCP hero fast; both variants pre-fetch (each AVIF ~30–50 KB,
// cheap). Aspect-ratio 1392/752 is fixed as a hint; the image is an absolutely-positioned,
// object-cover full-bleed background, so it is out of flow and causes no layout shift.
const SIZES = "100vw"

function HeroPicture({ variant, hiddenClass }: { variant: "light" | "dark"; hiddenClass: string }) {
  const base = `/hero/hero-${variant}`
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${base}-1392.avif 1392w, ${base}-2088.avif 2088w, ${base}-2784.avif 2784w`}
        sizes={SIZES}
      />
      <source
        type="image/webp"
        srcSet={`${base}-1392.webp 1392w, ${base}-2088.webp 2088w, ${base}-2784.webp 2784w`}
        sizes={SIZES}
      />
      <img
        src={`${base}-1392.jpg`}
        srcSet={`${base}-1392.jpg 1392w, ${base}-2784.jpg 2784w`}
        sizes={SIZES}
        alt=""
        fetchPriority="high"
        decoding="async"
        style={{ aspectRatio: "1392 / 752" }}
        className={`absolute inset-0 w-full h-full object-cover object-[center_20%] lg:object-[center_30%] ${hiddenClass}`}
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

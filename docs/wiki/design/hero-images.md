# Hero images — marketing homepage

De hero-afbeelding op `/` (marketing) is een **penthouse met woestijnstad-uitzicht**, in een
licht/donker-paar. Deze pagina legt de bronketen en de exacte parameters vast, zodat de nog te
maken **mobiele varianten** compositioneel en qua grade identiek blijven.

## Bronketen

1. **Leonardo Lucid Origin (Ultra)** — basisgeneratie op **3840×2176**.
2. **Nano Banana Pro** — edits op de generatie, opgeschaald naar **5504×3072**.
3. **Crop** op die 5504×3072: crop-box **(52, 0, 5452, 2917)** → levert de 1392/752-verhouding.

**Aspect-ratio: 1392 / 752** (≈ 1.851). Deze ratio is vastgelegd in de component (CSS
`aspect-ratio`), zodat er geen layout shift optreedt.

## Twee grades uit één render

Het paar is **één render in twee bewerkingen** — licht en donker zijn compositioneel identiek, dus
de theme-switch mag geen sprong geven (beide staan overlappend in de DOM; CSS toont er één).

De **nacht-grade** (donkere variant) uit de lichte:
- **zwartpunt: 9**
- **gamma: 1.70**
- **randvignette** (edge vignette)

## Geleverde bestanden

In `apps/marketing/public/hero/` — `hero-{light,dark}-{breedte}.{avif,webp,jpg}`:

| Breedte | AVIF | WebP | JPEG |
|--------:|:----:|:----:|:----:|
| 1392 | ✓ | ✓ | ✓ |
| 2088 | ✓ | ✓ | — (ontbreekt) |
| 2784 | ✓ | ✓ | ✓ |

- **AVIF → WebP → JPEG** fallback-volgorde; JPEG is het laatste vangnet. AVIF/WebP dekken alle drie
  de breedtes; JPEG dekt 1392 + 2784 (de 2088-JPEG ontbreekt in de levering — niet blokkerend, want
  de JPEG is alleen fallback en moderne browsers pakken AVIF/WebP).
- De 6 MB `*-master.png`-bronnen zijn **niet** geserveerd (verwijderd uit `public/`, want dat is een
  publiek-geserveerde map); de crop/grade-parameters hierboven zijn de herbruikbare bron.

## Implementatie

`apps/marketing/src/components/marketing/HeroImage.tsx` — twee `<picture>`-elementen (light + dark),
één verborgen per thema via de class-toggle (`dark:hidden` / `hidden dark:block`, het bestaande
patroon). Elk `<picture>` heeft `<source type="image/avif">` + `<source type="image/webp">` +
een `<img>` (JPEG-fallback) met `srcSet` op de breedtes en `sizes="100vw"`.

- **fetchPriority="high"** op de `<img>` (LCP-element). Server-component — geen JS nodig voor de hero.
- **Trade-off (bewuste keuze):** beide varianten pre-fetchen (~160 KB in JPEG-termen, maar AVIF is
  ~30–50 KB per variant). Gekozen boven CSS-`background-image`/`image-set()` omdat die (a)
  fetchpriority verliest op het LCP-element en (b) resolutie-descriptoren (1x/2x) gebruikt i.p.v. de
  gevraagde breedte-srcset. Geen ADR nodig (dat was alleen voor de background-image-route).

## Voor de mobiele varianten (nog te maken)

Gebruik dezelfde bronketen en nacht-grade. De crop-box zal anders zijn (portret/vierkanter kader),
maar zwartpunt 9 / gamma 1.70 / randvignette blijven gelijk zodat mobiel en desktop bij elkaar
horen. Lever opnieuw AVIF/WebP/JPEG en breid `HeroImage` uit met een `<source media="...">` of een
aparte mobiele `<picture>`.

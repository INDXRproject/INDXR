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

## Mobiele varianten (geïmplementeerd)

Onder **767px** serveert de hero een **4:5-uitsnede** van hetzelfde beeld — art direction, geen
resolutie-variant. Zelfde bronketen en nacht-grade (zwartpunt 9 / gamma 1.70 / randvignette blijven
gelijk zodat mobiel en desktop bij elkaar horen).

- **Mobiele crop-box:** box **(1465, 0, 3799, 2917)** op de desktopmaster → **2334×2917, ratio 4:5**.
  Geldt ongewijzigd voor licht en donker; de bronbeelden zijn pixelgelijk. De box is uitgelijnd op
  het **laptopscherm** (schermmidden x=2632 op de 5400-brede master), **niet** op het framemidden
  (x=2700): op mobiel valt de raamsymmetrie buiten beeld, dus de laptop is het compositorische anker.
  De oude box (1533, 0, 3867, 2917) legde de laptop ~68px uit het midden — vandaar de 68px-shift.
- **Exportbreedtes:** 430 / 860 / 1290 (1x / 2x / 3x). Bestanden `hero-{light,dark}-mobile-{430,860,1290}.{avif,webp}`
  + JPEG-fallback op **430 / 1290** (geen 860-JPEG).
- **Breakpoint: 767px** — media-attribuut `(max-width: 767px)` op de mobiele `<source>`-regels; de
  aspect-ratio wisselt op dezelfde grens via `aspect-[4/5] md:aspect-[1392/752]` (Tailwind `md` = 768px).

Elk `<picture>` krijgt bovenaan **drie** mobiele `<source>`-regels (AVIF → WebP → **JPEG**), vóór de
desktop-sources. De mobiele JPEG-source is nodig omdat de `<img>`-fallback (desktop-JPEG) anders op een
telefoon zónder AVIF én WebP de desktop-uitsnede zou serveren — kleine groep, maar dan klopt de keten.
Volgorde binnen elk `<picture>` is functioneel: de browser pakt de eerste matchende source.

**Breedte-check:** de hero-container is `absolute inset-0` in een `w-full`-sectie zonder horizontale
padding → **volle viewport-breedte (100vw)** op mobiel. Op een 430px-toestel dekt de 1290-variant 3x
DPR; daarom blijft 1290 in de srcset.

**Geen layout shift:** de sectie is `min-h-screen` en de hero is `absolute inset-0` (uit de flow), dus
de hoogte van de sectie hangt niet van het beeld af — noch bij het laden, noch bij het passeren van de
768px-grens (waar de uitsnede/ratio wisselt) verschuift er iets. De `aspect-[…]`-classes leggen de
geserveerde ratio per breakpoint vast als hint.

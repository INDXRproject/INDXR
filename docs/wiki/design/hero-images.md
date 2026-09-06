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

## Leesbaarheid & overlay-stack (theme-aware, 2026-09-05)

De overlay-stack over de foto laat de tekst leesbaar zijn zonder de foto weg te wassen. Historisch keerde
**élke** overlaylaag op `var(--bg)` — wat in dark mode het (donkere) beeld verdiept (goed), maar in light
mode het (high-key) beeld **wit-waste** tot textuur: de bron-lucht is intrinsiek ~lum 215/255, en een
stapel bijna-witte `--bg`-lagen (top-fade + onderste-helft-naar-vol-`--bg` + links/rechts-vignet + 49%
radiale scrim) drukte alles naar wit. Zwarte tekst hoefde dat niet: donker-op-licht haalt van nature ruim
contrast.

**Nu theme-gesplitst** (`HeroImage.tsx` + hero-sectie in `page.tsx`):
- **Top-fade → `--bg`**: beide themes (houdt de nav leesbaar).
- **Onderste dissolve → `--bg`**: DARK ongewijzigd (`from-50%`, onderste helft); LIGHT alleen de
  onderste ~22% (`from-[78%]`) — genoeg om de onderrand in de pagina te laten oplossen, niet om de foto
  te wassen.
- **Links/rechts-vignet → `--bg`**: **DARK-only** (in light was dit mede-oorzaak van de was).
- **Radiale leesscrim**: DARK exact als voorheen (`49/40/18%` `--bg`); LIGHT fors verlaagd (`18/10/4%`).
- **Lokale scrim onder de onderste tekst** (LIGHT-only, `page.tsx`): een begrensde, zachte ellips (géén
  globale laag, géén blur) die alleen achter subkop/prijsregel/knoppen ligt, waar die over het donkerdere
  bureau/laptop-deel vallen. Tilt daar het worst-case-pixel boven WCAG-AA.
- **Ambient top-glow**: DARK-only, nu de amber `--accent` via `color-mix` (OKLCH-token) i.p.v. een losse
  `rgba(167,139,250)` violet; alpha op 6% zodat de luminantie de oude violet evenaart → dark-contrast
  ongewijzigd.

**Onderrand / mockup-snee.** De hero heeft **geen `border-b`** meer; de onderrand vloeit via de dissolve
zacht in `--bg`, zodat de (door `object-cover` op een sectie met vaste hoogte) afgesneden bureau/laptop-
voorgrond **oplost** i.p.v. op een harde lijn te eindigen. `object-position` is **niet** verschoven:
elke opwaartse verschuiving trekt de heldere melkweg onder de dark-`h1` en verlaagt daar het contrast
(gemeten), en door de vaste-hoogte-`object-cover`-zoom is er sowieso **geen** `object-position` die de
laptop over álle breedtes "heel of uit beeld" houdt (bij 1280–1440 is de laptop geometrisch altijd deels
in beeld). De dissolve lost het zichtbare defect (de harde snee) op; de laptop lost breedte-afhankelijk
op in de fade (heel op mobiel 4:5; oplossend/uit beeld naar 1920–2560).

**Contrast (glyph-masked worst / P1, productie-build 2026-09-05).** Light `h1` 6.4–12.9 / P1 ≥8.9; light
subkop 7.8–12.7 / P1 ≥8.1 — overal ≥ WCAG-AA. Dark ongewijzigd t.o.v. baseline op de stabiele P1 (h1 P1
≈12; subkop P1 ≥6.7); het losse worst-pixel van de dark-subkop (~3.9–4.0 bij 1440/1920) is een
pré-bestaand sterretje-onder-een-glyphrand, gelijk aan of beter dan de oude productie (3.1–3.9).

**Dode ruimte hero → try-blok.** Hero-`pb` van `pb-20 lg:pb-28` naar `pb-10 lg:pb-14`; de gestapelde
lege ruimte tussen de knoppen en de volgende sectiekop ging van **209px → 152px**, en de onderste
hero-band is nu een oplossende foto i.p.v. een wit gat.

### Correctie 2026-09-06 — light-mode wit-was hersteld

De op 2026-09-05 beschreven "theme-aware scrim 18/10/4%" + lokale ellips bleek de foto in light
mode alsnog weg te wassen (git-diagnose: de brede radiale `--bg`-scrim, toegevoegd 27-08 in `682ed01`
om tekst-AA te halen, vulde het transparante midden-venster; mijn eigen lokale ellips van 05-09 —
64% van de hero, 82% centrum — waste het midden juist erger, middenlijn 50% diepte van 0.48 → 0.69).

**Herstel:** in light mode **geen radiale `--bg`-scrim en geen brede lokale scrim** over het midden.
De middenlijn-dekking op 50% diepte is nu **0** — skyline en duinen lezen weer als beeld. Tekstcontrast
wordt **lokaal** geborgd met één **strak begrensde band** (radiale ellips, `top-52% bottom-16%`, hoger
op de 4:5-mobielcrop via `max-md`) **alleen** over de subkop + prijsregel, die over de donkere
raamstijlen/laptop vallen. Kern-inzicht: **beeldschade = oppervlak × dekking** — dezelfde sterkte, maar
op ~⅓ van het oppervlak, wast de tekst even leesbaar zónder het beeld te raken. De **h1** is large-text
(WCAG-AA **3:1**, niet 4.5:1) en haalt dat zelf op de heldere lucht → geen was erachter, het venster
blijft open.

**Contrast (productie-build 2026-09-06, glyph-masked worst / P1):** light middenlijn-dekking
30/50/70/85% = 0.40 / **0.00** / 0.79 / 0.32; h1 3.1–4.0 (≥ AA-large 3.0); subkop 7.0–12.6 (≫ AA);
price 6.3–12.5 (≫ AA). **Dark mode is byte-identiek ongewijzigd** (radiale scrim dark-only op de exacte
49/40/18%; de band en de verwijderde scrim zijn `dark:hidden`). Spanning die inherent blijft: "alle
tekst ≥ de vorige waarden" is onverenigbaar met een open midden-venster voor de h1 (die op de middenlijn
staat) — de h1 blijft boven zijn eigen AA-drempel maar onder de vorige (gewassen) waarde; dat is de
prijs van een leesbaar beeld en een bewuste keuze.

### Correctie 2026-09-06 (2) — geen enkele --bg-laag over de foto; contrast via text-shadow

De op 2026-09-06 beschreven "strak begrensde band" over subkop/prijs bleek alsnog een zichtbare
horizontale **balk** over de skyline (dekking ~0.79 op 70% diepte). Les: ook een smalle --bg-band leest
als een balk — de was was verplaatst, niet weggehaald. **Definitieve aanpak:** in light mode ligt er
**geen enkele --bg-laag** over de foto (geen wash, geen band, geen ellips); het beeld loopt ononderbroken
van boven tot onder. De light-dissolve onderaan is verzwakt naar `from-[90%]` (alleen de allerlaatste
rand). Tekstcontrast wordt volledig gedragen door een **per-glyph text-shadow-halo** (kleur `--bg`) op
h1/subkop/prijsregel, met `dark:[text-shadow:none]` zodat **dark byte-identiek** blijft. De halo is
onzichtbaar over de heldere lucht en licht de donkere letters alleen op waar ze de raamstijlen/laptop
kruisen — hij raakt de letters, niet het beeld.

**Verificatie = het screenshot** (geen contrasttabel als hoofdbewijs): 1440 + 1920 light tonen de foto
ononderbroken. Metriek ter aanvulling (tekstkleur-luminantie vs **gemiddelde** achtergrond onder de
regel): h1 ~15.6:1, subkop ~8.7–9.5:1, price ~8.3–9.0:1. Zie LESSONS 2026-09-06.

### Correctie 2026-09-06 (3) — alle overlays verwijderd, foto onbewerkt

Alle `--bg`-lagen over/rond de hero-foto zijn verwijderd (light én dark): de top-fade, de dark
onderste-helft-dissolve (die de onderkant zwart inbrandde), de light onderrand-dissolve, het dark
L/R-vignet, de dark radiale scrim (49/40/18%) en de dark amber top-glow. Geen filter, mask, opacity,
mix-blend of pseudo-element was aanwezig. De foto rendert nu **onbewerkt op volle opacity**, met een
**harde rand** tegen de pagina-achtergrond. De enige overgebleven laag is de per-glyph
**text-shadow-halo** op h1/subkop/prijs (op de letters, niet op het beeld; light-only). **Open punt
(Khidr beslist):** in dark verliezen subkop/prijsregel contrast waar de lichte tekst de heldere
city-lights-band / het laptopscherm kruist — er ligt geen scrim meer en de halo is light-only. Fix is
tekst-zijdig (halo ook in dark, of kleur/gewicht), nooit een laag over het beeld.

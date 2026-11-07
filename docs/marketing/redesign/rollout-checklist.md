# Redesign stijl B — uitrolchecklist (besluit Khidr 2026-11-05)

Stijl gekozen: **B "Poster"**. Wit, zwart, amber `#ffb000`, Space Grotesk + IBM Plex Mono, harde randen van 2px. Mockups staan in het design-canvas (pagina's "Drie stijlen" en "B — app"). Logo **L2** (gemarkeerde regel) en credit-icoon **C3** gekozen door Khidr op 2026-11-05 en dezelfde dag uitgerold (commit `77088ad`). De opties staan in `logo-opties.png`.

Alles hieronder hoort bij de redesign. Een punt is pas af als het in productie is gecontroleerd.

## Logo (nieuw, overal vervangen)
- [x] Logo-bestanden: horizontaal, alleen het beeldmerk en alleen het woordmerk, elk in zwart op wit, wit op zwart en transparant. SVG met de tekst omgezet naar paden, en PNG. Gaat naar `apps/*/public/logo/`.
- [x] Favicons in beide apps: `favicon.ico`, `favicon.svg`, `favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-192/512.png`, en `site.webmanifest` controleren.
- [x] `packages/shared/src/components/Header.tsx` (marketing-header).
- [x] `apps/app/src/components/AppTopbar.tsx` (app-kopbalk).
- [x] `apps/app/src/app/transcribe/page.tsx` (merkbalk van de balie).
- [x] `apps/app/src/app/unsubscribe/page.tsx`.
- [x] `apps/marketing/src/app/signup/page.tsx`.
- [x] OG-afbeelding `apps/marketing/public/og-default.jpg` (stijl B, 2026-11-05), plus de openGraph-verwijzingen in de layouts.
- [x] Organization-schema op de homepage: `logo` wijst naar `apple-touch-icon.png`, en dat bestand is nu het nieuwe icoon. Nog controleren met de Rich Results Test.

## E-mails (opmaak + logo)
- [x] `apps/app/src/lib/mail.ts`: transactionele mails via Resend.
- [x] `backend/mailer.py`: mails die de backend verstuurt.
- [x] `docs/email-templates/confirm-signup.html` en `reset-password.html`: de repo en de Supabase Auth-templates zijn bijgewerkt via de Management API op 2026-11-05. Verder niets in de auth-config veranderd: autoconfirm staat nog uit en Resend-SMTP is intact. Dit zijn de Supabase Auth-templates: in de repo bijwerken én in Supabase Dashboard → Auth → Email Templates zetten.
- [x] Mailopmaak naar stijl B. Gekozen: de donkere kopbalk blijft, met het witte horizontale logo erin, omdat dat in donkere modus het veiligst is. Verder een rand van 2px, geen radius, een amber accent en een vierkante zwarte knop. Gerenderd in licht en donker. Nog testen in Gmail, Outlook en Apple Mail met een echte verzending.

## Credit-icoon
- [x] `packages/shared/src/components/icons/HexagonCreditIcon.tsx` en `apps/app/public/credit-coin.png` vervangen door het gekozen icoon (C1–C4).
- [x] Pakketafbeeldingen `public/packages/*.webp` (schatkisten) vervangen door een vormgeving in stijl B (6-11, 640×640, zelfde bestandsnamen).

## Hexagon-motief uit het oude merk (meenemen in de pagina-redesign)
- [ ] Er staan nog hexagon-achtergronden en -illustraties in de app en op de marketingsite: de lege staat en het patroon in de bibliotheek, het dashboard, berichten, credits, transactiegeschiedenis, `HexField`/`ArticleHero`/`ContentCard`, DocsShell, het artikeloverzicht en signup. Gevonden met `grep -ril hexagon` op 2026-11-05. Vervangen door motieven uit stijl B (raster, regels, blokken).

## Opruimen
- [x] AlternativeTo-badge uit de footer halen (`packages/shared/src/components/Footer.tsx`, `/badges/alternativeto-badge-*.svg`). Besluit Khidr 2026-11-05. De `sameAs`-link in het Organization-schema blijft staan.
- [ ] Bekijken of `AlternativeToNudge` in de bibliotheek blijft. Dat is een aparte beslissing; de badge-beslissing gaat alleen over de footer.

## Buiten de repo (zelfde logo, zelfde dag)
- [ ] Stripe Checkout-branding: logo, icoon en merkkleur (Stripe Dashboard → Settings → Branding).
- [ ] Google OAuth-toestemmingsscherm: logo.
- [ ] Externe profielen met het oude logo (zie `external-logo-checklist.md`) (Khidr 2026-11-05: geen prio, maar niet vergeten): de afbeeldingen op AlternativeTo, Product Hunt, de X-pagina en het YouTube-kanaal (avatar en banner).
- [ ] Resend: weergavenaam en logo van de afzender, indien ingesteld.

## Pagina-redesign (bouwvolgorde uit audit-2026-11-04)
- [x] **Fundament (6-11):** tokens in beide apps naar stijl B (wit/inkt/amber `#ffb000`, neutrale grijzen, radius 0, geen zachte schaduwen, `--fg-on-accent` = inkt), Space Grotesk i.p.v. IBM Plex Sans, header met 2px inktlijn, destructieve knop/badge witte tekst op rood.
- [x] **Home (6-11):** geen foto meer; grote kop + mono-label, voor/na-blok (JFK), live tool, 01/02/03, video, "wat mensen meebrengen", "meer dan de woorden", bibliotheek (full-text search), prijsblok "Pay for minutes. Not months.". `HeroImage` + `public/hero/*` verwijderd (alleen home gebruikte ze).
- [x] **Pricing (6-11):** hero "Pay for minutes. Not months.", gedeelde `PricingTiers` als liniaal-raster (Plus amber; in de app-billing = geselecteerd pakket amber), geen schatkist-afbeeldingen meer, blok credits-vs-abonnement (break-even ≈8 u/mnd, afgeleid uit `pricePerMinute`), balie-zijdeur (€0,10/min, min €2), kostentabel/trust-rij/FAQ in stijl B. `PricingHero` verwijderd (verweesd). De pakketafbeeldingen `public/packages/*.webp` worden alleen nog als productafbeelding in Stripe Checkout gebruikt (`checkout/route.ts`, `pkg.image`) en zijn vervangen door versies in stijl B (zelfde bestandsnamen, de code is niet aangeraakt).
- [x] **Artikelen (6-11):** gedeelde `ArticleShell` voor alle 3 templates (52 artikelen; schema ongewijzigd per template): mono-label categorie + leestijd, grote kop, foto als ingelijste 21:9-band (geen hexagon-fallback meer), sticky inhoudsopgave op desktop (`ArticleToc`, h2-ids client-side), CTA vóór de middelste h2 + eind-CTA met prijs uit `pricing.ts` (`ArticleCta`), FAQ/bronnen/see-also met inktlijnen, prose-h2 groter, tabellen met inktlijnen. `/articles`-index: nieuwe kop, geen hexagon-textuur, kaarten met inktrand (ContentCard — ook docs).
- [x] **Docs (6-11):** /docs-index met typografische tegels (sectie.pagina-nummer in inkt, i.p.v. HexField), geen hexagon-textuur in index + DocsShell, zijbalk met inktlijn en actieve pagina amber, mono-sectielabels, TOC met inktlijn, 20 docs-h1's + AnchorHeading-h2/h3 groter in inkt, DocsTable/DocsCodeBlock met 2px inktrand. `HexField` verwijderd (nergens meer gebruikt).
- [x] **About + footer + auth (6-11):** gedeelde Footer met inktlijn, logo en drie kolommen (Product/Resources/Company + cookie-instellingen). /about in stijl B, met dezelfde inhoud. Login/signup/forgot/reset zonder hexagon-textuur en met grotere koppen. Gedeelde UI-primitives in stijl B: Button (2px inktrand, vet), Input (2px inkt, h-10), Card (2px inkt). In de tokens zijn ook `--radius-xs/md/xl/2xl/3xl/4xl` op 0 gezet, zodat geen enkele `rounded-*` (behalve `full`) nog zachte hoeken geeft, in site én app. Auth-logica niet aangeraakt.
- [~] **App (6-11):** zonder hexagon-textuur (DashboardBackdrop is nu een lege wrapper; `HexagonPattern` is verwijderd en nergens meer in gebruik, ook niet op /alternatives/otter-ai). Lege staat toont het L2-merk. Bibliotheek: grote kop met mono-teller, zoeken op "titles and transcript text", lijst met 2px inktrand en een inkt-kopregel, filterchips vierkant (collectie amber). Zijbalk: actieve pagina/collectie amber met inkt-tekst. Transcribe-pagina: mono-label + grote kop. **Contrastfix overal:** alle `text-accent`/`text-[var(--accent)]` (93×, amber als tekst ≈1,9:1 op wit) → `--accent-fg` (donker amber, AA); `--accent` blijft alleen als vlak. **Bijgewerkt 6-11 (blok 7a):** de methodekeuze heet nu '02 — Method' en het gekozen blok is amber, de YouTube-flow heeft '01 — Link', de kostenblokken (Video/Audio/CostBreakdown) hebben inktlijnen en de mode-iconen een vierkant kader. Invariants groen vóór en na. **Nog open:** '03 — Save to' (die stap bestaat niet in deze flow) en stap-labels in Audio/Playlist. Oorspronkelijk bewust uitgesteld: de genummerde stappen 01/02/03 en de bon-indeling uit de mockup. Die zitten in gedeelde tool-componenten met de credit-/offerte-flow (VideoTab/AudioTab/PlaylistTab/CostBreakdown), en die gaan in een eigen blok met de playlist-invariants-check. De mode-iconen (`TranscribeModeIcons`) zijn nog zeshoekig.
- [x] **Home, creatieve ronde (7-11):** op verzoek van Khidr ("overlay mist creativiteit") opnieuw ontworpen. Hero = kop + een transcriptvel als HTML (titelbalk, tabs, ¶-markeringen, spreker, amber zoektreffer). Daaronder een bronnenbalk ('Goes in →'). Secties met §-indexnummer in de marge: §01 voor/na als geannoteerde diff, §02 live tool, §03 pijplijn bron → transcript → bibliotheek → export, §04 bibliotheek als zoekresultaat met treffer (inktvlak), §05 catalogus-kaarten, §06 exports met echte snippets, §07 prijs als bon. Afsluitende amber band. Alle getallen uit constanten. **De demo-video (`HomeClipVideo`) is van de home gehaald:** hij toont de oude UI (hexagons, ronde hoeken) en spreekt de nieuwe stijl tegen. Het component blijft staan en komt terug zodra de clip opnieuw is opgenomen (staat op de screenshot-lijst). Nog open: `FreeToolEmbed` heeft nog de oude grijze tabbalk.
- [x] **Pricing, creatieve ronde (7-11):** hero met rechts een 'Free, without credits'-lijst (YouTube met captions, eerste 3 playlist-video's, alle exports behalve RAG, 100 MB, welkomstcredits; alles uit constanten). §01 pakketten (gedeelde `PricingTiers`) + btw/landen-regel. §02 **maandplanner** (`MonthPlanner`, client): schuif uren AI-transcriptie per maand → per pakket hoe lang het meegaat en wat het per maand kost, naast een abonnement van $10; boven ~8 u/mnd zegt hij eerlijk dat een abonnement goedkoper is. §03 kostentabel, §04 één bestand zonder account, §05 vertrouwen + FAQ (accordion genummerd Q01…, inktlijnen; ook op /transcribe). Gedeeld sectieframe `IndexSection` (home + pricing). `VatLine` verwijderd (tekst zit nu in §01).
- [ ] **Marketing /transcribe + `FreeToolEmbed`:** nog oude opmaak (gecentreerd, beige band, grijze tabbalk). Volgende blok.
- [ ] Volgende blokken: docs (placeholder-hexagons) → about → app (bibliotheek + tool volgens canvas "B — app"; `rounded-xl/2xl`-klassen die niet via `--radius` lopen) → footer → hexagon-motieven opruimen.

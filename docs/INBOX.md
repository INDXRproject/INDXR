# INBOX — Binnenkomende taken voor Claude Code

---

## Hero images — status na sessie 2026-04-17

Nieuwe hero-dark.jpg en hero-light.jpg gegenereerd via Leonardo.ai (Flux Kontext Pro, Cinematic) en vervangen in /public. Commit: "feat: new hero images + raise headline position".

Foto-beschrijving dark: luxury penthouse nacht, frontaal, dark marble desk met witte aders, Apple MacBook met lichte sidebar UI als lichtbron, Magic Mouse, succulent, koffiemok, sterrenhemel + stadslichten achter ramen met dunne stalen profielen (mullions).
Foto-beschrijving light: zelfde compositie als dark, daglicht versie via Image-to-Image transformatie, wit marmer met donkere aders, ochtendlicht.

Beide foto's zijn placeholder — vervangen zodra dashboard UI af is via Image-to-Image (strength ~0.35).

## Logo assets — openstaande items na sessie 2026-04-17

Logo bestanden aangemaakt via Recraft.ai (honeycomb mark + INDXR AI wordmark).
Huidige status: zwart-op-wit versies klaar in alle formaten (SVG, PNG, WebP, JPG).

Nog te maken (via Photopea.com):
- logo-mark-white.png (wit, transparante achtergrond — invert + remove bg)
- logo-full-white.png (wit, transparante achtergrond)
- logo-mark-black.png (zwart, transparante achtergrond — alleen bg verwijderen)
- logo-full-black.png (zwart, transparante achtergrond)

Favicons: gebruik realfavicongenerator.net met logo-mark-black.png → alle formaten + site.webmanifest

Bestandsstructuur: public/logo/ voor logo varianten, favicon.ico + apple-touch-icon.png etc in public/ root

Drie logo-typen:
- indxr-mark-* = alleen honeycomb
- indxr-horizontal-* = honeycomb + tekst naast elkaar
- indxr-wordmark-* = alleen tekst "INDXRai", geen honeycomb (voor navbar spacing controle, briefpapier, Word docs)

Per type: black-transparent.svg/png, white-transparent.svg/png, black-on-white.png, white-on-black.png

Navbar implementatie: logo-full-currentcolor.svg als inline SVG component zodat kleur meebeweegt met dark/light mode

OPGELOST 2026-04-17: Logo bestanden waren nooit ge-git add-ed — public/logo/ map bestond lokaal maar niet in de repository. Vercel had de bestanden nooit ontvangen. Opgelost via git add public/logo/ + push (commit 82a18a1, 18 bestanden).

## Hero tekst positie — openstaand

Op 1366x768 en MacBook 13/14" (1440x900, 1512x982) overlappen de knoppen de laptop in de hero foto. Op grotere schermen (1920x1080, MacBook 16") ziet het er goed uit. Huidige staat: pt-[130px] lg:pt-[150px] xl:pt-[160px] op section, object-[center_20%] lg:object-[center_30%] op foto. Structurele fix: bij redesign hero opnieuw opbouwen met echte dashboard screenshot, of foto vervangen door versie waar laptop lager in frame staat.

## Navbar + branding — openstaande items

- Logo splitsen in mark + wordmark apart in navbar (gap-3, mark 32px, wordmark 22px)
- Lettertype kiezen: kandidaten Geist (voorkeur), DM Sans, Outfit — implementeren via next/font
- Brand house style document aanmaken zodra lettertype gekozen is

## Landing page design — openstaande items na sessie 2026-04-17

- Lettertype verbeteren → redesign moment, nu tijdelijk Inter feature settings
- Navbar: transparant geïmplementeerd, bij scrollen bg/50 zonder blur
- Hero copy bijgewerkt: "Extract. Export. Index. Every video."
- Subkop: "YouTube videos, playlists, and audio files — transcribed in seconds. Export as TXT, Markdown, SRT, JSON, or RAG-optimized format. Neatly organized in your library."
- Kleine tekst onder knoppen: "No account required — sign up for free credits, exports & library access."
- Nav label: "Transcribe" (was "Transcript Generator" → "Generator" → "Transcribe")
- View Pricing knop: wit met border, was onzichtbaar transparant
- Logo redesign: open punt, Figma sessie gepland, richting geometrisch minimaal
- Hero tekst positie: nog ietsje hoger gewenst, pb-48 sm:pb-64 lg:pb-72

## Hero image — toekomstige vervanging (strategisch notitie)

Zodra het main dashboard UI afgerond is: `public/hero-dark.jpg` en `public/hero-light.jpg` vervangen door een screenshot van het echte INDXR.AI dashboard. Dark versie: screenglow/ambient light effect passend bij dark theme. Light versie: clean/flat. Zelfde bestandsnamen behouden zodat HeroImage.tsx ongewijzigd blijft. Huidige penthouse-foto's zijn bewuste placeholder.

---

## Openstaande items uit vorige sessie (2026-04-16)

De grote SEO/content-batch is afgerond. Zeven kleine taken zijn blijven liggen:

1. **`public/llms.txt` aanmaken** — inhoud staat in de oude INBOX (§3A). Korte beschrijving van wat INDXR.AI doet, prijzen, RAG JSON, key pages, en wat het niet doet.

2. **`public/robots.txt` aanmaken / bijwerken** — inhoud staat in de oude INBOX (§3B). Allow alle AI-bots (ClaudeBot, GPTBot, PerplexityBot), disallow CCBot en Meta-ExternalAgent, disallow /api/ /dashboard/ /admin/.

3. **`docs/wiki/business/seo-content-plan.md` aanmaken** — gebruik `docs/wiki/business/INDXR-SITEMAP.md` als bronbestand. 32 pagina's, 8 categorieën, prioriteitsvolgorde voor implementatie.

4. **`docs/wiki/business/writing-framework.md` aanmaken** — gebruik `docs/wiki/business/INDXR-WRITING-FRAMEWORK.md` als bronbestand. Tone, pagina-anatomie, verplichte elementen, verboden formuleringen.

5. **ADR-015 bijwerken** (`docs/wiki/decisions/015-rag-json-export.md`) — definitieve RAG JSON spec toevoegen: schema met `version`, `chunking_config`, chunk-velden incl. `chapter_title` en `start_time_formatted`. Configureerbare chunk-groottes 30s/60s/90s/120s. UX: toggle per tab, inline waarschuwing bij auto-captions. Pricing: 1 credit per 15 min, eerste 3 exports gratis.

6. **`docs/wiki/roadmap/backlog.md` bijwerken** — export-optimalisaties toevoegen als concrete taken: JSON `offset→start` + `end` + metadata wrapper, Markdown YAML frontmatter, CSV segment_index/end_time/word_count + UTF-8 BOM, SRT/VTT resegmentatie 3-7s/42-chars, TXT filler-word removal toggle.

7. **`docs/wiki/roadmap/priorities.md` bijwerken** — Stripe checkout/route.ts bijwerken met nieuwe prijzen (Starter €2.99/150cr, Basic €6.99/500cr, Plus €13.99/1200cr, Pro €27.99/2800cr, Power €54.99/6000cr) staat als hard blocker in known-issues maar moet ook zichtbaar zijn in priorities.

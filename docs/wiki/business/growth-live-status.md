---
eigenaar: Claude-piloot (Cowork-sessie). Claude Code schrijft dit bestand NIET.
doel: actuele stand van groei-uitvoering (Google Ads, AlternativeTo, Product Hunt). Het plan zelf staat in growth-plan.md.
---

# Groei — live-status

Dit bestand is van de Claude-piloot. Claude Code leest het wel, maar wijzigt het niet (zie CLAUDE.md). Wil Claude Code iets melden, dan in docs/LOG.md of in zijn eigen rapport.

Laatst bijgewerkt: 2026-10-28 16:30.

## 1. Live-status (bijgewerkt 2026-10-27 16:30, Claude-piloot)

**Idee van de campagne:** alleen zoekopdrachten kopen van mensen die nú één bestand hebben en daar tekst van willen. De advertentie belooft wat de balie doet: uploaden, prijs zien, gratis voorproefje, per bestand betalen, zonder account. Geen creators die ondertitels in beeld willen, geen gratis-zoekers, geen converters.

Campagne **`US · Search · Balie (video/audio to text)`** (campaignId 24390731490) staat **aan** sinds 2026-10-25 23:59.
- Handmatige CPC €1,50 (de wizard zette het groepsbod op €0,01; gecorrigeerd — bij nieuwe groepen altijd het bod controleren) · €10/dag (Google mag per dag tot 2× besteden, maandgemiddelde blijft ~€10/dag) · alleen Google Search · VS (Presence) · AI Max uit · advertenties roteren gelijk · suffix `via=ads&kw={keyword}`.
- **Video to text**: video to text · video transcription · video transcriber · transcribe video to text (€1,51, akkoord Khidr 26-10) e.d. + sinds 26-10 mp4 to text · mp4 to text converter · mp4 to transcript · transcribe mp4 · mov to text. `[mp4 to text]` = "Rarely shown (low Quality Score)".
- **Audio to text**: mp3 to text · audio to text · audio file to text · transcribe audio file · voice memo to text e.d. Khidr betwijfelt of voice memos opbrengen → weekrapport.
- **Captions and subtitles**: 26-10 **verwijderd** (besluit Khidr) + SRT-sitelink weg. De enige bezoeker uit die groep (5 klikken) uploadde clips van 1–2 min en kocht niet.
- Advertentiecopy 27-10: "Free 3-Minute Preview" → "Free Preview of Your File"; "read the first 3 minutes free" → "read a free preview"; callout "Free 3-minute preview" verwijderd. Callouts nu: No subscription · Pay per file · No account needed · Processed in the EU · Credits never expire · Speaker labels. Sitelinks: Pricing · Supported formats · How it works.
- Uitsluitingen (campagne): free · gratis · youtube · yt · link · url · live · real time · realtime · app · capcut · tiktok · instagram · translate · translation · download · job · jobs · hiring · salary · work from home · course; 27-10 + "how to change" · "copy text".
- **Mandaat piloot (26-10):** zelf = uitsluitingen, passende zoektermen toevoegen, afkeuringen/onjuiste copy repareren; met akkoord Khidr = biedingen, budget, groepen/campagne aan/uit, zoekwoorden verwijderen.
- **Cijfers t/m 26-10:** 13 klikken, €19,28 (waarvan €8,81 Captions), 0 aankopen. Alle 3 ad-offertes tot nu toe: clips van 15–60 s à €2; iedere bezoeker vertrok binnen ~12 s na de prijs, vóór het voorproefje.
- **Screenshots 28-10:** AlternativeTo — 4 oude screenshots vervangen door app-transcript, app-summary, app-export, pricing (docs/marketing/screenshots/, commit bc1b0c2/3a5ba6f), ingediend ter goedkeuring door AlternativeTo-moderator. Product Hunt-draft — dezelfde 4 in 1270×760 als galerij; draft 9/11, alle verplichte onderdelen compleet (ontbreekt: video, shoutouts). Balie-screenshots (balie-*.png) bewust niet extern gebruikt: tonen €2, de duurste route. AlternativeTo stond 28-10 op 3 likes.
- **€2-claims vervangen (27-10, akkoord Khidr):** "From €2 per File" was volgens Khidr saboterend (duurste route). Kop → "Credits from €0.02 per Minute"; beschrijving → "No subscription and no account needed. Pay once per file, or use credits."; sitelink Pricing → "Credits from €0.02 per minute / Never expire. No subscription". Regel: in uitingen altijd de goedkoopste route (credits) noemen, nooit het balie-minimum als "vanaf"-prijs.
- **Dagcheck 28-10:** 21–27 okt Video+Audio: 16 klikken, €23,87, CTR 10,7%, CPC €1,49, 0 aankopen (campagne incl. verwijderde Captions ~€32,70). Advertenties (versies 27-10) Eligible, sterkte "Good". Sinds 27-10 07:00: 5 nieuwe ad-bezoekers (4 mobiel), 0 offertes, meesten weg binnen ~5 s op /transcribe. Toegevoegd: [video transcript generator], "video transcript generator", [audio to text transcription] (passende zoektermen die al klikten). Let op bij PostHog-analyse: distinct_id-prefixen (UUIDv7) groeperen niet betrouwbaar per persoon — groepeer op volledige distinct_id.
- Controles: dagelijks 09:13 t/m 1 nov (daarna om de dag), weekrapport elke maandag vanaf 2 nov, beslismoment 24 nov.

## 2. Meetfout + voorproefje-lek (2026-10-26, gevonden via PostHog, gerepareerd door Claude Code)
- Herkomst (`via`/`kw`/`gclid`) kwam niet in de events: AcquisitionCapture zat alleen in de marketing-layout. Gerepareerd in commit `3fd0afb`; sinds 26-10 komen via=ads, kw en duration_seconds mee op `quote_shown` (bevestigd met echte ad-bezoekers 26/27-10).
- Voorproefje gaf korte bestanden volledig gratis weg. Nu min(3 min, 1/3 duur) (commit `3fd0afb`). Copy op de balie aangepast in commit `8534489`.
- PostHog-project INDXR = **155180** (EU). Niet 298689 — dat was een fout van Claude Code op basis van een lokale key.

## 3. Product Hunt (besluit 2026-10-27)

**Status:** draft "INDXR" (account @sinbadbuilds, 1 volger, 6 karma) op 27-10 herschreven door de piloot: tagline "Transcribe audio & video. Pay per minute, no subscription.", beschrijving die met credits vanaf €0,02/min opent en de balie als optie voor één bestand noemt, eerste reactie bijgewerkt (10 welkomstcredits i.p.v. 50, balie-zin), categorieën Transcription + AI notetakers, pricing "Free Options". **Ontbreekt nog:** galerijafbeeldingen (verplicht, 1270×760) en een video van ~1 min.

**Advies piloot: lancering begin december, ná het Ads-beslismoment van 24 nov.** Eén kans; dan moet het product bewezen zijn. Voorwaarden:
- ≥3 betalende klanten (zelfde grens als de Ads-beslisregel) en balie 2 weken zonder fouten;
- 5 afbeeldingen 1270×760 + video ~1 min;
- 4 weken dagelijks een paar oprechte forumreacties (karma/volgers opbouwen) — Khidr doet dit;
- lijst van 30–50 mensen die op de dag een bericht krijgen.
Publiceren/inplannen alleen met akkoord Khidr. Herinnering ingepland op 25 nov.

**AlternativeTo (live sinds 25-10):** 10 alternatieven gekoppeld (Otter.ai, Descript, Sonix, Speak AI, Notta, TurboScribe, Trint, Audext, HappyScribe, Rev.com); 0 likes, dus nog niet zichtbaar in de top-12 bij concurrenten. Likes alleen van echte gebruikers (account nodig). Badge op indxr.ai + like-vraag na geslaagd transcript: akkoord Khidr 27-10. Screenshots vervangen door balie-screenshots zodra Claude Code die maakt.

**Positionering per kanaal (besluit Khidr 28-10):** Google Ads mag commercieel (prijs, per bestand, credits vanaf €0,02/min). Product Hunt krijgt het eerlijke, brede verhaal: informatie-overload — iedereen heeft meer podcasts, colleges en interviews dan tijd. INDXR laat je eerst checken of iets je tijd waard is (transcript + samenvatting, de kern in minuten) en daarna luisteren, overslaan, of de kern exporteren naar waar je notities houdt. Voor iedereen die iets leert (níet beperkt tot studenten/onderzoekers). Voorbeeld: Khidr exporteert naar Obsidian als Markdown en linkt vanuit zijn notities. Daarnaast: SRT/VTT voor videomakers, JSON voor RAG. Draft 28-10: tagline "See what's in a podcast or lecture before you spend hours"; beschrijving en eerste reactie in die lijn; balie niet genoemd.

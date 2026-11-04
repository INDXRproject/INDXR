# Community-posts INDXR (werkblok 2026-11-04, Claude-piloot)

Strategie (growth-live-status.md §0): geen betaald verkeer; de klant is de verzamelaar die uren
video/audio omzet in tekst die hij bewaart, doorzoekt en gebruikt. Communities zijn het kanaal om die
klant te bereiken. **Claude schrijft, Khidr plaatst vanaf zijn eigen accounts. Claude plaatst niets.**

## Gekozen (volgorde van plaatsen)

| # | Waar | Waarom | Bestand | Herkomstlink |
|---|---|---|---|---|
| 1 | Hacker News — Show HN | Toegestaan voor iets wat je zelf maakte en wat mensen zonder account kunnen proberen (YouTube-captions en de balie werken zonder account). Publiek: ontwikkelaars, RAG-bouwers. | `show-hn.md` | `https://indxr.ai/?utm_source=hn` |
| 2 | r/ObsidianMD | Grootste match met de verzamelaar; Khidr gebruikt INDXR zelf zo (Markdown-export met YAML-frontmatter naar zijn vault). Workflow-post, geen advertentie. | `reddit-obsidianmd.md` | `https://indxr.ai/?utm_source=reddit_obsidian` |
| 3 | r/Rag | RAG-bouwers; we hebben een echt artikel over chunken van YouTube-transcripten + RAG-JSON-export. Kennis delen, tool als bijzaak. | `reddit-rag.md` | `https://indxr.ai/articles/chunk-youtube-transcripts-for-rag?utm_source=reddit_rag` |
| 4 | Indie Hackers | Eerlijk bouwverhaal (€540 Ads, 0 aankopen, wat we leerden) past precies bij IH; levert feedback en vroege gebruikers. | `indie-hackers.md` | `https://indxr.ai/?utm_source=indiehackers` |

Niet gekozen: r/GradSchool, r/PhD, r/NoteTaking (strenge of onduidelijke regels tegen zelfpromotie, kleine match zonder bestaande bijdrage-geschiedenis), r/PKMS (later, na reacties op r/ObsidianMD), Obsidian-forum (eerst reputatie opbouwen; showcase-categorie is voor plugins/vaults).

## Spelregels (onderzoek 2026-11-04)
- **Show HN** (news.ycombinator.com/showhn.html): titel begint met "Show HN:", het moet zonder aanmelding te proberen zijn, geen landingspagina, geen vrienden vragen om te upvoten. Uitleggen hoe en waarom je het bouwde; zelf in de reacties zitten.
- **Reddit:** lees vóór plaatsen de regels in de zijbalk van de subreddit (die konden we niet betrouwbaar ophalen). Algemene lijn: eerst waarde, link pas aan het eind, eerlijk zeggen dat je de maker bent, niet in meerdere subs tegelijk dezelfde tekst. Kleine, specifieke subs werken beter dan grote. Een account met alleen eigen-product-posts wordt gemarkeerd: Khidr reageert ook gewoon op andere posts.
- **Tempo:** één community per paar dagen, zodat Khidr reacties kan beantwoorden. Reacties binnen de eerste uren tellen het zwaarst.
- **Meten:** de `utm_source`-links laten PostHog (155180) de herkomst zien; het weekrapport telt aanmeldingen en terugkeer per bron.

## Feiten waar de teksten op steunen (geverifieerd in de code 2026-11-04)
- YouTube-captions ophalen: gratis, zonder account (anoniem alleen platte tekst).
- AI-transcriptie (ook YouTube zonder captions, eigen bestanden tot 10 uur): 1 credit per minuut; credits vanaf €0,02/min (Power-pakket), verlopen niet, geen abonnement. Nieuw account: 10 credits.
- Playlists tot 500 video's per job; de eerste 3 caption-video's per playlist gratis.
- Markdown-export met YAML-frontmatter (title, channel, duration, language) en optionele tijdstempel-kopjes die naar de video linken. Ook TXT, SRT, VTT, CSV, JSON, RAG-JSON (1 credit per 10 min).
- Bibliotheek met collecties; zoeken; collectie in één keer exporteren.

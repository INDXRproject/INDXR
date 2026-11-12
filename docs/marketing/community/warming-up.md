# Opwarmen: HN en Reddit (11-11-2026)

Doel: `sinbadbuilds` wordt een gewoon, behulpzaam account vóór de Show HN en de Reddit-posts.
Regel: reacties gaan over het onderwerp, niet over INDXR. Geen links naar indxr.ai, behalve waar
iemand letterlijk om zoiets vraagt. Khidr plaatst, Claude schrijft concepten; Khidr maakt ze eigen.

## Toon (feedback Khidr 12-11: "je praat als een AI, too much")
Kort: 2–4 zinnen. Eén punt per reactie, geen opsomming van drie maatregelen. Geen afrondende wijsheid aan het eind ("None of this is AI-specific…"), geen "exactly", "neat trick", "makes a big difference". Gewoon zeggen wat je deed of vraagt, met kleine letters en losse zinnen mag.

## Hacker News: eerste 3 reacties (concepten)

**1. "How do you keep up quality when you vibe-code?"** — https://news.ycombinator.com/item?id=50444380
> Solo dev here, most of my code is written by Claude Code now. Three things made the biggest difference for me. First, a project file the agent reads at every start, with hard rules ("a task isn't done until the build is green and there's a test or a production check"), not style tips. Second, a lessons file: every time I correct the agent on something that could happen again, it appends one line, and it reads that file before starting. The same mistakes stopped coming back. Third, I never let it mark something as fixed in the docs without the proof in the same message. It sounds bureaucratic, but it's mostly copy-paste once it's set up.

**2. "MCP Explained"** — https://news.ycombinator.com/item?id=50379249
> One practical thing I learned shipping a remote MCP server with OAuth: the auth part is most of the work, not the tools. Dynamic client registration, PKCE, the 401 with the right WWW-Authenticate header, the protected-resource metadata. Once Claude could connect, the five tools themselves took an afternoon. Second lesson: keep tools read-only and say so in the annotations (readOnlyHint, and a title). Clients show that to users, and people are much more willing to connect something that can't change their data.

**3. "Ask HN: Are you building an AI company brain?"** — https://news.ycombinator.com/item?id=50379710
> Not for a company, but for myself: I wanted Claude to work with the lectures and interviews I actually learn from, not only with what it knows. What surprised me is that people rarely want "answer only from my documents". They want the model's own knowledge and web search, plus their sources on hand, with clear citations so they can see which part came from where. Keeping those two apart in the answer turned out to matter more than retrieval quality.

Volgorde: 1 vandaag, 2 morgen, 3 overmorgen. Daarna de Show HN (`show-hn.md`), dinsdag t/m donderdag 15–17 uur NL.

## Reddit: abonneren en meedoen (alleen lezen en behulpzaam reageren, 1–2 weken)

| Subreddit | Waarom | Eigen post later? |
|---|---|---|
| r/ObsidianMD | notities uit colleges/video's, Markdown-export | ja, volgens hun regels (Showcase/Self-promo-draad) |
| r/PKMS | personal knowledge management, bronnen verzamelen | ja, alleen als gesprek, niet als advertentie |
| r/Zettelkasten | notities met bronvermelding | nee, alleen reageren |
| r/notetaking | studenten en notitie-apps | voorzichtig, regels lezen |
| r/GradSchool, r/PhD | literatuur, interviews transcriberen, citeren | nee (promo verboden), alleen helpen |
| r/AskAcademia | APA, bronnen, onderzoeksworkflow | nee, alleen helpen |
| r/ClaudeAI | MCP-connectors, Claude-workflows | ja, vaak toegestaan met flair ("Built with Claude") |
| r/mcp | MCP-servers delen | ja, daar is het gebruikelijk |
| r/Rag | RAG-pipelines, chunked JSON | ja (`reddit-rag.md`) |
| r/podcasting | transcripten van eigen afleveringen | voorzichtig |
| r/Journalism | interviews uitschrijven, quotes checken | nee, alleen helpen |

Ritme: elke dag 2–3 oprechte reacties, ~10 behulpzame reacties per eigen post (de 9:1-vuistregel).
Lees per sub de zijbalk-regels voordat je iets van jezelf plaatst.

## Reddit-profiel (Khidr vult in: reddit.com/settings/profile)
- Display name: `Khidr | INDXR`
- About: `Solo dev from the Netherlands. I build INDXR (indxr.ai): lectures, interviews and videos as transcripts you can search, cite and use in Claude or ChatGPT. Ask me anything about transcripts, Obsidian or MCP.`
- Social link: https://indxr.ai · Avatar: `https://indxr.ai/press/indxr-avatar.jpg`
- Waarom zo: de band met INDXR staat open en bloot in het profiel; dat is de basis om later eerlijk naar indxr.ai te verwijzen.

## Later naar indxr.ai verwijzen zonder gedoe
1. Alleen in een draad waar iemand precies dit probleem heeft (transcript van colleges/interviews, bronnen in Claude).
2. Altijd melden: "Disclosure: I built this." Geen verkapte aanbeveling.
3. Eerst het antwoord zelf geven (ook gratis alternatieven noemen), de link als laatste regel.
4. Hooguit één op de tien reacties met een link; nooit dezelfde tekst twee keer.
5. Per sub de regels lezen; waar zelfpromotie verboden is (GradSchool, PhD, AskAcademia, Journalism): nooit linken, ook niet als het past.
Risico als je dit loslaat: verwijderde reacties, ban in die sub, of een site-brede shadowban (je ziet je eigen reacties nog, niemand anders).

## Gereedschap: niet Bazzly
Bazzly (claude.ai-connector "Bazzly Reddit Research") post via eigen accounts en geeft upvotes (vote manipulation, tegen de regels van Reddit), $199/maand. Niet gebruiken. Claude kan Reddit zelf niet openen (browser en WebFetch geblokkeerd). Werkwijze: Khidr opent een draad en plakt de tekst (of de link + screenshot), Claude schrijft de reactie. Het Obsidian-forum (forum.obsidian.md) kan Claude wél lezen: daar zoekt Claude passende draden.

**Obsidian-forum-account:** gebruikersnaam `Sinbad` (https://forum.obsidian.md/u/Sinbad). Zijn geplaatste posts staan als JSON op https://forum.obsidian.md/u/Sinbad/activity.json (WebFetch op de HTML-pagina geeft niets, de JSON moet).

## Links altijd met herkomst
Elke link naar indxr.ai die we zelf plaatsen krijgt `?utm_source=<kanaal>`: `x`, `reddit`, `hn`, `obsidian-forum`, `youtube`. PostHog leest die bij de eerste bezoek (first-touch). Zonder utm zie je X alleen als verwijzer `t.co`. Links naar claude.ai/directory/indxr kunnen geen utm dragen; daar meet het directory-portaal (verbindingen, toolcalls).
Eerste X-post 11-11 had geen utm (docs-link + directory-link in een reactie); verkeer daarvan herkennen we aan verwijzer t.co.

## Log
- 2026-11-11: HN-profiel ingevuld; eerste 3 concepten klaar (zie boven). Dagelijkse ronde ingepland 13:41 (HN + Obsidian-forum, concepten in drafts/).
- 2026-11-12: ronde 2 — 3 concepten in drafts/2026-11-12.md (HN Yogurt/diarisatie, HN Humble Bundle/vibe-coding-veiligheid, Obsidian-forum Ibis/citeren met tijdstempel). Show HN nog niet (pas 1 dag reacties in de log).
- 2026-11-12: Khidr plaatste HN-concept 1 en 2 van vandaag (2 aangepast). Toonregel toegevoegd. Product-gat 3 (Zotero-export) genoteerd.
- 2026-11-12: Obsidian-forum verkend (categorieën, citeerketen Zotero/.bib/Pandoc, 2 extra concepten). Notities in obsidian-forum.md.
- 2026-11-12: geplaatst door Khidr — Obsidian-forum: [How I add citations…](https://forum.obsidian.md/t/how-i-add-citations-to-my-obsidian-notes/121851/2) (tijdstempel als locator) en [What do you do with research notes…](https://forum.obsidian.md/t/what-do-you-do-with-research-notes-once-a-project-is-finished/120011/5) (bronnen buiten de vault); HN: reactie in de Humble Bundle/vibe-coding-draad. Dagronde leest deze voortaan zelf terug (voice.md).

# Opwarmen: HN en Reddit (11-11-2026)

Doel: `sinbadbuilds` wordt een gewoon, behulpzaam account vóór de Show HN en de Reddit-posts.
Regel: reacties gaan over het onderwerp, niet over INDXR. Geen links naar indxr.ai, behalve waar
iemand letterlijk om zoiets vraagt. Khidr plaatst, Claude schrijft concepten; Khidr maakt ze eigen.

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

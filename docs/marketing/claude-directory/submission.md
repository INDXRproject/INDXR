# Claude Connectors Directory: inzending INDXR (voorbereid 9-11-2026)

Bron van de eisen: https://claude.com/docs/connectors/building/submission (gelezen 9-11). Indienen via
**claude.ai/directory/manage → Submit new → MCP connector**, met een betaald Claude-account. De voortgang
wordt in de browser bewaard. Escalaties: mcp-review@anthropic.com. Na indienen volgt een automatische scan;
standaard komt de connector als **Community**-listing in de directory. Soms beoordeelt ook een mens hem.

## Voorwaarden (status)
| Eis | Status |
|---|---|
| Remote HTTPS-server | ✅ `https://app.indxr.ai/api/mcp` |
| OAuth 2.0 (DCR, PKCE S256, 401 + WWW-Authenticate, resource-metadata) | ✅ ADR-108, gate 15/15 |
| Callback `https://claude.ai/api/mcp/auth_callback` en loopback voor Claude Code | ✅ allowlist claude.ai/claude.com/loopback |
| Elke tool heeft `title` + `readOnlyHint` | ✅ 5 tools, alle read-only |
| Getest als custom connector in Claude | ✅ Khidr (8-11) en Claude (9-11, HIST 202-demo) |
| Documentatie-URL | ✅ https://indxr.ai/docs/guides/ai-assistants |
| Privacybeleid met een sectie over de AI-koppeling | ✅ `/privacy` §"AI assistants (optional)", 2026-11-09 |
| Ontkoppelen in de app ("Connected apps") | ✅ Instellingen → Connected apps, 2026-11-09 |
| Gevuld reviewer-account | ✅ `reviewer@indxr.ai`, is_internal=true, 2 collecties (50 transcripten, read-only gedupliceerd uit contact@, geen nieuwe extracties). Khidr zet het wachtwoord zelf |
| Icoon | ✅ het INDXR-merkteken (apps/marketing/public/, vierkant, ≥512 px) |

## Wat je in het portal invult

**1. Connection:** `https://app.indxr.ai/api/mcp` (één URL voor iedereen).

**3. Listing**
- **Server name:** INDXR
- **One-liner (≤200):** Search and quote your own library of lecture, interview and video transcripts, each with its source, timestamps and an APA citation.
- **Description (≤2000):**

> INDXR keeps the lectures, interviews, podcasts and videos you learn from as clean transcripts, each with its source: channel, link, publication date and a ready APA 7 citation. Connect your library and Claude can use those sources next to everything it already knows and can look up.
>
> Claude can list your collections (a course, a research project, a series of interviews), search titles and the transcript text itself, read a transcript in time blocks with timestamps and speaker names, look up the full source with its citation, and read summaries you already made. Every quote comes with the minute it was said and a link to that moment in the video, so you can check it.
>
> Good for students working through a lecture series, researchers with hours of interviews, and journalists and non-fiction writers who need quotes they can verify. Ask Claude to compare what two lecturers say, draft study notes with a reference per section, or find every mention of a name across a project. Use your sources alongside Claude's own knowledge and web search, or ask it to answer from your sources only.
>
> The connector is read-only: it never adds, changes or deletes anything, never spends credits, and only sees your own library. Connecting is free on every INDXR account. You add sources in INDXR itself: YouTube videos and playlists (captions are free) or your own recordings (AI transcription, pay per minute, no subscription).

- **Categories (1–5):** Education · Research · Productivity · Writing (kies wat het portal aanbiedt; Knowledge management als dat bestaat)
- **Documentation URL:** https://indxr.ai/docs/guides/ai-assistants
- **Privacy policy URL:** https://indxr.ai/privacy (pas indienen na punt 7)
- **Support contact:** support@indxr.ai
- **Icon:** `docs/marketing/claude-directory/icon-512.png`
- **Slug (permanent):** `indxr`

**4. Use cases**
- Primair: (1) een college- of cursusreeks bestuderen en er notities en citaten uit halen; (2) quotes in interviews en podcasts terugvinden en controleren voor artikelen en boeken; (3) zoeken en vergelijken binnen een eigen onderzoeksverzameling.
- Wat gebruikers vooraf nodig hebben: een gratis INDXR-account (indxr.ai/signup) met een paar transcripten. Captions zijn gratis; een nieuw account krijgt 10 credits voor AI-transcriptie.
- Leest/schrijft: **alleen lezen**.

**5. Company:** Tiny Web Ventures · https://indxr.ai · primair contact: contact@indxr.ai

**6. Authentication:** Required · OAuth (dynamic client registration). Geen door Anthropic beheerde client nodig.

**7. Data handling:** Eigen API (eigen dienst). Geen persoonlijke gezondheidsgegevens. Geen gesponsorde content.

**8. Test & launch** (tekst voor reviewers; inloggegevens vul jij in het portal in, nergens anders)
> 1. Add the connector at https://app.indxr.ai/api/mcp (or pick it from the directory) and click Connect.
> 2. On the INDXR sign-in page, sign in with the reviewer email and password provided in this form.
> 3. Click Allow on the consent screen ("read your library; nothing changed or deleted").
> 4. The account holds two collections with full transcripts: "PHIL 176 · Death (Kagan)" (Yale lectures) and "HIST 202 · European Civilization 1648–1945".
> 5. Example prompts, one per tool:
>    - "List my INDXR collections." → list_collections
>    - "Search my library for 'soul'." → search_library
>    - "Read the first 15 minutes of lecture 2 in my Death collection." → get_transcript
>    - "Give me the APA citation for that lecture." → get_source
>    - "Is there a summary of lecture 1?" → get_summary (returns a note when none exists)
> All tools are read-only; no reset is needed. Rate limit: 60 requests per minute per account.

En vink aan: alle tools zelf getest (gedaan, als custom connector in Claude).

**9. Compliance:** zeven verklaringen. Alle zeven gelden voor ons: geen financiële transacties, geen AI-media, geen verzameling van gespreksdata, publieke documentatie aanwezig.

## Status portal (9-11, Claude)
Stap 1–7 ingevuld in het draft (tab claude.ai/directory/manage/new/connector, "Draft saved in this tab").
Stap 8: instructies staan erin met `<<PASSWORD>>` als plek voor het wachtwoord; vinkje "Self-tested" en
de 7 verklaringen van stap 9 zet Khidr zelf (attestaties, niet door Claude). Extra notities stap 9 ingevuld.
Contact-e-mail: contact@indxr.ai. Iconen: MCP-server geeft sinds commit 665c72b `icons` + `website_url` mee;
listing gebruikt https://indxr.ai/web-app-manifest-512x512.png.

## Checklist voor Khidr (in deze volgorde)
1. ✅ Gedaan 2026-11-09: privacybeleid, Connected apps, en het reviewer-account `reviewer@indxr.ai` (gevuld, hieronder).
2. Zet het wachtwoord van het reviewer-account zelf (Supabase → Auth → gebruiker `reviewer@indxr.ai` → Reset of via de admin) en bewaar het in Proton Pass. Er staat nog geen wachtwoord op — dat is bewust nooit door Claude gezet of gezien.
3. Open claude.ai/directory/manage → Submit new → MCP connector, en plak de velden hierboven.
4. Vul bij stap 8 het e-mailadres en wachtwoord van de reviewer in.
5. Dien in. Laat mij daarna weten dat het ingediend is, dan volg ik de status op (portal + mail).

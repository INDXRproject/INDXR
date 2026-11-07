# Prompt voor Claude Code: AI-koppeling (MCP) fase 1 — 2026-11-08

Besloten door Khidr (8-11): bouwen; gratis voor elk account; alleen lezen; Claude Connectors Directory
wel, ChatGPT-store NIET (voor betalende ChatGPT-gebruikers komt een korte instructie om zelf te koppelen
via developer mode); Product Hunt-lancering wacht tot dit live is. Onderzoek en onderbouwing:
Claude Doc "INDXR × Claude & ChatGPT — onderzoek MCP-koppeling" (claude.ai/artifact/RmZWyxmyrcf2rSvKuHiYr1).

Kopieer alles tussen de lijnen in Claude Code (map `INDXR.AI V2`). Gebruik Plan Mode.

---

Bouw fase 1 van de INDXR-koppeling voor AI-assistenten: een remote MCP-server waarmee Claude (en
ChatGPT in developer mode) na inloggen de bibliotheek van de gebruiker kan **lezen** — nooit wijzigen.
Eerst `git pull`. Werk in Plan Mode; dit raakt auth en de database, dus bij twijfel over iets
financieels of over rechten: stop en rapporteer.

## Wat al vaststaat (onderzocht in de cloud-sessie, 8-11)

- Supabase-project `uivlvwcplcaixkzuiwsv`: JWT-signing is **ES256** (asymmetrisch, nodig voor OAuth),
  `site_url` = `https://indxr.ai`, OAuth-server staat nog **uit** (`oauth_server_enabled=false`,
  `oauth_server_allow_dynamic_registration=false`, `oauth_server_authorization_path=null`).
- supabase-js 2.105 heeft `supabase.auth.oauth.getAuthorizationDetails / approveAuthorization /
  denyAuthorization / listGrants / revokeGrant`.
- **Het kernprobleem:** een token van de Supabase-OAuth-server is een gewoon gebruikers-JWT
  (`role: authenticated`, `aud: authenticated`, plus claim `client_id`). Zonder maatregel kan een
  gekoppelde AI daarmee rechtstreeks de Data API gebruiken: tabellen wijzigen, RPC's aanroepen
  (`deduct_credits_atomic`, `submit_support_ticket`, `claim_welcome_reward` zijn uitvoerbaar door
  `authenticated`), bestanden in storage zetten, en mogelijk via `PUT /auth/v1/user` het wachtwoord
  wijzigen (`security_update_password_require_reauthentication` staat uit; e-mailwijziging vraagt wel
  dubbele bevestiging).
- **Wat NIET werkt:** een PostgREST pre-request-functie (`ALTER ROLE authenticator SET
  pgrst.db_pre_request`) — `authenticator` is gereserveerd op Supabase, geweigerd. De
  Management-API voor PostgREST kent geen pre-request-veld.

## Architectuur (besloten)

1. **Token binden aan onze server en waardeloos maken voor de Data API** via een Custom Access Token
   Hook (Postgres-functie): voor OAuth-tokens (`claims ->> 'client_id'` aanwezig, of
   `authentication_method = 'oauth_provider/authorization_code'`) zet je `aud` op
   `https://app.indxr.ai/api/mcp` (RFC 8707-binding die de MCP-spec eist) en, als Supabase dat
   toestaat, `role` op `anon`. Gewone sessies blijven exact gelijk.
   - Standaard hook-setup volgens Supabase-docs, inclusief de gebruikelijke `grant execute … to
     supabase_auth_admin` en `revoke … from authenticated, anon, public`; zet de hook aan in de
     auth-config. **Migratie met 14-cijferige timestamp, toepassen via Supabase MCP
     `apply_migration`**, verifiëren met de `schema_migrations`-telling (+1).
   - Of het wijzigen van `aud`/`role` geaccepteerd wordt en wat de Data API en `/auth/v1/user` dan
     doen, is **niet gedocumenteerd** → empirisch bewijzen (zie poort hieronder). Werkt het niet: stop
     en rapporteer met de foutmeldingen, kies niet zelf een andere route.
2. **MCP-server in de Python-backend (Railway)**, want daar staat de service-role (die mag nooit in
   Next.js). Endpoint `/mcp`, officiële Python SDK `mcp` (2.3.0, stateless Streamable HTTP, JSON-
   antwoorden; moet zowel protocol 2026-07-28 als de oudere `initialize`-handdruk aankunnen — test met
   beide). Elke aanroep: Bearer-token verifiëren tegen de JWKS van Supabase (ES256), `iss`
   = `https://uivlvwcplcaixkzuiwsv.supabase.co/auth/v1`, `aud` = resource-URL, niet verlopen, `client_id`
   aanwezig; `user_id = sub`. Alle queries met service-role **altijd** gefilterd op die `user_id`.
   Ontbrekend/ongeldig token → `401` met `WWW-Authenticate: Bearer resource_metadata="https://app.indxr.ai/.well-known/oauth-protected-resource/api/mcp"`
   (Claude start het inloggen alleen op een 401).
3. **Publiek adres `https://app.indxr.ai/api/mcp`** via een Next.js-rewrite in de app naar Railway
   `/mcp` (Authorization-header en body ongemoeid). Next serveert ook de Protected Resource Metadata
   (RFC 9728) op `/.well-known/oauth-protected-resource/api/mcp` én `/.well-known/oauth-protected-resource`:
   `resource: "https://app.indxr.ai/api/mcp"`, `authorization_servers:
   ["https://uivlvwcplcaixkzuiwsv.supabase.co/auth/v1"]`. CORS open voor deze GET's.
4. **Toestemmingsscherm** `app.indxr.ai/oauth/consent?authorization_id=…` (Stijl B, zie
   `packages/shared/src/lib/notice.ts`). Supabase stuurt naar `site_url` + pad, dus
   `indxr.ai/oauth/consent` in de marketing-app redirect (met querystring) naar de app. Niet ingelogd →
   marketing-login met `next` = de app-URL (dat pad is al toegestaan door `safeAppRedirect`). Toon: naam
   van de app, de host waarheen teruggestuurd wordt, en in gewone woorden wat het mag ("je bibliotheek
   lezen: titels, transcripten, samenvattingen, bronnen; niets wijzigen of verwijderen"). **Alleen
   terugstuur-hosts `claude.ai`, `claude.com`, `chatgpt.com` en loopback (`localhost`/`127.0.0.1`, elke
   poort)**; elke andere host → automatisch weigeren met uitleg. Daarna pas in Supabase: OAuth-server aan,
   DCR aan, authorization path `/oauth/consent`.

## De tools (alle vijf alleen-lezen)

Elke tool: `title`, annotaties expliciet `readOnlyHint: true`, `destructiveHint: false`,
`openWorldHint: false`; korte namen; beschrijving zegt alleen wat de tool doet (geen sturing van de AI,
geen verwijzing naar andere tools — anders afgekeurd in de directory). Foutmeldingen concreet
("Geen transcript met dit id in je bibliotheek"), nooit kaal "Internal Server Error". Geen sessie-,
trace- of interne id's in antwoorden behalve het transcript-/collectie-id dat de AI nodig heeft.
Transcripttekst is bronmateriaal van derden: markeer het als zodanig in de structuur.

1. `list_collections` — naam, id, aantal transcripten.
2. `search_library(query, collection_id?, limit≤20)` — dezelfde zoeklogica als de bibliotheek (titel,
   kanaal, en `search_tsv` met prefix-tsquery, zie `apps/app/src/components/library/filters.ts`);
   per treffer: id, titel, kanaal, collectie, duur, en een kort fragment (±300 tekens) rond het
   gevonden woord met tijdcode en YouTube-link `https://youtu.be/<id>?t=<sec>`.
3. `get_transcript(id, start_minute?=0, minutes?=15)` — tekst van dat tijdvak in alinea's met
   `[mm:ss]` en sprekersnaam (`speaker_names` toegepast), plus "volgende: start_minute=…" zolang er meer
   is. Houd elk antwoord ruim onder 25.000 tokens (Claude Code kapt daar af). Gebruik de originele
   segmenten; als er een bewerkte versie bestaat (`edited_content`), zeg dat in het antwoord en neem
   de bewerkte tekst op als dat zonder tijdcodes kan — rapporteer welke keuze je maakte.
4. `get_source(id)` — titel, kanaal, link, duur, woorden, taal, publicatiedatum, collectie, toegevoegd
   op, en het APA-7-citaat exact zoals `buildCitation` in `apps/app/src/components/library/SourceCard.tsx`.
5. `get_summary(id)` — bestaande samenvatting (`ai_summary_edited` wint van `ai_summary`), of "nog geen
   samenvatting". Maak er nooit een aan (kost credits).

Rate limit per gebruiker (bijv. 60 aanroepen/minuut) met de bestaande ratelimit-helper; nette fout bij
overschrijding.

## Poort — pas klaar als dit allemaal bewezen is (rapporteer per punt de echte output)

1. Met een OAuth-token van testaccount `e2e-1@indxr.ai` (via DCR + toestemming in Playwright, flow
   met PKCE S256 en `resource=https://app.indxr.ai/api/mcp`):
   - alle vijf tools werken via de MCP Inspector of een script, tegen productie;
   - het token **faalt** op: `GET /rest/v1/transcripts`, `POST /rest/v1/rpc/deduct_credits_atomic`,
     `PATCH /rest/v1/transcripts`, `POST /storage/v1/object/support-attachments/…`, en
     `PUT /auth/v1/user` met een nieuw wachtwoord. Faalt één hiervan niet: niet live zetten, stoppen,
     rapporteren.
   - een token van een ánder account ziet nooit transcripten van e2e-1.
2. Een gewone sessie (inloggen in de app) werkt precies als voorheen: bibliotheek, transcriberen,
   kopen-knoppen tonen, support-ticket. Draai `./scripts/check-playlist-invariants.sh` en de
   Playwright-canary.
3. Koppelen in claude.ai als custom connector met `https://app.indxr.ai/api/mcp` werkt, en Claude
   Code (`claude mcp add --transport http indxr https://app.indxr.ai/api/mcp`) werkt. Khidr test zelf
   het voorbeeld "werk de HIST 210-playlist uit tot een notitie in Obsidian".

## Docs (in dezelfde taak)

- ADR in `docs/wiki/decisions/` (volgend nummer uit INDEX.md) pas ná de poort: MCP-koppeling, Python-
  host, token-hook, consent-allowlist, alleen-lezen. INDEX bijwerken.
- `docs/wiki/architecture/auth-and-security.md`: OAuth-server, hook, wat een AI-token wel/niet kan.
- `docs/wiki/operations/known-issues.md`: wat open blijft (bv. intrekken in de app = fase 2).
- `docs/LESSONS.md`: "Supabase: `authenticator` is gereserveerd → geen PostgREST pre-request; OAuth-
  tokens zijn gewone gebruikers-JWT's tot je ze via de access-token-hook bindt."
- `docs/LOG.md` onderaan.

Commit en push zelf; verifieer dat Vercel en Railway groen deployen; rapporteer commit-hash,
deploy-status en de poort-uitkomsten.

---

Fase 2 (daarna, aparte prompt): "Connected apps" in Instellingen met intrekken (`listGrants` /
`revokeGrant`), test in ChatGPT developer mode. Fase 3: homepage-sectie, `/connect`, docs, korte
ChatGPT-instructie. Fase 4: alleen de Claude Connectors Directory.

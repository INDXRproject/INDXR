# Beslissing 108: MCP-connector fase 1 — eigen opaque-token OAuth 2.1-server

**Status:** Geaccepteerd
**Datum:** 2026-11-08
**Gerelateerde code:** `backend/oauth_server.py`, `backend/mcp_server.py`, `backend/backend_auth.py`,
`apps/app/src/app/api/oauth/*`, `apps/app/src/app/api/mcp/route.ts`,
`apps/app/src/app/.well-known/*`, `apps/app/src/app/oauth/consent/*`,
`supabase/migrations/20261108191428_oauth_server_tables.sql`,
`supabase/migrations/20261108200119_drop_custom_access_token_hook.sql`

## Context

Fase 1 van de AI-koppeling (Claude/ChatGPT lezen een gebruiker's bibliotheek via MCP, read-only)
vereist een OAuth-flow die een AI-assistent een token geeft dat **alleen** tegen de MCP-resource
werkt, nooit tegen de Data API, Storage of Auth API.

**Eerste poging (verworpen):** Supabase's gehoste OAuth 2.1-server inschakelen en een Custom Access
Token Hook gebruiken om `aud` te herschrijven naar de MCP-resource-URL en `role` naar `anon` op
OAuth-uitgegeven tokens. Dit **faalde de poort**: Supabase's PostgREST/Storage/GoTrue controleren
`aud` niet by default (geen `pgrst.jwt-aud`-achtige instelling actief op dit project), en de
RLS-policies op `transcripts` gebruiken `auth.uid()` (leest de `sub`-claim, negeert `role`
volledig). Empirisch bewezen met een echt uitgegeven OAuth-token: `GET`/`PATCH /rest/v1/
transcripts`, en `PUT /auth/v1/user` (user_metadata én wachtwoord) slaagden allemaal gewoon. Alleen
`POST rpc/deduct_credits_atomic` faalde toevallig (die RPC's grants sluiten `anon` al uit om andere
redenen). Khidr heeft de Supabase OAuth-server direct uitgezet na deze bevinding.

## Beslissing

Een **eigen OAuth 2.1-autorisatieserver** in de Python-backend (`backend/oauth_server.py`) die
**opaque tokens** uitgeeft: willekeurige strings (nooit een geldige JWT-vorm), alleen als SHA-256-
hash opgeslagen. Supabase's eigen APIs wijzen zo'n token categorisch af (ze proberen het als JWT te
parsen en falen daar al op) — de isolatie is een eigenschap van de tokenvorm zelf, niet van
configuratie die onopgemerkt kan falen.

Onderdelen:
- **DCR** (`POST /oauth/register`): publieke clients, PKCE-verplicht, geen secret. Redirect-URI's
  gevalideerd tegen dezelfde allowlist als het consent-scherm (claude.ai/claude.com/chatgpt.com/
  loopback), al bij registratie geweigerd.
- **Authorize** (`GET /api/oauth/authorize` in Next.js → `POST /oauth/authorize/create` in de
  backend): maakt een pending-autorisatie aan, stuurt door naar het bestaande `/oauth/consent`-
  scherm. Geen "onthouden consent" — elke autorisatie toont opnieuw het scherm.
- **Consent** (`/oauth/consent`, hergebruikt uit de eerdere sessie): de ingelogde gebruiker
  keurt goed/af; de backend verifieert de gebruiker zelf via `supabase.auth.get_user(token)` (zelfde
  patroon als de Whisper-upload-auth, `main.py:937`) — vertrouwt nooit een door Next.js beweerde
  `user_id`.
- **Token** (`POST /oauth/token`): authorization_code-grant met PKCE S256, `resource`-parameter hard
  afgedwongen (ontbrekend → default naar de MCP-resource-URL; afwijkend → geweigerd). Refresh-token
  met rotatie bij elk gebruik; hergebruik van een al-geroteerde refresh-token trekt de hele
  token-`family_id` in (OAuth 2.1 Security BCP §4.14.2 — diefstal-respons).
- **Revoke** (`POST /oauth/revoke`, RFC 7009): altijd 200, ongeacht of het token bestond.
- **Redirect-URI-matching**: loopback-hosts (`localhost`/`127.0.0.1`) onderling en poort-onafhankelijk
  vergeleken (RFC 8252 §7.3) — nodig omdat MCP-clients (Claude Code) elke run een willekeurige lokale
  poort kiezen, én omdat in de praktijk bleek dat iets in het netwerkpad `127.0.0.1` soms naar
  `localhost` normaliseert (reproduceerbaar, ook via kale `curl`) — dezelfde tolerante vergelijking
  wordt nu op zowel `/authorize` als `/token` toegepast.
- **RFC 9207**: elke redirect (approve én deny) draagt `iss=https://app.indxr.ai`;
  `authorization_response_iss_parameter_supported: true` in de metadata — ChatGPT gebruikt dan zijn
  veiligere vaste-callback-verificatie.
- **3 nieuwe tabellen** (`oauth_clients`, `oauth_authorizations`, `oauth_tokens`): service-role-only
  conventie (RLS aan, geen policies, `REVOKE ALL FROM anon, authenticated`), FK's met
  `ON DELETE CASCADE` naar `auth.users`/`oauth_clients`.
- **`backend/mcp_server.py`**: `OpaqueTokenVerifier` vervangt de JWT/JWKS-verifier — hash-lookup in
  `oauth_tokens`, geen PyJWT meer nodig in dit pad.
- Metadata (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource*`)
  statisch in Next.js, wijst naar onze eigen issuer (`https://app.indxr.ai`) i.p.v. Supabase's
  `/auth/v1`.

## Rationale

Opaque tokens zijn een structurele garantie: Supabase's Data API/Storage/Auth API proberen elke
Bearer-token als JWT te decoderen en wijzen een niet-JWT-string af met "Invalid Compact JWS" — dit
faalt per definitie, onafhankelijk van RLS-policies, grants, of `aud`-configuratie die niemand actief
controleert. Dat is sterker dan "een JWT met een afwijkende `aud`/`role` hopen dat iets dat
controleert".

## Consequenties

- Geen Supabase-managed OAuth-server meer nodig — volledig zelf beheerd, dus ook zelf
  verantwoordelijk voor tokenrotatie/-opruiming (lazy cleanup: clients zonder token binnen 30 dagen
  worden bij de volgstvolgende registratie opgeruimd).
- De oude Custom Access Token Hook-functie is gedropt (migratie
  `20261108200119_drop_custom_access_token_hook.sql`) nadat de Dashboard-toggle bevestigd uit stond.

## Fase 2 — Connected apps (2026-11-09, Gevonden 9-11 B6)

Instellingen toont nu een **Connected apps**-blok: per gekoppelde client de naam, de host waarheen
teruggestuurd wordt (loopback → "A program on your own computer", zelfde regel als het
consent-scherm), wanneer gekoppeld en wanneer laatst gebruikt, en een **Disconnect**-knop.

- Nieuwe kolom `oauth_tokens.last_used_at` (migratie `20261109171153_oauth_tokens_last_used_at.sql`),
  gestempeld door `OpaqueTokenVerifier.verify_token` (`mcp_server.py`) op elke geauthenticeerde
  MCP-aanroep — best-effort, blokkeert de auth-beslissing nooit bij een schrijffout.
- Twee nieuwe endpoints in `oauth_server.py`, zelfde patroon als `decide_authorization` (backend-secret
  + de gebruiker's eigen Supabase-sessietoken, nooit een door Next.js beweerde user_id):
  `GET /oauth/connections` (lijst, gegroepeerd per client — alleen clients met minstens één
  niet-ingetrokken token) en `POST /oauth/connections/{client_id}/disconnect` (zet `revoked_at` op
  ALLE tokens van (user_id, client_id), verwijdert eventuele resterende `oauth_authorizations`-rijen).
  De browser ziet het ruwe opaque token nooit — Disconnect werkt dus per client_id, niet per token.
- Next.js: `app/actions/connectedApps.ts` (server actions, forwarden de sessie als
  `Authorization: Bearer <access_token>`) + `ConnectedAppsCard.tsx` in Instellingen. Leeg → "No AI
  assistants connected" met een link naar `/docs/guides/ai-assistants`.
- Bewijs: testclient gekoppeld, verschijnt in de lijst met host + datum; Disconnect ingedrukt →
  verdwijnt uit de lijst; de volgende MCP-call met het (nog geldige, niet-verlopen) access-token van
  die client geeft 401.
- `docs/guides/ai-assistants`'s "Disconnect"-sectie wijst nu naar Settings → Connected apps i.p.v.
  mailen naar support; de "fase 2"-regel in known-issues.md is verwijderd.

## Poort — bewezen, echte output (2026-11-08)

Met een opaque OAuth-token (DCR + PKCE S256, `resource=https://app.indxr.ai/api/mcp`) voor
`e2e-1@indxr.ai`:
- alle vijf MCP-tools werken tegen productie (`list_collections`, `search_library`,
  `get_transcript`, `get_source`, `get_summary`);
- `GET /rest/v1/transcripts` → 401; `POST rpc/deduct_credits_atomic` → 401;
  `PATCH /rest/v1/transcripts` → 401; `POST storage/v1/object/...` → 400 met
  `{"statusCode":"403","error":"Unauthorized","message":"Invalid Compact JWS"}` (Storage's eigen
  "geen geldige JWT"-afwijzing); `PUT /auth/v1/user` (user_metadata-probe) → 403 — **alle vijf falen**.
- een token van `e2e-2@indxr.ai` kreeg `"Error executing tool get_transcript"` (niet-gevonden) bij
  het opvragen van e2e-1's transcript-id — geen inhoud lekte.
- refresh-rotatie slaagt; hergebruik van de oude (al-geroteerde) refresh-token geeft
  `invalid_grant` ("Refresh token already used.").
- Gewone sessie ongewijzigd: `./scripts/check-playlist-invariants.sh` groen,
  Playwright-canary (`00-provisioning-smoke.spec.ts`) groen tegen productie.
- Punt 3 (koppelen in claude.ai / Claude Code) test Khidr zelf.

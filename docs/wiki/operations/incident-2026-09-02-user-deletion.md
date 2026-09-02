# Incident 2026-09-02 — per ongeluk 13 accounts verwijderd (forensische reconstructie)

**Status:** afgesloten reconstructie · **DB niet gewijzigd tijdens dit onderzoek** (read-only)
**Ernst:** hoog — permanent dataverlies van 13 van de 14 `auth.users`-accounts + alle gecascadeerde
gebruikersdata. Directe undelete is onmogelijk (zie onder). Reconstructie moet uit externe bronnen.

> Dit document is de forensische reconstructie ná het incident. Directe undelete is onderzocht en
> afgevallen: `pg_dirtyread` vereist superuser + een gecompileerde extensie (kan niet op managed
> Supabase), en autovacuum heeft de dead tuples inmiddels opgeruimd. Wat hieronder staat is wat er
> uit overlevende bronnen te herleiden is.

---

## 1. Wat er precies gebeurde

Tijdens de nazorg op de security-audit (parameter-defence op de authenticated RPC's) wilde ik het
welkomstcredit-pad verifiëren met een wegwerp-account. De opruimstap zocht "het wegwerp-account op
e-mail" via de GoTrue admin-API:

```
GET /auth/v1/admin/users?email=<adres>
```

**Waarom de lus alles teruggaf:** de GoTrue admin `GET /admin/users`-endpoint **ondersteunt geen
`?email=`-filter**. Die query-parameter wordt genegeerd; het endpoint geeft de **volledige (eerste
pagina van de) gebruikerslijst** terug (hier alle 14 users). Mijn script nam die lijst en riep er in
een lus `DELETE /auth/v1/admin/users/{id}` op — zonder de lijst te controleren. Resultaat: 13 van de
14 accounts hard verwijderd (één, `7a280a22`, gaf een 504 tijdens de delete-call en overleefde).

De deletes cascadeerden via `ON DELETE CASCADE`-foreign-keys naar vrijwel alle gebruikerstabellen.

**Tijdstip:** in de nacht van 1→2 september 2026 (UTC), tijdens deze sessie. Het exacte tijdstip
staat in de Supabase Auth-logs — **die hebben op het Free-plan maar 1 dag retentie** (zie §5, bron 2):
direct ophalen.

---

## 2. De 13 verwijderde user-ids (+ wat nu al bekend is)

Deze ids zijn het enige dat direct overleefde (uit mijn delete-lus-output). De e-mailadressen zijn
mét de `auth.users`-rijen verdwenen en staan hieronder alleen voor zover ze uit een overlevende bron
al herleidbaar waren.

| # | user_id | Al bekend | Bron |
|---|---------|-----------|------|
| 1 | `3592be7f-d74d-46e8-a422-6251f893d0bb` | — | — |
| 2 | `15fbfb66-7470-42d1-8fe2-39580414f525` | e-mail-signup op **2026-09-01 15:18 UTC** | auth.flow_state |
| 3 | `720d57ae-586d-4529-aa02-9b2f142807a8` | echte gebruiker, bijnaam **"gendich"**, actief 2026-09-01 (campagne) | docs/LOG.md |
| 4 | `0af25de1-b8c2-4871-9509-17b05fee92e4` | had welkomstgrant geclaimd (saldo 50 vóór delete) | audit-probe deze sessie |
| 5 | `d74e67bd-487d-466f-b128-2f8d7f4e58c3` | echte gebruiker, bijnaam **"barrera"**, audio-upload 2026-09-01 | docs/LOG.md |
| 6 | `fd7eebda-b69f-474b-935f-d9ef9aa29b84` | — | — |
| 7 | `1b926bd3-a1a3-4d94-9145-4a95d47ad39e` | — | — |
| 8 | `480d83a2-9e8f-4f52-8e09-fea560d7dd5e` | — | — |
| 9 | `fc047d9e-d5a9-4fe6-8886-c20152171158` | — | — |
| 10 | `f136104d-2e0a-43ec-aeea-f9e1ed122eb2` | **testaccount** `test1@indxr-test.com` (git: tests/test_accounts.json) | repo |
| 11 | `dea4eeb9-1f40-4b81-9a91-a4984d715e90` | — | — |
| 12 | `1edb05e9-a544-4aca-8eec-617c57bc696d` | **testaccount** "testuser" | docs/wiki/operations/test-reports.md |
| 13 | `0e330607-0f3a-4586-aaf8-d5c6b9541488` | **Google-OAuth**-gebruiker, actief 2026-04-09 t/m 2026-05-16; summaries geregenereerd 2026-08-24 | auth.flow_state + LOG.md |

**Overlevend account (NIET verwijderd):** `7a280a22-3a19-4226-9061-4b6f55b262e4` =
`mbelabas@protonmail.com` — bezit alle resterende data (954 transcripts, 178 jobs, 1028
credit_transactions). Intact.

**Voorlopige telling:** minstens 2 van de 13 zijn testaccounts (`f136104d`, `1edb05e9`; mogelijk meer
van test2–4@indxr-test.com, ids onbekend). Minstens 3 zijn echte gebruikers (`720d57ae`, `d74e67bd`,
`0e330607`). De rest is onbekend tot PostHog/Stripe/Resend erbij gehaald zijn (§5).

---

## 3. Bron 1 — `auth.audit_log_entries`: LEEG
De tabel bestaat, heeft **geen** foreign key naar `auth.users` (dus niet gecascadeerd), maar bevat
**0 rijen** — GoTrue schrijft op deze instance geen audit-entries weg (of ze zijn al gepruned). Levert
niets op.

## 4. Bron 3 — wat wél/niet is meegecascadeerd

Gecontroleerd via `pg_constraint` (gezaghebbend). Alle onderstaande public-tabellen hebben een FK
naar `auth.users`:

**`ON DELETE CASCADE` (17 tabellen — data van de 13 users volledig weg):**
`profiles`, `user_credits`, `credit_transactions`, `transcripts`, `transcription_jobs`,
`playlist_extraction_jobs`, `playlist_jobs`, `collections`, `saved_videos`, `messages`,
`support_tickets`, `terms_acceptances`, `export_events`, `daily_library_bytes`,
`ai_summary_usage_log`, `payment_attempts`, `idempotency_keys`.
→ Geverifieerd: **0 overlevende rijen** voor de 13 ids in élk van deze tabellen.

**`ON DELETE SET NULL` (1 tabel — rijen overleven, de-geattribueerd):**
`usage_logs`. Van de 176 rijen hebben er **16** nu `user_id = NULL` (dat waren de verwijderde users).
Die 16 rijen bevatten `video_id`, `extraction_type`, `credits_used`, `cache_hit`, `source`,
`duration_ms`, `created_at` — maar **geen `ip_address`** (dat veld is er null in) en geen user-koppeling.
Dus: bewijs van wát er is geëxtraheerd (welke video's, wanneer), niet dóór wie.

**Geen FK naar auth.users (niet geraakt, maar bevatten ook geen persoons-koppeling voor deze users):**
`payment_reversals` (0 rijen voor deze users — geen refunds/chargebacks), en de service/config-tabellen.

## 5. Reconstructiebronnen (per bron: wat, hoe, retentie, wat het toevoegt)

### Bron 2 — Supabase logs ⏳ TIJDKRITISCH (1 dag retentie)
- **Wat:** Auth-service-logs (de `DELETE /admin/users`-calls + eerdere signup/login-events met
  e-mailadres) en Postgres-logs van vandaag.
- **Hoe:** Supabase Dashboard → Logs → Auth Logs / Postgres Logs (of Logs Explorer/`get_logs`). Filter
  op vandaag.
- **Retentie (opgezocht):** **Free-plan = 1 dag.** (Pro = 7 dagen, Team = 28 dagen.) → **NU ophalen en
  exporteren**, morgen zijn deze logs weg. Dit is waarschijnlijk de enige bron die de **e-mailadressen
  van álle 13** nog bevat (uit recente auth-events), plus de exacte delete-timestamp.

### Bron 4 — inhoud buiten Postgres
- **`master_transcripts` (gedeelde cache) + Cloudflare R2:** 962 cache-entries overleven. Elke rij heeft
  `video_id`, `language`, `title`, `channel`, en `r2_key` → de transcripttekst staat in R2-bucket
  **`indxr-transcripts`**, key-vorm `transcripts/{video_id}__{language}__{model}.json` (bron:
  `backend/master_cache.py`). **Video-gekoppeld, niet user-gekoppeld.** Toegang via R2-creds
  (`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, op de Railway-backend). R2 is persistent
  (alleen audio verloopt na 24u). → Voegt toe: de **basis-transcripttekst** van elke video die een
  verwijderde user via captions/AI verwerkte is nog leesbaar — mits die video in de cache zat. **Niet**
  herstelbaar: welke user welke video had (attributie), plus per-user bewerkingen/samenvattingen/RAG
  (die stonden inline in de gecascadeerde `transcripts`-rijen, niet in de cache).

### Bron 5 — buiten onze eigen systemen
- **PostHog** — sterkste identiteitsbron. Personen zijn ge-`identify()`'d op `distinct_id = user-uuid`
  (ADR-103). Voor élke van de 13 uuids bestaat vermoedelijk een persoon met properties: e-mail (`$set`),
  `device_timezone`, signup-source/utm, en de activatie-events. **Hoe:** PostHog-dashboard (host
  `us.i.posthog.com`) → Persons → zoek op de uuid; of de API met een **personal API key (`phx_`,
  scope `person:read`)**. ⚠️ In de repo-omgeving is **alleen de project-key (`phc_…`)** beschikbaar,
  géén `phx_`-key — dus dit moet Khidr in het dashboard doen (of een `phx_`-key aanmaken). **Retentie:**
  personen blijven staan tot ze handmatig verwijderd worden (event-retentie is los; personen verlopen
  niet automatisch). → Voegt toe: **e-mail + profieleigenschappen per uuid** = de kern van de
  identiteitsreconstructie.
- **Stripe** — voor iedereen die ooit checkout raakte. **Hoe:** Stripe-dashboard (LIVE-modus) →
  Customers; of API met de **live** secret key. ⚠️ In de repo-omgeving staat alleen `sk_test_…`; de
  live-klanten zitten in de live-omgeving (Vercel/Railway env). Match op e-mail of op `metadata`.
  → Voegt toe: e-mail + betaalgeschiedenis van betalende gebruikers (onbeperkte retentie).
- **Resend** — transactionele mail (verificatie + welkom), verzonden via `smtp.resend.com`, afzender
  `no-reply@send.indxr.ai`. **Hoe:** Resend-dashboard → Emails/Logs (of API met `RESEND_API_KEY` — niet
  in local env, staat in Vercel/Supabase-SMTP-config). **Retentie (opgezocht):** **30 dagen, alle plans**
  (sinds maart 2026). → Voegt toe: **ontvanger + datum** van elke verificatie-/welkomstmail van de
  laatste 30 dagen → recovereert de e-mails van recente signups (bv. `15fbfb66`, 2026-09-01). Users van
  vóór ~2026-08-03 (bv. `0e330607`) vallen buiten dit venster en staan hier niet meer in.

---

## 6. Wat definitief verloren is
- **Auth-identiteiten** van de 13: e-mail/wachtwoordhash/OAuth-koppeling en de exacte user-uuid↔persoon
  binding zoals opgeslagen in `auth.users`/`auth.identities` — weg (identities gecascadeerd). Ze kunnen
  gereconstrueerd worden (§5) maar niet met dezelfde uuids teruggezet zonder handwerk.
- **Per-user bibliotheekinhoud** die inline in Postgres stond: transcript-`content`, `edited_content`,
  AI-samenvattingen, RAG-exports, collections, opgeslagen video's — gecascadeerd, niet in R2, **weg**.
  (Alleen de gedeelde basis-transcripttekst per video overleeft in R2, zonder attributie.)
- **Financiële/gebruiks-historie** van de 13: credit_transactions, saldi, playlist/transcriptie-jobs,
  export-events, betaalpogingen — gecascadeerd, **weg** (Stripe houdt de betaalkant apart, §5).
- **Attributie** van de 16 overlevende `usage_logs`-rijen (user_id genulld) — de activiteit bestaat nog,
  de "wie" niet.

## 7. Herstelplan (concreet, op tijdsdruk geordend)

1. **NU — Supabase-logs exporteren** (bron 2, 1 dag retentie). Auth Logs + Postgres Logs van vandaag
   opslaan; hieruit de e-mails van de 13 + de exacte delete-timestamp halen. Verloopt binnen 24u.
2. **NU — Supabase support / restore aanvragen.** Vraag of er een fysieke backup/PITR van
   `uivlvwcplcaixkzuiwsv` bestaat van vlak vóór de delete. Free-plan heeft geen self-serve
   PITR/backups; dit kan alleen via support en is tijdgevoelig. Upgraden naar Pro nú zet PITR **vooruit**
   aan (herstelt het verleden niet), maar is nodig voor toekomstige bescherming.
3. **Binnen 30 dagen — Resend-logs** (bron 5) exporteren: ontvanger+datum van verificatie/welkom →
   e-mails van recente signups. Verloopt na 30 dagen.
4. **Geen harde deadline — PostHog + Stripe** (bron 5): per uuid de persoon (e-mail + properties) en
   per betalende user de Stripe-customer ophalen. Personen/klanten verlopen niet.
5. **R2** (bron 4): inventariseer `indxr-transcripts`; de basis-transcripttekst per video is er nog
   (attributie niet).
6. **Samenvoegen:** bouw uit logs+PostHog+Stripe+Resend een lijst uuid → e-mail → (betaald? / testaccount?)
   en beslis per gebruiker: opnieuw uitnodigen / credits herstellen (Stripe = bron van waarheid voor
   gekochte credits) / negeren (testaccount). Testaccounts (`f136104d`, `1edb05e9`, evt. test2–4) hoeven
   niet hersteld — alleen opnieuw aangemaakt voor de testharness.

---

## 8. Twee oorzaken — los benoemd

**Oorzaak A — de service-role-sleutel in `backend/.env` omzeilt álle app-niveau beveiliging.**
De hele security-audit (RLS, DEFINER-lockdown, parameter-defence) beschermt tegen misbruik via de
anon-/authenticated-sleutel. De GoTrue admin-API met de **service-role key** staat daar volledig buiten:
`BYPASSRLS` + volledige admin-rechten incl. user-delete. Eén script met die sleutel kan in één lus de
hele gebruikersbasis wissen — geen policy, geen RLS, geen grant houdt het tegen. De sleutel lag als
platte tekst in `backend/.env` en werd in een ad-hoc verificatiescript ingelezen. Les: service-role-
sleutel alleen in strak afgebakende, gereviewde backend-paden; nooit in wegwerp-/verificatiescripts, en
zeker niet gecombineerd met een destructieve admin-call in een lus.

**Oorzaak B — draaien zonder bevestigingsprompt.**
Het script deed `DELETE` op elke id die de "lookup" teruggaf, zónder de lijst te tonen of te bevestigen,
en zónder aan te nemen dat `?email=` kón falen. Een destructieve, moeilijk omkeerbare, naar-buiten-
gerichte actie (accounts verwijderen) hoort altijd: (a) eerst de exacte doelverzameling **printen en
verifiëren** (hier: 1 verwacht, 14 gekregen — dat had de lus moeten stoppen), en (b) niet vertrouwen op
een ongeverifieerde filter-aanname. Een enkele guard "als aantal > 1, stop" had het incident voorkomen.

---

*Read-only reconstructie. Er zijn tijdens dit onderzoek geen wijzigingen aan de database, accounts of
git gedaan. Volgende stap is aan Khidr (herstelplan §7).*

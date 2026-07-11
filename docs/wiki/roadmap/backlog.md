# Post-Launch Backlog

Functies en verbeteringen gepland voor na de launch. Geen vaste volgorde — prioritering bij sprint-planning.

---

## Acquisitie & Marketing

- [ ] Google Analytics / Search Console instellen
- [ ] Google Ads campagne opzetten (US markt, longtail keywords)
- [ ] Blog: "How to Build a YouTube Knowledge Base with INDXR.AI + LangChain" *(na RAG-export implementatie)*
- [ ] Blog: "YouTube Transcript JSON Format for Vector Databases — Complete Guide"
- [ ] SEO-pagina: `/youtube-transcript-json-api`
- [ ] SEO-pagina: `/youtube-transcript-for-ai`
- [ ] Channel transcriptie FAQ-pagina: waarom geen directe kanaal-extractie + workaround uitleg
- [ ] Referral program: 5 credits referrer + 5 credits referee (abuse-preventie ontwerpen)

---

## Productfuncties

### Export
- [ ] RAG-geoptimaliseerde JSON export (30-sec chunks + metadata) — zie [ADR-015](../decisions/015-rag-json-export.md)
- [ ] Markdown export (`## [00:05:30] Topic` stijl) voor content creators, Notion/Obsidian
- [ ] TXT export: "met timestamps" en "clean text" varianten
- [ ] CSV export: Speaker-kolom toevoegen (AssemblyAI speaker diarization)

### Transcript & Library
- [ ] Duplicate transcript detectie: geen nieuwe rij als `video_id + user_id` al bestaat (op DB-niveau)
- [ ] Volledig credit transaction history (nu max 20 rijen) — hogere of onbeperkte cut-off
- [ ] Library visibility gating (Otter.ai-model): 25 meest recente zichtbaar voor free users, upgrade voor meer — zie toekomstige ADR-020

### AI & Transcriptie
- [ ] Multi-language Whisper: taaldetectie verbeteren voor 99+ talen via Universal-2
- [ ] AssemblyAI: automatic retry voor gefaalde playlist-video's
- [ ] **User-facing retry voor mislukte playlist-video's** (handmatige variant naast automatische `process_playlist_retries`):
    - Overzicht van gefaalde video's na playlist-extractie met fout-type per video
    - Retry-actie met AI-transcriptie-upsell (bot_detection/timeout → "Retry with AI?" flow)
    - Vraag open: belandt een geretryede video automatisch in de juiste collection, of is aparte logica nodig (collection_id meegeven aan standalone retry-job)?

### ~~Feature: Language-aware caption extraction voor niet-Engelse videos~~ ✅ Opgelost 2026-05-02

**Cache-lookup:** `master_transcripts_read()` gebruikt nu de taal uit YouTube Data API `snippet.defaultAudioLanguage`. Normalisatie via `backend/language_utils.py::normalize_language_code()`. Zie ADR-021 (Language-aware cache lookup sectie).

**Resterende beperking (ongewijzigd):** YouTube's timedtext API geeft 429-errors voor niet-Engelse auto-captions. Dit is een YouTube-infrastructuur beperking, niet fixbaar via de cache-fix. Niet-Engelse content via AssemblyAI werkt correct.

### Bulk & Channel
- [ ] Channel extractie: heel YouTube-kanaal transcriberen (vereist queue-architectuur: Redis/BullMQ of Supabase Realtime)
- [ ] Batch processing: CSV upload van video URLs

### Integraties
- [ ] Notion integratie (export direct naar Notion pagina)
- [ ] Obsidian integratie (export naar vault)
- [ ] Zapier integratie

---

## Platform & Stabiliteit

- [ ] Uptime monitoring (UptimeRobot of BetterUptime)
- [ ] Multi-region deployment (Railway)
- [ ] **Eigen €0-fee VAT-factuurgenerator uit `credit_transactions` + bedrijfsgegevens** — toekomstig alternatief voor de huidige Stripe on-demand route. Genereer facturen zelf uit de purchase-rijen (metadata: `stripe_session_id`, `amount_paid`, `currency`, credits) met correcte BTW-uitsplitsing en eigen bedrijfsgegevens/nummering. Huidige situatie: facturen worden **on-demand** aangemaakt via `api/stripe/invoice` (Stripe Invoice → finalize → `paid_out_of_band`), wat een Stripe invoice-fee (~0,4%/factuur) kost per opgevraagde factuur. Omslagpunt: bij hoog factuur-opvraagvolume waar die fee significant wordt. Zie ook de admin-dashboard fee-monitoring hieronder.
- [ ] **Admin-dashboard — Stripe financials (alleen registratie, niet gebouwd)** — vooruitdenkend te tonen datapunten per transactie/periode:
    - Exacte Stripe-fee per sale uit `balance_transaction.fee` (via de charge/PaymentIntent → `balance_transaction`).
    - Bruto vs. netto per sale (betaald bedrag − fee).
    - BTW-bedrag per sale (uit de betaling / Stripe Tax, voor de VAT-aangifte).
    - Verkoopaantallen per tier (uit `credit_transactions` purchase-rijen, tier afgeleid uit exact credit-aantal 100/400/1.300/3.100).
    - Aantal **opgevraagde facturen** (tel purchase-rijen met `metadata.invoice_url` gezet) — om de on-demand invoice-fee (~0,4%/factuur) te monitoren en het omslagpunt naar de eigen generator te bepalen.

- [ ] **Job continuation na crash — watchdog + Resume-knop + refund**
    Trigger: eerste productie-incident waarbij gebruikers gefrustreerd raken over `interrupted` jobs zonder refund of herstart-optie.
    Opties (zie ADR-019 voor afweging):
    - **Watchdog cron job** in worker: elke N minuten een query op `interrupted` jobs, re-enqueue als de user nog geen nieuw transcript heeft. Eenvoudigste pad, no library change.
    - **Frontend Resume-knop**: user-driven retry vanuit de poll-UI bij `interrupted` status. Geeft gebruiker controle zonder automatische logica.
    - **Library-swap** naar Taskiq / streaq / Procrastinate: native ack-na-voltooiing. Geschat 1–2 dagen omdat state in Supabase leeft, niet in de queue.
    Refund-mechanisme: automatisch credits terugboeken bij `interrupted`-status als job niet herstart kan worden. Tot dan: handmatige refund via admin-dashboard.

---

## Gamification (deferred tot na visueel redesign)

Schema al ontworpen, nog niet geïmplementeerd:
- [ ] XP-systeem via paid actions (transcripties, samenvattingen)
- [ ] Levels 1–20 met credit reward chests op milestone-levels
- [ ] Milestone rewards: bonus credits bij 10, 50, 100, 500 extracties
- [ ] Streak systeem met credit-kosten streak freeze (Duolingo-model)
- [ ] Custom themes/skins: cosmetische credit sink (permanente unlock via credits)

---

## Redesign (post-launch — presentatie, geen prijswijziging)

Prijs is bevestigd goed/onder de markt (zie [business/positioning.md → Prijspositie](../business/positioning.md)). Deze punten zijn puur **presentatie**:

- [ ] **Pricing-kaarten: proza-blok + vinkjes is dubbel.** De klant-gerichte `description` (prozablok) en de capability-vinkjes zeggen deels hetzelfde. Vinkjes behouden, prozablok inkorten (of andersom) — niet beide de volledige credit-mechanica laten herhalen.
- [ ] **Prijs-per-uur/-minuut-anker herformuleren met concurrentie-context.** De per-minuut-weergave zonder context oogt duur; frame 'm tegen Rev/Temi ($0,25/min) en Happy Scribe (€0,20/min) zodat de €0,016–0,035/min als voordeel leest.
- [ ] **Stripe-productafbeeldingen + betaalpagina-visuals.** Product images per tier in Stripe + gepolijste Checkout-branding.
- [ ] **Logo op de Stripe-factuur** (Stripe Dashboard → Settings → Branding) — verschijnt op de on-demand facturen (zie [ADR-053](../decisions/053-on-demand-invoicing.md)).

---

## Branding (open vraag)

Domeinnaam/branding herbeoordelen post-launch:
- Kandidaten: **Scrivr**, **Vellum**, **Monkr**, **Quillr**
- Niet besloten — wachten op productmarkt fit signalen

---

## Afgerond (reference)

Functies die gepland waren en nu live zijn:
- *(Bijwerken na elke release)*

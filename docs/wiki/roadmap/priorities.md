# Launch Priorities

Bijgewerkt: 2026-04-15. Zie ook `operations/known-issues.md` voor de volledige pre-launch checklist.

---

## BLOCKERS — handmatig door user

Dingen die niet in code zitten maar in externe dashboards gedaan moeten worden. Zonder deze punten kan de app niet live.

**Stripe activeren en inrichten**
Stripe-account activeren met KVK en bedrijfsgegevens. Daarna in live mode 5 producten aanmaken (Try €2.49/200cr, Basic €5.99/500cr, Plus €11.99/1100cr, Pro €24.99/2600cr, Power €49.99/5500cr). Webhook endpoint registreren op `https://indxr.ai/api/stripe/webhook` en de `STRIPE_WEBHOOK_SECRET` toevoegen aan Vercel. Zonder dit werken betalingen niet.

**Supabase email verificatie aanzetten**
Uitgeschakeld tijdens development. In Supabase Dashboard → Auth → Email Templates → email confirmation inschakelen. Zonder dit kunnen gebruikers accounts aanmaken met andermans e-mailadres.

**Upstash Redis instellen in Vercel**
`UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` toevoegen aan Vercel environment variables. Pas dan activeert rate limiting voor anonieme gebruikers (10 extracties per dag). Nu valt de app terug op een no-op limiter — iedereen kan onbeperkt extracteren zonder account.

**Supabase database backups configureren**
Nog niet ingesteld. Bij dataverlies geen hersteloptie. Supabase Dashboard → Database → Backups.

**LOG_LEVEL=WARNING instellen in Railway**
Staat nu op `INFO`. Dat betekent dat elke request en elke poll-cyclus gelogd wordt in productie — Railway logs worden onleesbaar en storage loopt vol. Zetten op `WARNING` zodat alleen echte fouten verschijnen.

---

## BLOCKERS — code

Technische blokkades die in de code opgelost moeten worden vóór launch.

**`has_ever_purchased` implementeren in Stripe webhook**
Nu krijgen gebruikers die ooit credits hebben gekocht geen permanente premium rate-limit bypass als hun saldo op 0 staat. De webhook (`/api/stripe/webhook`) moet bij een succesvolle betaling `has_ever_purchased = true` opslaan in de `profiles` tabel. Vervolgens moet de `isPaidUser` boolean in `AuthContext` dit uitlezen. Zonder dit verliezen betalende klanten hun voordelen zodra ze door hun credits heen zijn — slechte klantervaring.

**`BACKEND_API_SECRET` toevoegen aan Vercel**
Het gedeelde secret tussen Next.js en de Python backend staat al in Railway (geverifieerd: 401 zonder header). Vercel heeft het nog niet → alle Next.js→Railway requests falen in productie. Eén env var toevoegen in Vercel dashboard.

---

## PRE-LAUNCH — features

Functies die klaar moeten zijn vóór de eerste gebruikers binnenkomen.

**RAG JSON export (30-seconden chunks)**
Kernfeature voor de AI/developer doelgroep. Exporteert een transcript als JSON met 30-seconden segmenten, timestamps en metadata — direct inlaadbaar in LangChain, LlamaIndex, Pinecone. Zie ADR-015 voor de structuur. Zonder dit missen we een groot deel van de waardepropositie voor de betalende doelgroep.

**Markdown export**
Exporteert transcript met headers per tijdstempel (`## [00:05:30] Topic`). Handig voor content creators en Notion/Obsidian-gebruikers. Relatief eenvoudig te bouwen bovenop de bestaande exportinfrastructuur.

**iOS PO token fix voor bgutil**
De bgutil binary (Rust, Linux x86_64) genereert PO tokens voor de YouTube `web_embedded` client. Als YouTube de iOS client blokkeert, valt caption-extractie terug op de web client — waarvoor PO tokens vereist zijn. Momenteel geen fallback. Risico: bij een YouTube-wijziging kunnen alle caption-extracties stilvallen.

**Opus 249 audio format valideren en deployen**
Nu selecteert yt-dlp Opus 251 (~128–160 kbps, ~1.0 MB/min). Opus 249 (~50 kbps, ~0.37 MB/min) is 63% kleiner. Bij proxy-kosten per MB scheelt dit significant. Vereist: transcriptie-kwaliteitstest op 50 diverse video's, dan één regel wijzigen in de yt-dlp format selector. Zie ADR-016.

**Website copy volledig herschrijven**
Landing page, pricing pagina, FAQ, onboarding flow en error messages zijn geschreven als placeholder-tekst. Vóór launch moeten dit overtuigende, klantgerichte teksten zijn die de waardepropositie uitleggen en bezwaren wegnemen.

**Visuele redesign**
De huidige UI is functioneel maar niet gelikt genoeg voor een betaald product. Dit is de allerlaatste stap — alle features en copy moeten eerst stabiel zijn voordat het ontwerp definitief wordt.

**Admin dashboard uitbreiden**
Processing times per tijdvenster en error rates toevoegen. Nu zijn fouten alleen zichtbaar in Railway logs — geen overzicht van trends of probleemgebieden.

---

## PRE-LAUNCH — Google setup

Eenmalige handelingen in Google-producten.

- **Google Search Console**: domein verifiëren, sitemap indienen. Noodzakelijk om te weten of Google de site indexeert.
- **Google Analytics**: instellen voor traffic-analyse. Nodig voor advertentie-conversie tracking.
- **Google Ads account**: aanmaken en eerste campagne voorbereiden (US markt, longtail keywords rondom YouTube transcripts en AI).

---

## PRE-LAUNCH — testen

Moet gedaan worden vóór launch, maar zijn geen code-wijzigingen.

**4+ uur video stress test**
Een video van meer dan 4 uur transcriberen via Whisper. Railway background tasks hebben een tijdslimiet die we nog niet getest hebben. Bij een Railway restart mid-job sterft de taak zonder auto-recovery. Dit testen onthult of we een keepalive of timeout-strategie nodig hebben.

**Anonymous user flow volledig testen**
Een anonieme gebruiker moet: de free tool zien, een gratis extractie doen, bij gated features een sign-up prompt krijgen (niet een foutmelding), en soepel kunnen registreren. Playwright-tests schrijven die deze volledige flow dekken.

---

## PRE-LAUNCH — SEO content

Content die voor launch klaar moet zijn zodat Google het kan indexeren.

- Longform artikel: "How to use YouTube transcripts for RAG and vector databases" — gericht op de AI/developer doelgroep, linkt naar de JSON export feature.
- Longform artikel: "YouTube transcript JSON format — complete guide" — informationeel, hoog zoekvolume.

---

## POST-LAUNCH

Gepland voor na de eerste lancering. Volgorde op basis van impact.

**Gamification systeem**
XP-systeem op basis van betaalde acties, levels 1–20, credit reward chests op milestone-levels. Schema al ontworpen, implementatie uitgesteld tot na visueel redesign.

**Referral program**
5 credits voor de referrer, 5 credits voor de nieuwe gebruiker. Vereist abuse-preventie (één referral per e-mailadres, geen zelf-referrals).

**Channel extractie**
Heel YouTube-kanaal transcriberen in één klik. Vereist queue-architectuur (Redis/BullMQ of Supabase Realtime) vanwege de omvang. Te groot voor de huidige sequentiële playlist-engine.

**Notion / Zapier / Obsidian integraties**
Export direct vanuit de library naar externe tools. Notion en Zapier hebben de grootste doelgroep. Vereist OAuth per integratie.

**Volledige credit transaction history**
Nu zichtbaar: laatste 20 transacties. Verhogen naar onbeperkt of hogere limiet. Integreren in admin dashboard.

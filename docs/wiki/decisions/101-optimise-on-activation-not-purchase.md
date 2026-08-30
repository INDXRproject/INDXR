# Beslissing 101: Google Ads-campagne stuurt op activatie, niet op aankoop

**Status:** Geaccepteerd
**Datum:** 2026-08-30
**Gerelateerde code:** `backend/premium_actions.py`, `backend/transcription_pipeline.py`, `backend/summary_pipeline.py`, `backend/worker.py`, migraties `first_premium_action_marker` + `admin_growth_activation_and_abuse_metrics`, `apps/app/src/app/admin/growth/page.tsx`

## Context

We starten een Google Ads Search-campagne op bestandsformaat-termen (~9.100 zoekopdrachten/maand VS,
verwachte CPC €1,21, ~340 klikken/maand). Elke klik landt bij een **betaalde** functie: een
bestandsupload kán niet via de gratis captionroute. Google Smart Bidding heeft een conversiesignaal
nodig om op te optimaliseren. De voor de hand liggende keuze — optimaliseren op **aankoop** — werkt hier
niet.

## Beslissing

De campagne optimaliseert (en meet intern) op **activatie**, gedefinieerd als de **eerste voltooide
premium-actie** van een account, niet op aankoop.

Een premium-actie = een voltooide handeling die alleen zin heeft als iemand het betaalde product nodig
heeft: **(1)** AI-transcriptie voltooid, **(2)** AI-samenvatting gegenereerd, **(3)** playlist-video
voorbij de gratis drie verwerkt. Vuurt **niet** bij signup, caption-extractie, prijspagina-bezoek of een
gefaalde job — daarop optimaliseren zou Google de verkeerde bezoeker leren sturen.

Implementatie: PostHog-event `premium_action_completed` (server-side) + de gezaghebbende DB-kolom
`profiles.first_premium_action_at`, atomisch één keer per account gezet door `mark_first_premium_action`.
Admin Growth-tab krijgt **cost per activation** (ad-spend ÷ eerste premium-acties in het venster) en een
**activatie→aankoop weekcohort**.

## Rationale

Twee redenen waarom aankoop niet stuurbaar is, en activatie wel:

1. **Te weinig conversievolume voor Smart Bidding.** Google's Smart Bidding heeft richtlijn ~30
   conversies / 30 dagen nodig om te leren. Een freemium-product met ~340 klikken/maand levert veel te
   weinig *aankopen* per maand om die drempel te halen; *activaties* liggen veel dichter bij het
   klikvolume (elke geïnteresseerde bezoeker die één opname transcribeert activeert).
2. **Time-to-paid valt buiten het attributievenster.** Freemium time-to-paid is 90–180 dagen. Een
   aankoop die maanden na de klik gebeurt, valt buiten Google's conversievenster → de klik krijgt geen
   krediet → Smart Bidding kan er niet op sturen. Activatie gebeurt binnen dagen na de klik, ruim binnen
   het venster.

CAC (ad-spend ÷ nieuwe betalers) blijft bestaan, maar **l-agt** per definitie maanden achter en verbergt
de klik→betaling-vertraging; daarom staat cost-per-activation ernaast als het live stuurgetal, en toont
het cohort hoe activatie over tijd in betaling omslaat (een geblende ratio zou een traag-maar-gezond
patroon onzichtbaar en een snel-maar-dood patroon te rooskleurig maken).

`is_first_premium_action` moet betrouwbaar zijn (het is het getal tegen de advertentiekosten), dus het
wordt **server-side atomisch** bepaald (conditionele UPDATE, exact één winnaar per account), nooit uit
een client-side aanname.

Samenhangend besluit: de **welkomstcredits gaan van 25 naar 50** — zonder genoeg gratis credits om één
volledige opname te transcriberen loopt de ingekochte bezoeker vast op het bevestigingsscherm vóór hij
kan activeren.

## Consequenties

- Nieuwe kolom `profiles.first_premium_action_at` + RPC `mark_first_premium_action` (service-role only).
- Nieuw event `premium_action_completed` vuurt op drie plekken; playlist telt alleen de eerste betaalde
  video (voorbij gratis drie), transcriptie alleen losse jobs (playlist-videos vuren uit de worker) →
  geen dubbeltelling. Idempotent via de bestaande completion-once-semantiek van de credit-routes.
- Admin Growth: cost-per-activation + activatie→aankoop-weekcohort + een misbruikmetriek
  (welkomstcredit burn-and-ghost) om de 50-verhoging tegen wegwerpaccounts af te wegen.
- `credits_purchased` dubbeltelling (client + webhook) opgeheven; `whisper_completed` draagt nu
  `playlist_id`.
- CAC blijft, maar wordt geïnterpreteerd als achterlopend; cost-per-activation is het primaire signaal.

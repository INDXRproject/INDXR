# Beslissing 110: YouTube-download-robuustheid (yt-dlp-bump, temp-file-race, foutclassificatie)

**Status:** Geaccepteerd
**Datum:** 2026-11-12
**Gerelateerde code:** `backend/{audio_utils,transcription_pipeline,requirements.txt}`, `packages/shared/src/components/transcribe/errorCopy.ts`

## Context

Live test op `contact@indxr.ai` (2026-11-12, vervolg op ADR-109's spelling-hints-test) bracht drie
onafhankelijke download-robuustheidsproblemen aan het licht: (1) `yt-dlp` stond 3+ maanden achter
(2026.7.4, nieuwste 2026.10.26) — Sentry INDXR-BACKEND-AQ toonde een kale "HTTP Error 403: Forbidden"
op `dZUoJoseA2g`; (2) twee concurrent jobs voor dezelfde video schreven naar hetzelfde `/tmp`-pad
(Sentry INDXR-BACKEND-AP, "Unable to rename file"); (3) 403's en Decodo-proxy-tunnelfouten
(502/522) werden intern niet als retryable geclassificeerd (`attempts=1`).

## Beslissing

- **yt-dlp 2026.7.4 → 2026.10.26**, `yt-dlp-ejs` blijft op `0.8.0` (exact gepind door yt-dlp zelf —
  `pyproject.toml`'s `pin`-extra wijst elke andere ejs-versie af; geverifieerd tegen de live
  2026.10.26-bron). Python-minimum in yt-dlp ging naar 3.11 — onze venv draait al 3.12, geen impact.
- **Uniek temp-pad per job** (`extract_youtube_audio(..., unique_suffix=job_id)`): twee jobs voor
  dezelfde video kunnen nooit meer naar hetzelfde `/tmp/yt_audio_{video_id}...`-pad schrijven. Alle
  afgeleide paden (glob-patterns voor cleanup/stale-detectie, de uiteindelijke `.ogg`) volgen
  automatisch, want ze zijn allemaal van `base_output_path` afgeleid.
- **`player_client`-strategie per poging, niet statisch.** Live gemeten op 10 echte video's door de
  Decodo-proxy (yt-dlp 2026.10.26): het bestaande `['ios','web_embedded']` (ADR-027) blijft 100%
  betrouwbaar en blijft de PRIMAIRE keuze op elke poging behalve de laatste. De LAATSTE van de 3
  pogingen laat `player_client` weg (kale yt-dlp-defaults — sinds 2026.10.21 `web`/`tv_samsung`/
  `visionos`), wat op meerdere video's een KLEINER audio-only-formaat liet zien dan de expliciete
  override (bv. `OcMFwazVJaU`: 48,8 vs 53,8 kbps-vloer) — dat verklaart (samen met puur per-video
  formaat-beschikbaarheid) het 61 MB-vs-7,5 MB-verschil uit de testvraag. De kale yt-dlp-defaults zijn
  NIET als primaire keuze gebruikt: in een los experiment ving die kale configuratie YouTube's
  bot-detection op één van drie video's waar `ios+web_embedded` én `tv+android` allebei slaagden.
  `['tv','android']` (main.py/worker.py, de CAPTION-cascade-rotatie — een ander codepad dan de
  audio-download) bleek nog correct te werken (157 ondertitel-talen, identiek aan ios+web_embedded) —
  **geen wijziging daar**, alleen `audio_utils.py`'s audio-downloadpad is aangepast.
- **403 en proxy-tunnelfouten zijn nu transient** in `audio_utils._classify_ytdlp_error()`: een kale
  `HTTP Error 403: Forbidden` (googlevideo, niet de pagina) valt nu in `bot_block` (zelfde klasse als
  de bestaande bot-detection-signatures — een vers exit-IP/client lost het meestal op);
  `unable to connect to proxy`/`tunnel connection failed` (502/522) valt in een nieuwe `proxy`-reden.
  Beide retryen binnen de bestaande 3-pogingen-loop met een verse proxy-sessie (en op de laatste
  poging een ander `player_client`, zie boven).
- **Nieuw, eigen foutcode `file_collision`** (`transcription_pipeline._classify_download_error`,
  gecontroleerd VÓÓR de lossere `ytdlp_parse`-match, want de rename-foutmelding bevat zelf de
  substring "failed to extract") — eigen ErrorCard-copy i.p.v. de generieke "temporary connection
  problem", en uitgesloten van Sentry-alerting (verwachte, geclassificeerde uitkomst, geen crash).

## Rationale

yt-dlp's eigen clientaanbod verandert buiten onze controle (YouTube-policy-wijzigingen); een
3+ maanden oude pin is zelf al een bug-oorzaak. De primaire/laatste-poging-asymmetrie in
`player_client` is een bewuste afweging tussen twee gemeten eigenschappen (bot-detection-robuustheid
vs. kleinste-formaat-beschikbaarheid) — geen van beide client-configuraties domineert de ander op
alle assen, dus een vaste volgorde (bewezen eerst, experimenteel laatst) is veiliger dan een van de
twee overal te gebruiken.

## Consequenties

- `requirements.txt`: `yt-dlp==2026.10.26` (ongewijzigd `yt-dlp-ejs==0.8.0`).
- Elke toekomstige yt-dlp-bump die de default-clientlijst wijzigt (bv. een volgende
  tv_samsung-vervanger) wordt automatisch meegenomen via de laatste-poging-fallback, zonder
  codewijziging.
- `docs/LESSONS.md`: twee nieuwe regels (versiebeleid-cadans; client-geschiktheid is doel-specifiek,
  niet generiek "werkt/werkt niet").

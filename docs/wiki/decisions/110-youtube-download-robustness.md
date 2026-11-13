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

## Vervolg — format selector audio-only + MB/min-meting (2026-11-12/13)

Na een live proxy-kosten-incident (Dewey `5qYUSUXHYKc`, 31,7/50,9 MB voor 8 min audio — een
combined video+audio-formaat werd gekozen) is `base_ydl_opts['format']` veranderd van
`'bestaudio[abr<=70]/bestaudio[abr<=128]/bestaudio/best'` naar
`'bestaudio[abr<=70]/bestaudio[abr<=128]/bestaudio/bestaudio*'` — de kale `best`-fallback kon een
gecombineerd formaat opleveren zodra geen enkele `bestaudio`-variant matchte; `bestaudio*` garandeert
altijd audio-only, ook als abr/codec-metadata ontbreekt. `format_id`/`vcodec`/`acodec`/`abr` worden nu
per poging gelogd (`[YT-DLP-AUDIO-ATTEMPT]`) plus een WARNING-canary als `vcodec` ooit niet `none` is
(zou na de fix nooit meer mogen vuren).

**Live gemeten (5 video's, verschillende lengte, via de echte productiefunctie
`extract_youtube_audio`):**

| Video | Lengte | format_id | MB/min |
|---|---|---|---|
| Dewey (`5qYUSUXHYKc`) | 7:47 | — | 0,470 |
| MMA (`8YvEPC8irZY`) | 15:41 | — | 0,735 |
| Pharma (`eZBtQ0rDnG4`) | 16:11 | 249 (opus, audio-only) | 0,351 |
| History (`OcMFwazVJaU`) | 19:24 | — | 0,404 |
| TED "History of our world" (`yqc9zX04DXs`) | 17:41 | 250 (opus, audio-only) | 0,404 |

Alle 5 onder het doel van ≤1,5 MB/min, alle audio-only.

**Correctie op de eerder gerapporteerde Pharma-meting (1,633 MB/min, 12-11):** drie herhaalruns op
13-11 met de huidige code geven alle drie exact 0,351 MB/min, telkens in **1 poging** met hetzelfde
kleine audio-only-formaat (`format_id=249`, 49 kbps opus, 5,67 MB). Er bestaat geen kleiner
audio-only-formaat op dit moment (bare yt-dlp-defaults bevestigen dezelfde ~5,9 MB-ondergrens via een
ander format_id). De eerdere 1,633 MB/min was dus geen format-selectie-fout — de meest waarschijnlijke
verklaring is dat die meting één of meer mislukte pogingen meetelde (partial-download-egress van een
afgebroken poging telt terecht mee als echte kost, zie `extract_youtube_audio`'s
`cumulative_bytes`-ontwerp), niet een structureel te-groot gekozen formaat. Geen codewijziging nodig
voor Pharma specifiek; de bredere format-selector-fix (audio-only garanderen) staat al.

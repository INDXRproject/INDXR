# Beslissing 097: MOV/FLV/AVI/MKV-uploads + inhoud-gebaseerde audio-poort

**Status:** Geaccepteerd
**Datum:** 2026-08-12
**Gerelateerde code:** `backend/audio_utils.py`, `backend/transcription_pipeline.py`, `backend/main.py`, `packages/shared/src/lib/uploadFormats.ts`, `packages/shared/src/components/free-tool/AudioTab.tsx`, `packages/shared/src/components/transcribe/errorCopy.ts`, `packages/shared/src/lib/exportFormats.ts`, `apps/marketing/src/app/articles/audio-to-text/page.tsx`, `apps/marketing/src/app/transcribe/page.tsx`, `apps/marketing/src/app/docs/guides/uploads/page.tsx`, `docs/wiki/content/product-truth.md`, `backend/verify_video_formats.py`

## Context

De accepteerde upload-formaten waren 9 (`.mp3 .mp4 .mpeg .mpga .m4a .wav .webm .ogg .flac`). Concurrenten op de zoekterm *video-to-text* adverteren MOV, AVI, MKV en FLV. Op een pagina over video-naar-tekst is "wel MP4, geen MKV" een halve toezegging — MKV is precies wat mensen downloaden.

Twee onderzochte feiten bepaalden de aanpak:

1. **AssemblyAI-lijst** (support-doc, geverifieerd 2026-08-12): video-containers `.webm .mts .m2ts .ts .mov .mp2 .mp4 .m4v .mxf` en audio incl. `.flv`. **MOV en FLV staan erop; AVI en MKV niet.** AssemblyAI extraheert de audio zelf en raadt aan bestanden in hun native formaat te sturen zonder transcodering.
2. **ffmpeg 6.1.1** (Railway) leest en extraheert audio uit MOV/AVI/MKV/FLV met exact het bestaande commando (`-vn -ac 1 -c:a libopus -b:a 12k`), ongewijzigd (empirisch getest met echte bestanden).

Daarnaast een bestaand gat: de formaatpoort werkte **uitsluitend op bestandsnaam-extensie** (client én server). Een bestand hernoemd naar een toegestane extensie passeerde ongezien en faalde pas diep in de pipeline — ná een reservering + refund.

## Beslissing

1. **Vier formaten toegevoegd** aan beide allowlists (backend `SUPPORTED_FORMATS`, frontend `UPLOAD_EXTENSIONS`) → 13 totaal.
2. **Provider-transcode-poort op de gedetecteerde container, niet de extensie.** In de pipeline (Step 5) bepaalt `get_audio_container` (ffprobe magic-bytes) het containerformaat; `needs_provider_transcode` retourneert True voor `{avi, mkv}`. Dan draait `compress_audio_if_needed(force=True)` — dezelfde ffmpeg-audio-extractie — vóór submit. MOV/FLV en alle bestaande formaten gaan **rauw** naar AssemblyAI. `compress_audio_if_needed` kreeg een `force`-parameter omdat de size-tak (>25 MB) op het upload-pad feitelijk een no-op is (zie Consequenties).
3. **Matroska-detectie gerepareerd.** ffprobe rapporteert `matroska,webm` voor zowel `.mkv` als `.webm` (één demuxer, inhoud onderscheidt ze niet). De oude `get_audio_container` matchte daardoor `.mkv` foutief als `webm` (de `matroska→mkv`-tak was onbereikbaar). Nu splitst een extensie-hint binnen de bevestigde familie (`.webm → webm` = rauw; anders `mkv` = transcode), net als de bestaande mp4/m4a-disambiguatie.
4. **Inhoud-gebaseerde audio-poort vóór reservering.** `has_usable_audio` (ffprobe audio-stream-check) draait in `main.py` direct na het wegschrijven van het temp-bestand en vóór `estimate_upload_reserve_cost` → geen audiotrack = **HTTP 422 `no_audio`** zonder reservering/refund. **Bewust ruim:** het eist géén match tussen extensie en gedetecteerde container (mp4/m4a/mov delen een familie, matroska dekt mkv/webm) — alleen "geen audio" leidt tot weigering.
5. **Browser-schatting eerlijk gemaakt.** De browser leest de duur via een `<audio>`-element; dat faalt vaak voor AVI/MKV → de UI viel terug op een `bestandsgrootte/10`-schatting die voor video wild verkeerd is. Nu toont de UI bij onbekende duur géén getal ("Calculated from length after upload"); de server blijft leidend (reserveert + refundt).

## Rationale

- **Transcode alleen waar nodig.** MOV/FLV rauw doorsturen volgt AssemblyAI's eigen advies (geen onnodige kwaliteitsverlies-transcode) en houdt de latency laag. AVI/MKV transcoderen wij omdat de provider ze niet garandeert.
- **Container boven extensie voor de transcode-beslissing** voorkomt dat een `.mkv` hernoemd naar `.mp4` rauw naar een provider gaat die het niet accepteert.
- **Ruime audio-poort** omdat extensie en echte container legitiem uiteenlopen; alleen echt-geen-audio is een harde fout, en die willen we vóór de reservering vangen (geen reserve→refund-ruis).

## Consequenties

- **`compress_audio_if_needed` size-tak is een no-op op het upload-pad**: de interne drempel is `MAX_FILE_SIZE_BYTES` (500 MB) = de upload-cap, dus een 25–500 MB upload werd nooit gecomprimeerd — het rauwe bestand ging naar AssemblyAI (die tot 5 GB accepteert). Dit is pre-existing; niet gewijzigd. De nieuwe transcode leunt op de `force`-parameter, niet op die drempel. (Afwijking t.o.v. mijn eerdere analyse, die aannam dat de size-tak wél comprimeerde — de codebase wint.)
- **500 MB-cap ongewijzigd.** Verhogen vraagt eerst een herbouw van de upload-afhandeling naar streamen (nu wordt het hele bestand in RAM gelezen, `main.py` `audio_file.read()`). Genoteerd in `roadmap/priorities.md`.
- **Uploads-gids-screenshot** (`/docs/screenshots/uploader-empty.png`) toont de oude formaatlijst en veroudert; opnieuw schieten in een aparte ronde.

## Verificatie

Echte end-to-end runs (`backend/verify_video_formats.py`, echte AssemblyAI EU + echte ffmpeg, JFK-spraakclip):

| Formaat | klein (<25 MB) | groot (54,5 MB) | transcode | provider | inhoud |
|---------|----------------|-----------------|-----------|----------|--------|
| MOV | ✓ | ✓ | nee (raw) | geaccepteerd | correct |
| FLV | ✓ | — | nee (raw) | geaccepteerd | correct |
| AVI | ✓ | — | ja | geaccepteerd | correct |
| MKV | ✓ | ✓ | ja | geaccepteerd | correct |

Inhoud-poort: video-zonder-audio (`.mp4`) → `has_usable_audio=False` (geweigerd); tekstbestand → `.mp3` → False (geweigerd); mkv-inhoud genaamd `.mp4` → True (geaccepteerd, container=mkv); flac-inhoud genaamd `.mp3` → True (geaccepteerd). Regressie: 7 bestaande formaten detecteren correct (**webm → webm**, niet mkv, na de matroska-fix); 19 backend-tests groen; `pnpm build` 2/2 groen.

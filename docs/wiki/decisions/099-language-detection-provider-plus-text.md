# Beslissing 099: Taaldetectie — provider (audio) + tekst, tekst wint bij onenigheid

**Status:** Geaccepteerd
**Datum:** 2026-08-26
**Gerelateerde code:** `backend/language_detection.py` (single source: talenset + reconcile-regel), `backend/transcription_pipeline.py` (AI-pad), `backend/youtube_utils.py` (caption-pad), migratie `20260826140000_transcript_provider_language.sql` (`transcripts.provider_language`), `backend/test_language_detection.py`.

## Context

De taalbepaling van een transcript kende twee eerdere stappen:

1. Oorspronkelijk overschreef een lokale lingua-herdetectie (13 talen) **altijd** de providerwaarde → 79% van de transcripts kreeg geen taal (elke taal buiten die 13 viel weg naar NULL).
2. De correctie maakte de **provider (AssemblyAI, 99 talen, audio-detectie) de bron van waarheid**, met lingua alleen als terugval. Dat vulde bij het eenmalige herstel 777 rijen.

Bij dat herstel bleek provider-eerst een **echt tegenvoorbeeld** te hebben: een **Engelse** lezing ("WHY ARE THE EVIL PEOPLE SO RICH?", tekst "…Why did Hashem let all these evil people be so rich…") werd door AssemblyAI als **Hebreeuws** (`he`) gedetecteerd. De provider luistert naar **audio**; bij een Engelse lezing met veel anderstalige termen (Hashem, inshAllah, juz) kan de audio-kant de taal misplaatsen. De **tekstdetectie leest wat er staat** en had `en` goed. Provider-eerst zou hier een foute waarde opslaan — juist wat de gebruiker leest en exporteert is dan verkeerd gelabeld.

Bijkomend: de lokale detectors in beide paden gebruikten nog de oude 13-talen-set en te weinig tekst (20 segmenten), waardoor het herstel over een maand weer uitgehold zou zijn voor nieuwe rijen.

## Beslissing

1. **Eén verantwoorde talenset op één plek** (`language_detection.py`, `SUPPORTED_LANGUAGES`): lingua's 75 talen MINUS 18 constructed/low-resource long-tail-talen (Esperanto, Latijn, Tagalog, Yoruba, Zoeloe, Swahili, Welsh, …) die implausibel zijn voor ons corpus én transliteratie-rijk Engels vals-positief pakken (de volle 75-set labelde een Engelse islamitische lezing als Tagalog). De uitsluitingen + reden staan **hier**, zodat de volgende wijziging niet opnieuw gokt. Zelfde tekstbudget overal: eerste **300 segmenten, cap 6000 tekens** (ruim meer dan de oude 20).

2. **Reconcile-regel (AI-pad)** — `reconcile_language(provider, transcript)`: provider (audio) en tekstdetectie samen.
   - Eens → die waarde.
   - **Oneens → de tekst wint** (dat is wat de gebruiker leest/exporteert).
   - Tekst levert niets bruikbaars → de provider wint.
   Bij onenigheid worden **beide** bewaard: `transcripts.language` = tekst, `transcripts.provider_language` = de overruled providerwaarde, zodat een meningsverschil vindbaar en telbaar blijft.

3. **Caption-pad**: de provider is hier YouTube's gedeclareerde tracktaal (metadata, geen audio-detectie) en blijft leidend; de tekstdetectie is de terugval wanneer YouTube geen taal geeft, nu via dezelfde verantwoorde set + tekstbudget. De audio-vs-tekst-onenigheid speelt alleen bij audio-detectie, dus alleen op het AI-pad.

## Rationale

- De tekst is de bron die de gebruiker daadwerkelijk ziet en exporteert; bij twijfel is die gezaghebbender dan een audio-gok. "Leeg beter dan fout": levert de tekst niets, dan pas de provider.
- Een confidence-drempel bleek niet-discriminerend — lingua's relatieve zekerheid verzadigt op 1,0 bij lange monolinguale tekst; de betrouwbaarheid komt van de **talenset**, niet van een confidence-getal.
- Beide waarden bewaren maakt de zeldzame onenigheid meetbaar zonder informatie weg te gooien.

## Consequenties

- Nieuwe transcripts in talen buiten de oude 13 (bv. Russisch) krijgen nu wél een taal — bewezen in `test_language_detection.py` (geen provideraanroep, geen credits).
- Terugwerkend over de 16 rijen met een providerwaarde: **15 eens, 1 oneens** (de Hebreeuws→Engels-rij), nu `language='en'`, `provider_language='he'`. Geen andere meningsverschillen.
- Nieuwe kolom `transcripts.provider_language` (nullable, alleen bij onenigheid gevuld).
- Dit **nuanceert** het provider-eerst-ontwerp (dat niet apart in een ADR stond): provider-eerst blijft de default, maar de tekst overruled een audio-misdetectie.

# Error Taxonomy

Eén plek voor alle `error_type` slugs die voorkomen in `transcription_jobs`, `playlist_extraction_jobs.video_results`, en worker-logging. Per error: technische definitie, oorzaak-categorie, user-facing message, en mitigatie.

## Categorieën

| Categorie | Definitie |
|-----------|-----------|
| **External** | Buiten onze controle — we kunnen de gebruiker alleen informeren |
| **Hybride** | YouTube/provider-veroorzaakt, maar wij kunnen (deels) mitigeren via cascade, retries, of caching |
| **Internal** | Onze codebase of infrastructuur — wij kunnen dit oplossen |
| **User** | Input-validatie of account-state — gebruiker moet actie ondernemen |

---

## Errors

### `bot_detection`

- **Categorie:** Hybride
- **Technische definitie:** `_classify_download_error()` in `transcription_pipeline.py:61` matcht op `'sign in to confirm'`, `'confirming you'`, `'not a bot'`, `'429'`, of `'too many requests'` in de yt-dlp error string.
- **Voorbeeld error message:** `"Sign in to confirm you're not a bot"`, `"HTTP Error 429: Too Many Requests"`
- **Frequency observed:** 2× in Fase 3b.3 productietest (22-video playlist)
- **User-facing message NL:** "YouTube heeft ons verzoek tijdelijk geblokkeerd. Wacht even en probeer opnieuw, of gebruik AI-transcriptie — dit werkt via een ander pad en lukt vaak direct."
- **User-facing message EN:** "YouTube temporarily blocked our request. Wait a few minutes and try again, or use AI transcription — it accesses YouTube differently and often works immediately."
- **Mitigatie nu:** Retry-pass (`process_playlist_retries`) loopt automatisch met 30s delay — maar lost bot_detection in de praktijk **niet** op. Verified Fase 3b.3: 30s delay + dezelfde proxy session is onvoldoende; IP-reputatie kleeft. Retry-pass is effectief voor `timeout`, niet voor `bot_detection`.
- **Mitigatie gepland:** Taak 1.6 — yt-dlp cascade met PO tokens (bgutil) + alternatieve clients (`tv`, `ios`). Open vraag: retry-pass voor bot_detection herbeoordelen in taak 1.6 scope.

---

### `youtube_restricted`

- **Categorie:** External
- **Technische definitie:** `_classify_download_error()` matcht op error code `152` of `'unavailable'` in de yt-dlp error string (`transcription_pipeline.py:73`).
- **Voorbeeld error message:** `"This video is unavailable"`, `"ERROR: [youtube] <id>: Video unavailable"`
- **Frequency observed:** 1× in Fase 3b.3 productietest
- **User-facing message NL:** "Deze video is niet beschikbaar — verwijderd, geografisch geblokkeerd, of beperkt op YouTube."
- **User-facing message EN:** "This video is unavailable — it may be removed, geo-blocked, or restricted on YouTube."
- **Mitigatie nu:** Geen — video is fundamenteel ontoegankelijk voor yt-dlp.
- **Mitigatie gepland:** Geen geplande mitigatie. Wel: betere differentiatie tussen geo-block (wisselen exit-IP) en verwijderd (definitief) is theoretisch mogelijk maar laag prioriteit.

---

### `age_restricted`

- **Categorie:** External
- **Technische definitie:** `_classify_download_error()` matcht op `'age-restricted'`, `'age restricted'`, `'only available on youtube'`, of `'confirm your age'` (`transcription_pipeline.py:67`).
- **Voorbeeld error message:** `"Sign in to confirm your age"`, `"This video may be inappropriate for some users"`
- **Frequency observed:** Niet gezien in Fase 3b.3; classificatie aanwezig in code.
- **User-facing message NL:** "Deze video heeft een leeftijdsbeperking. YouTube vereist een ingelogd account — AI-transcriptie kan dit niet omzeilen."
- **User-facing message EN:** "This video is age-restricted. YouTube requires a signed-in account to access it — AI transcription cannot help here."
- **Mitigatie nu:** Geen — yt-dlp zonder login cookie kan leeftijdsbegrensde content niet downloaden.
- **Mitigatie gepland:** Niet gepland. Cookies injecteren is buiten scope (privacy + onderhoudslast).

---

### `members_only`

- **Categorie:** External
- **Technische definitie:** Geraised als `MembersOnlyVideoError` in `audio_utils.py`, gevangen in `do_assemblyai_transcription()` en in `process_playlist_video` / `process_playlist_retries` in `worker.py`. Matcht op `MEMBERS_ONLY_KEYWORDS` lijst.
- **Voorbeeld error message:** `"Join this channel to get access to members-only content"`
- **Frequency observed:** Niet gezien in Fase 3b.3; aparte error class aanwezig.
- **User-facing message NL:** "Deze video is exclusief voor kanaalleden. Alleen leden van dit kanaal kunnen hem bekijken."
- **User-facing message EN:** "This video is members-only. Only channel members can access it."
- **Mitigatie nu:** Geen — structureel ontoegankelijk.
- **Mitigatie gepland:** Geen.

---

### `timeout`

- **Categorie:** Hybride
- **Technische definitie:** `_classify_download_error()` matcht op `'timed out'`, `'timeout'`, `'read timed out'`, `'504'`, of `'gateway timeout'` (`transcription_pipeline.py:70`).
- **Voorbeeld error message:** `"Read timed out"`, `"HTTP Error 504: Gateway Timeout"`
- **Frequency observed:** Niet gezien in Fase 3b.3; retry-pass dekt dit.
- **User-facing message NL:** "Verbinding verloren. We proberen het automatisch opnieuw."
- **User-facing message EN:** "Connection timed out. Retrying automatically."
- **Mitigatie nu:** Retry-pass (`process_playlist_retries`) met 30s delay. Voor `timeout` is dit effectief (transient network hiccup, 30s is voldoende voor recovery). Geverifieerd: retry-pass mechanisme werkt correct (Fase 3b.3).
- **Mitigatie gepland:** Taak 1.6 cascade biedt aanvullende fallback. Taak 1.19 VTT timeout-specifieke fix.

---

### `extraction_error`

- **Categorie:** Hybride (classificatie deels onzeker)
- **Technische definitie:** Catch-all in `_classify_download_error()` — elke yt-dlp exception die niet matcht op de specifieke keywords (`transcription_pipeline.py:83`). Ook: fallback in `_call_progress_rpc` als `error_type` None is (`worker.py:166`: `error_type or 'extraction_error'`).
- **Voorbeeld error message:** Alles wat niet specifiek geclassificeerd wordt — parse errors, onverwachte yt-dlp output, netwerkfouten zonder bekende signature.
- **Frequency observed:** 1× in Fase 3b.3 productietest (video `si6aHp0U6wg`)
- **User-facing message NL:** "Extractie mislukt. Probeer het over een moment opnieuw."
- **User-facing message EN:** "Extraction failed. Try again in a moment."
- **Mitigatie nu:** Geen automatische retry (niet retry-eligible in `_enqueue_next`). Raw error string wordt gelogd op WARNING met video_id en job_id — zie Railway logs op `[extraction_error:unclassified]`.
- **Mitigatie gepland:** Taak 1.6 cascade geeft aanvullende extractie-paden. Betere classificatie: productie-logs analyseren op `[extraction_error:unclassified]` om specifieke keywords toe te voegen aan `_classify_download_error`.

---

### `no_captions`

- **Categorie:** External
- **Technische definitie:** `_process_caption_video()` in `worker.py:116` — `extract_with_ytdlp()` retourneert geen `transcript` key in het resultaat (leeg dict of ontbrekend veld).
- **Voorbeeld error message:** Geen — stille return van `{}` in `youtube_utils.extract_with_ytdlp`.
- **Frequency observed:** Niet gezien in Fase 3b.3 (alle caption-videos hadden captions).
- **User-facing message NL:** "Geen captions beschikbaar voor deze video. AI-transcriptie kan er een aanmaken — 1 credit per minuut. Als er geen spraak wordt gedetecteerd, worden je credits automatisch teruggestort."
- **User-facing message EN:** "No captions found for this video. AI transcription can generate one — 1 credit per minute. If no speech is detected, your credits are automatically refunded."
- **Mitigatie nu:** In playlist-context: video wordt gemarkeerd als `no_captions`. Gebruiker kan in de UI Whisper selecteren voor deze video (maar dit vereist opnieuw starten van de job).
- **Mitigatie gepland:** Taak 1.6 cascade — `no_captions` kan automatisch triggeren tot Whisper fallback.

---

### `no_speech`

- **Categorie:** External
- **Technische definitie:** `do_assemblyai_transcription()` in `transcription_pipeline.py:239` — AssemblyAI retourneert een transcript zonder utterances / lege tekst, gedetecteerd na transcriptie compleet is.
- **Voorbeeld error message:** AssemblyAI API response: `status='completed'` maar lege `words` of `text`.
- **Frequency observed:** Niet gezien in Fase 3b.3; code-pad aanwezig.
- **User-facing message NL:** "Geen spraak gedetecteerd. De video bevat mogelijk alleen muziek of stilte. Credits zijn automatisch teruggestort."
- **User-facing message EN:** "No speech detected. This video may contain only music, sound effects, or silence. Any credits charged have been automatically refunded."
- **Mitigatie nu:** Credits worden teruggestort (`add_credits` refund in finally-block).
- **Mitigatie gepland:** Geen — inhoud van de video is het probleem.

---

### `insufficient_credits`

- **Categorie:** User
- **Technische definitie:** Twee locaties: (1) `_process_caption_video()` in `worker.py:113` — `check_user_balance()` retourneert < 1 voor een betaalde caption-video. (2) `do_assemblyai_transcription()` in `transcription_pipeline.py:181` — balance < `credit_cost` voor Whisper. Enkel gecheckt bij niet-gratis videos (captions idx ≥ 3; Whisper altijd).
- **Voorbeeld error message:** Interne check — geen externe API-fout.
- **Frequency observed:** Niet gezien in Fase 3b.3.
- **User-facing message NL:** "Onvoldoende credits. Koop meer credits om door te gaan."
- **User-facing message EN:** "Insufficient credits. Purchase more credits to continue."
- **Mitigatie nu:** Chain stopt voor deze video; volgende video wordt nog steeds geprobeerd (chain loopt door).
- **Mitigatie gepland:** Betere frontend-waarschuwing vóór start playlist als verwachte cost > balance.

---

## Overzicht tabel

| Error type | Categorie | Retry-eligible | Frequency Fase 3b.3 | AI-suggestie? | Taak |
|------------|-----------|----------------|----------------------|---------------|------|
| `bot_detection` | Hybride | ✅ (maar ineffectief) | 2× | JA — alternatief pad | 1.6 |
| `youtube_restricted` | External | ❌ | 1× | NEE | — |
| `age_restricted` | External | ❌ | 0× | NEE | — |
| `members_only` | External | ❌ | 0× | NEE | — |
| `timeout` | Hybride | ✅ (effectief) | 0× | n.v.t. (retry) | 1.6, 1.19 |
| `extraction_error` | Hybride | ❌ | 1× | JA | 1.6 |
| `no_captions` | External | ❌ | 0× | JA — met no_speech refund disclaimer | 1.19b |
| `no_speech` | External | ❌ | 0× | NEE (al binnen AI flow) | — |
| `insufficient_credits` | User | ❌ | 0× | NEE | — |

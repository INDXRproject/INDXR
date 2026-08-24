"""
Backend-afgedwongen playlist/job-limieten — de HANDHAVER-bron (single source).

Bewust een module met ALLEEN constanten: geen imports van main/app/FastAPI, zodat
test_playlist_limits.py het kan importeren zonder de app te starten (dat was de reden dat de test
eerder de broncode las in plaats van te importeren). main.py en transcription_pipeline.py importeren
hieruit; de TS-spiegel packages/shared/src/lib/limits.ts wordt via test-fixtures/playlist_limits.json
tegen deze waarden gecheckt door scripts/check-playlist-invariants.sh.
"""

# Max video's per playlist-extractie-job (ADR-071). Afgedwongen op de extract-route vóór job-rij +
# reservering; de Next-route en de UI spiegelen dit via de gedeelde TS-bron.
MAX_PLAYLIST_VIDEOS = 500

# Max gelijktijdige transcriptie-/extractie-jobs per user (ADR-050).
MAX_CONCURRENT_JOBS = 3

# Max geaccepteerde audioduur voor AI-transcriptie (AssemblyAI-plafond, ADR-071). Caption-extractie
# heeft GEEN duurcap. De ARQ job_timeout wordt hiervan afgeleid in transcription_pipeline.py.
MAX_TRANSCRIPTION_SECONDS = 10 * 3600  # 36000

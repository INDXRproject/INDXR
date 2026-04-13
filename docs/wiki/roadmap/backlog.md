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
- [ ] Duplicate transcript detectie: geen nieuwe rij als `video_id + user_id` al bestaat
- [ ] Volledig credit transaction history (nu max 20 rijen) — hogere of onbeperkte cut-off
- [ ] Library visibility gating (Otter.ai-model): 25 meest recente zichtbaar voor free users, upgrade voor meer — zie toekomstige ADR-020

### AI & Transcriptie
- [ ] Opus 249 audio format (na validatietest van 50 video's) — zie [ADR-016](../decisions/016-opus-249-audio-format.md)
- [ ] BYOK: gebruikers eigen API keys laten gebruiken (OpenAI, Anthropic, DeepSeek) — `backend/main.py:1173`
- [ ] Multi-language Whisper: taaldetectie verbeteren voor 99+ talen via Universal-2
- [ ] AssemblyAI: automatic retry voor gefaalde playlist-video's

### Bulk & Channel
- [ ] Channel extractie: heel YouTube-kanaal transcriberen (vereist queue-architectuur: Redis/BullMQ of Supabase Realtime)
- [ ] Batch processing: CSV upload van video URLs
- [ ] Random session ID fix voor schaal (huidige hardcoded `indxr1` sticky session)

### Integraties
- [ ] Notion integratie (export direct naar Notion pagina)
- [ ] Obsidian integratie (export naar vault)
- [ ] Zapier integratie

---

## Platform & Stabiliteit

- [ ] iOS PO token fix voor bgutil (fallback als YouTube iOS client blokkeert)
- [ ] Sentry / error tracking (nu alleen Railway logs)
- [ ] Uptime monitoring (UptimeRobot of BetterUptime)
- [ ] Admin dashboard: processing times + error rates per tijdvenster
- [ ] Multi-region deployment (Railway)

---

## Gamification (deferred tot na visueel redesign)

Schema al ontworpen, nog niet geïmplementeerd:
- [ ] XP-systeem via paid actions (transcripties, samenvattingen)
- [ ] Levels 1–20 met credit reward chests op milestone-levels
- [ ] Milestone rewards: bonus credits bij 10, 50, 100, 500 extracties
- [ ] Streak systeem met credit-kosten streak freeze (Duolingo-model)
- [ ] Custom themes/skins: cosmetische credit sink (permanente unlock via credits)

---

## Branding (open vraag)

Domeinnaam/branding herbeoordelen post-launch:
- Kandidaten: **Scrivr**, **Vellum**, **Monkr**, **Quillr**
- Niet besloten — wachten op productmarkt fit signalen

---

## Afgerond (reference)

Functies die gepland waren en nu live zijn:
- *(Bijwerken na elke release)*

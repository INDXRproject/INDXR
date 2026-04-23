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

### Feature: Language-aware caption extraction voor niet-Engelse videos

**Prioriteit:** Low
**Type:** Feature / Tech investigation

**Achtergrond:**
De huidige caption extractie pakt hardcoded de `'en'` sleutel uit YouTube's caption lijst. Voor niet-Engelse videos bestaat de originele taaltrack wel degelijk — bijv. `'ar-orig'` voor Arabisch — maar de code kijkt er nooit naar.

Diagnostisch bevestigd (2026-04-23): `automatic_captions` bevat `'ar-orig'` voor Arabische video's. De fix vereist een language-aware lookup: gebruik `info.get('language')` om de originele taal te bepalen, zoek dan `'{lang}-orig'` op in `automatic_captions`, en val terug op `'en'` als die track niet bestaat.

**Validatie extern:** Tactiq.io en youtubetotranscript.com geven ook Engelse output voor niet-Engelse videos — dit is een industrie-breed probleem, niet INDXR-specifiek.

**Aanbevolen flow tot deze fix er is:** AssemblyAI transcriptie voor niet-Engelse content.

**Geschatte complexiteit:** Medium — 10-20 regels Python, maar vereist testen op meerdere talen en edge cases (taal niet beschikbaar, alleen vertaling beschikbaar, etc.)

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

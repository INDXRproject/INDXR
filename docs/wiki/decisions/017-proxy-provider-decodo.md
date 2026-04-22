# Beslissing 017: Overstap van IPRoyal naar Decodo voor residentiële proxies

**Status:** Geïmplementeerd — 2026-04-20, overgestapt naar Decodo residentieel 10GB plan
**Datum:** 2026-04-14
**Gerelateerde code:** `backend/main.py` (get_proxy_url), `backend/.env`

> **Implementation notes:** Dit ADR is oorspronkelijk geschreven als planningsdocument (2026-04-14).
> Op 2026-04-21 bijgewerkt om de geïmplementeerde werkelijkheid te reflecteren.
> Username format gecorrigeerd naar `user-{PROXY_USERNAME}-session-{sid}` in commit `0c57ad0`.

---

## Context

INDXR.AI downloadt YouTube audio via yt-dlp op een Railway cloud server. YouTube blokkeert datacenter IPs automatisch — residentiële proxies zijn verplicht. Per job wordt een sticky session gebruikt zodat het YouTube CDN IP-locked audio-segment-URLs accepteert gedurende de volledige download.

Huidige provider: **Decodo** (overgestapt 2026-04-20)
- Vorige provider: IPRoyal (~€6.25/GB testkosten)
- Reden voor overstap: ~45% kostenreductie en betere yt-dlp compatibiliteit

---

## Beslissing

Overstappen naar **Decodo** (voorheen Smartproxy) zodra IPRoyal tegoed op is.

---

## Rationale

Drie onafhankelijke bronnen (eigen research, Perplexity, ChatGPT) komen allemaal op Decodo als beste balans voor deze use case:

**Prijs:**
- IPRoyal huidig: ~$6.25/GB (testvolume)
- Decodo: $3.25–3.50/GB bij 20GB, $3.00/GB bij 50GB, $2.75/GB bij 100GB
- Besparing: ~45% goedkoper bij launch volumes

**YouTube + yt-dlp compatibiliteit:**
- Decodo heeft expliciete yt-dlp documentatie en is gebouwd voor video/audio scraping
- 99.86% connection success rate in onafhankelijke benchmarks
- 115M+ residentiële IPs in 195+ locaties

**Sticky sessions:**
- Standaard 10 minuten, configureerbaar tot 24 uur
- Session ID in username: `user-{PROXY_USERNAME}-session-{sid}`

**Code-aanpassing uitgevoerd** — `get_proxy_url()` bijgewerkt + Railway env vars aangepast.

---

## Technische implementatie

### Proxy string formaat (Decodo)
```
http://user-{PROXY_USERNAME}-session-{sid}:{PROXY_PASSWORD}@gate.decodo.com:10001
```

Voorbeeld voor job `abc12345`:
```
http://user-myuser-session-abc12345:mypassword@gate.decodo.com:10001
```

### Verschil met IPRoyal
| | IPRoyal | Decodo |
|---|---|---|
| Session ID locatie | Wachtwoord suffix | Username suffix |
| Format | `pass_session-JOBID_lifetime-10m` | `user-{USERNAME}-session-{JOBID}` |
| Host | `geo.iproyal.com:12321` | `gate.decodo.com:10001` |

### Code-aanpassing in `get_proxy_url()` (main.py)
Session ID is verplaatst van wachtwoord-suffix naar username-prefix (geïmplementeerd 2026-04-20, format gecorrigeerd 2026-04-21 in commit `0c57ad0`):
```python
sticky_user = f"user-{PROXY_USERNAME}-session-{sid}"
return f"http://{sticky_user}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}"
```

### Railway env vars die wijzigen
```
PROXY_HOST=gate.decodo.com
PROXY_PORT=10001
PROXY_USER=<decodo_username>
PROXY_PASSWORD=<decodo_password>
```

---

## Teststrategie voor pilot (1-2 GB)

1. Verifieer proxy werkt:
```bash
curl -x "http://USERNAME:PASSWORD@gate.decodo.com:10001" https://ip.decodo.com
```

2. Test sticky session stabiliteit (zelfde IP voor zelfde session ID):
```bash
# Twee keer zelfde session ID — moet zelfde exit IP tonen
curl -x "http://user-USERNAME-session-test001:PASSWORD@gate.decodo.com:10001" https://ip.decodo.com
curl -x "http://user-USERNAME-session-test001:PASSWORD@gate.decodo.com:10001" https://ip.decodo.com
```

3. yt-dlp test:
```bash
yt-dlp -v --proxy "http://user-USERNAME-session-test001:PASSWORD@gate.decodo.com:10001" "YOUTUBE_URL"
```

4. Acceptatiecriteria: ≥95% success op 10-20 representatieve downloads, geen auth errors, geen session resets binnen job window.

---

## Alternatieven overwogen

| Provider | Prijs | Overweging |
|---|---|---|
| IPRoyal | ~$6.25/GB huidig | Te duur voor launch, blijft als fallback optie |
| NetNut | Mid-premium | Goede YouTube reliability maar duurder dan Decodo |
| Oxylabs | Premium | Hoogste success rate maar onnodige kosten voor launch volume |
| Webshare | $1.40–2.80/GB | Goedkoopste, maar kleinere IP pool, meer kans op geburnde IPs |

---

## Consequenties

**Voordelen:**
- ~45% kostenbesparing bij 20GB/month, meer bij hogere volumes
- Expliciete yt-dlp en YouTube audio ondersteuning
- Geen downtime — switch via env vars, geen redeploy nodig

**Risico's:**
- Sticky sessions zijn best-effort — residentieel IP kan offline gaan mid-job
- Sticky sessions zijn best-effort — residentieel IP kan offline gaan mid-job
- Session ID is verplaatst van wachtwoord naar username (geïmplementeerd 2026-04-20)

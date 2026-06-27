# Railway CLI — log-toegang voor CC

## Doel

CC (Claude Code) kan zelfstandig logs ophalen van de Railway-services `worker` en `api` in het project `indxr-backend`. Read-only: alleen logs lezen, geen deploys, geen variabele-wijzigingen, geen restarts.

---

## Eenmalige setup door Khidr

### Stap 1 — Token genereren

1. Ga naar **https://railway.com/account/tokens**
2. Klik **New Token**
3. Geef het een naam (bijv. `cc-logs-readonly`)
4. Kopieer het token — het wordt maar één keer getoond

**Token-type:** Account-scoped token — bij aanmaken de **Workspace dropdown op "No workspace" laten staan**. Workspace-scoped tokens worden geweigerd door de CLI (bekende bug, issue #845). Account-scoped tokens werken voor alle projecten en services.

### Stap 2 — Token persistent zetten

Voeg toe aan `~/.bashrc` (niet in de repo — nooit committen):

```bash
export RAILWAY_API_TOKEN=<plak_hier_het_token>
```

Vervolgens:

```bash
source ~/.bashrc
```

**Persistentie:** `~/.bashrc` wordt bij elke nieuwe shell geladen, dus dit token overleeft sessies. CC ziet het in elke nieuwe terminal-instantie. Eenmalig instellen is voldoende — geen herinstallatie per sessie nodig.

### Stap 3 — Project-ID opzoeken (eenmalig)

Na het instellen van het token:

```bash
source "$HOME/.railway/env" && railway list
```

Noteer het project-ID van `indxr-backend` (UUID-formaat). Bewaar het hier:

**Project-ID `indxr-backend`:** `4126c5e1-014c-4773-913f-beff079bc554`
**Environment:** `production` (ID: `0e93d362-2ea7-4800-9b10-ba5902ee3806`)
**Service IDs:** worker `cd76a544-9985-4f99-8e12-13320551b2d7` · api `c0e114e8-ad6f-4b28-8a49-9626180ac222` · Redis `9fd0d54c-dc1e-4443-b5f5-bbe115bf46ee`

---

## Installatie Railway CLI

Al geïnstalleerd op dit systeem (`~/.railway/bin/railway`, versie 5.23.1).

```bash
# PATH activeren in een nieuwe terminal:
source "$HOME/.railway/env"

# Of permanent — staat al in ~/.bashrc na installatie
railway --version
```

---

## Commando-recept: logs ophalen

Alle commando's hieronder vereisen `RAILWAY_API_TOKEN` in de omgeving.

### Basispatroon

```bash
railway logs \
  -p 4126c5e1-014c-4773-913f-beff079bc554 \
  -e production \
  -s worker \
  -n 100
```

### Worker-logs, laatste 100 regels

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 100
```

### Filter op video-ID (tekst-search)

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 200 --filter "dQw4w9WgXcQ"
```

### Filter op ARQ-task

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 200 --filter "process_playlist_video"
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 200 --filter "run_whisper_job"
```

### Filter op error-level

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 100 --filter "@level:error"
```

### Combineren: errors in de laatste 2 uur

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker --since 2h --filter "@level:error"
```

### Cache-hit verificatie (zie ADR-021)

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 200 --filter "CACHE HIT"
```

### API-service logs

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s api -n 100
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s api -n 100 --filter "@level:error"
```

### JSON-output (voor gestructureerde parsing)

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker -n 50 --json
```

### Streaming (live follow)

```bash
railway logs -p 4126c5e1-014c-4773-913f-beff079bc554 -e production -s worker
# Ctrl+C om te stoppen
```

---

## Hoe CC dit gebruikt

Bij debugging:

```bash
source "$HOME/.railway/env"
PROJECT_ID=4126c5e1-014c-4773-913f-beff079bc554

# 1. Recente errors
railway logs -p "$PROJECT_ID" -s worker -n 50 --filter "@level:error"

# 2. Specifieke video traceren
railway logs -p "$PROJECT_ID" -s worker -n 200 --filter "<video_id>"

# 3. Watchdog-activiteit
railway logs -p "$PROJECT_ID" -s worker -n 100 --filter "WATCHDOG"

# 4. Cache-hit rate
railway logs -p "$PROJECT_ID" -s worker --since 1h --filter "CACHE HIT"
```

---

## Persistentie-oordeel

| Wat | Persistent? |
|-----|------------|
| Railway CLI binary (`~/.railway/bin`) | Ja — geïnstalleerd op schijf |
| PATH setup (`~/.bashrc` + `~/.railway/env`) | Ja — per shell automatisch |
| `RAILWAY_API_TOKEN` in `~/.bashrc` | Ja — na eenmalige setup door Khidr |
| Railway account-tokens zelf | Geen verval gedocumenteerd — blijven geldig totdat handmatig ingetrokken |

**Conclusie:** Na de eenmalige setup door Khidr (token genereren + in `~/.bashrc` zetten) kan CC in elke volgende sessie direct logs ophalen zonder verdere actie.

---

## Wat Khidr NIET hoeft te doen per sessie

- Geen `railway login` — token-authenticatie is stateless
- Geen browser-redirect
- Geen opnieuw installeren van de CLI

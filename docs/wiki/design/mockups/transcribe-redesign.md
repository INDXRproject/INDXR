# Mockups — Transcribe afwerking

**Datum:** 2026-07-26
**Status:** Referentie voor implementatie, geen specificatie van waarden
**Hoort bij:** `wiki/design/system.md`, `wiki/architecture/page-structures/free-tool.md`

---

## Hoe je dit bestand gebruikt

Deze mockups zijn referentie voor **hiërarchie, volgorde, groepering en relatieve nadruk**. Meer niet.

**Bindend**
- welke informatie op één scherm bij elkaar hoort
- wat groot moet zijn en wat klein
- waar de primaire actie staat
- welke rol elk element heeft

**Niet bindend, expliciet plaatsvervangend**
- alle kleurwaarden. De blauwtinten zijn placeholders. De echte tokens komen uit het Library-badgecomponent — lees ze daar uit, neem geen hex uit dit bestand over.
- pixelmaten, radii, spacing. Gebruik de tokens uit `system.md` §1 en §2.
- iconen en lettertype.

**Als de codebase iets anders zegt dan deze mockup aanneemt, wint de codebase.** Rapporteer het verschil, forceer de mockup niet.

De HTML-blokken zijn standalone: kopieer een blok naar een `.html`-bestand en open het in een browser om het te bekijken.

---

## Achterliggende regel

Een transcriptiemethode heeft door het hele product één kleur.

- auto-captions = lichtblauw
- AI-transcriptie = donkerblauw/indigo
- groen = uitsluitend gratis, nieuw of gelukt
- rood = uitsluitend onbeschikbaar of fout
- geel komt in deze flow niet voor

Die methodekleur volgt de methode door de hele keten: methodekeuze → playlist-samenvatting → per-videorijen → voortgang → resultaatkaart → Library.

Let op het onderscheid tussen twee assen die Library mogelijk allebei badget:

- **bron** — YouTube-video, playlist, geüpload audiobestand
- **methode** — auto-captions, AI-transcriptie

Alleen de methode-as propageert door de transcribe-flow. Een eventuele eigen kleur voor audio-upload is een bron-badge en blijft waar hij is.

---

## Mockup A — methodekeuze, playlist-bevestiging, voortgang, foutkaart

1. **Methodekeuze.** Radiogroep, geen segmented control. De huidige implementatie heeft dezelfde vorm als de mode-strip erboven, waardoor twee stripjes onder elkaar als twee rijen tabs lezen. Zichtbare radio-indicator, methodekleur als tint plus rand op de geselecteerde kaart. Gestapeld onder `md`.
2. **Playlist-bevestiging.** De drie statkaarten (groen/geel/rood, display-formaat cijfers) worden één kostenbalk met legenda. Titel mag wrappen, primaire actie verhuist naar een actiebalk onderaan de lijstkaart. `Select all` als één checkbox met indeterminate-state in plaats van twee tekstlinks.
3. **Voortgang.** Eén statusoppervlak. De selectielijst verdwijnt tijdens de run; de video's verschijnen als rijen ín de voortgangskaart met per rij een status en de methodebadge.
4. **Foutkaart.** Vaste anatomie voor élke fout, inclusief onbekende codes.

```html
<div style="padding:16px;background:#faf8f4;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#2a2724">
<style>
:root{--surface-0:#f0ece6;--surface-1:#f7f4ef;--surface-2:#fff;--border:#e2ddd5;--border-strong:#c9c2b8;--text-primary:#2a2724;--text-secondary:#5c564e;--text-muted:#8a8279;--font-mono:ui-monospace,monospace}
</style>

<!-- A1 METHODEKEUZE -->
<div style="background:var(--surface-1);border-radius:12px;padding:18px;margin-bottom:16px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">A1 — Methodekeuze. Radio's in plaats van een tweede strip.</div>
  <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Transcription method</div>
  <div style="display:flex;gap:10px;margin-bottom:14px">
    <div style="flex:1;display:flex;gap:10px;padding:12px;border-radius:8px;background:#E3F0FA;border:1.5px solid #7FB3D9">
      <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid #2C6A96;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:#2C6A96"></div></div>
      <div>
        <div style="color:#1F4E6E;font-weight:500;display:flex;align-items:center;gap:6px">Auto-captions <span style="background:#D6EDD6;color:#3B7A3B;font-size:10px;padding:1px 6px;border-radius:4px">FREE</span></div>
        <div style="font-size:12px;color:#3E7CA1;margin-top:2px">Existing captions from YouTube</div>
      </div>
    </div>
    <div style="flex:1;display:flex;gap:10px;padding:12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)">
      <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border-strong);flex-shrink:0;margin-top:2px"></div>
      <div>
        <div style="font-weight:500">AI transcription</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">1 credit per minute</div>
      </div>
    </div>
  </div>
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Mobiel — gestapeld, AI geselecteerd</div>
  <div style="max-width:330px">
    <div style="display:flex;gap:10px;padding:12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);margin-bottom:8px">
      <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border-strong);flex-shrink:0;margin-top:2px"></div>
      <div style="font-weight:500;display:flex;align-items:center;gap:6px">Auto-captions <span style="background:#D6EDD6;color:#3B7A3B;font-size:10px;padding:1px 6px;border-radius:4px">FREE</span></div>
    </div>
    <div style="display:flex;gap:10px;padding:12px;border-radius:8px;background:#DFE7FA;border:1.5px solid #8FA5DE">
      <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid #2F4C9A;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:#2F4C9A"></div></div>
      <div>
        <div style="color:#263F80;font-weight:500">AI transcription</div>
        <div style="font-size:12px;color:#4059A8;margin-top:2px">1 credit per minute · 34 available</div>
      </div>
    </div>
  </div>
</div>

<!-- A2 PLAYLIST-BEVESTIGING -->
<div style="background:var(--surface-1);border-radius:12px;padding:18px;margin-bottom:16px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">A2 — Playlist-bevestiging. Drie statkaarten worden één balk.</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
      <div style="font-weight:500;line-height:1.35">Game of Thrones Season Analysis Series — Complete Breakdown</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:3px">8 videos · 2 h 14 min</div>
    </div>
    <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-bottom:8px">
        <div style="width:62%;background:#7FB3D9"></div><div style="width:38%;background:#5C74C4"></div>
      </div>
      <div style="display:flex;gap:16px;font-size:12px;flex-wrap:wrap;color:var(--text-secondary)">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#7FB3D9;margin-right:6px"></span>5 auto-captions · free</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#5C74C4;margin-right:6px"></span>3 AI transcription · 18 credits</span>
      </div>
    </div>
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
      <div style="width:16px;height:16px;border-radius:4px;background:#BA7517;flex-shrink:0"></div>
      <span style="font-size:13px;color:var(--text-secondary)">Select all</span>
      <span style="font-size:12px;color:var(--text-muted);margin-left:auto">8 of 8 selected</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--border)">
      <div style="width:16px;height:16px;border-radius:4px;background:#BA7517;flex-shrink:0"></div>
      <div style="width:44px;height:26px;border-radius:4px;background:var(--surface-0);flex-shrink:0"></div>
      <div style="min-width:0;flex:1"><div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Why Season 1 of Game of Thrones Is SO GREAT</div><div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">19:13</div></div>
      <div style="background:#E3F0FA;color:#2C6A96;font-size:11px;padding:3px 8px;border-radius:5px;white-space:nowrap">Auto · free</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--border)">
      <div style="width:16px;height:16px;border-radius:4px;background:#BA7517;flex-shrink:0"></div>
      <div style="width:44px;height:26px;border-radius:4px;background:var(--surface-0);flex-shrink:0"></div>
      <div style="min-width:0;flex:1"><div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Why Season 4 of Game of Thrones is THE BEST</div><div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">20:50</div></div>
      <div style="background:#DFE7FA;color:#2F4C9A;font-size:11px;padding:3px 8px;border-radius:5px;white-space:nowrap">AI · 21 cr</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:9px 16px;opacity:.55">
      <div style="width:16px;height:16px;border-radius:4px;border:1.5px solid var(--border-strong);flex-shrink:0"></div>
      <div style="width:44px;height:26px;border-radius:4px;background:var(--surface-0);flex-shrink:0"></div>
      <div style="min-width:0;flex:1"><div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Why Season 6 of Game of Thrones is So Mixed</div><div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">18:02</div></div>
      <div style="background:#FBE6E6;color:#9B3232;font-size:11px;padding:3px 8px;border-radius:5px;white-space:nowrap">Unavailable</div>
    </div>
    <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--surface-1);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="font-size:12px;color:var(--text-muted)">zie mockup B voor de definitieve kostenweergave</div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--text-secondary);display:flex;align-items:center;font-size:13px">Cancel</div>
        <div style="height:38px;padding:0 18px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;font-size:13px">Extract — 18 credits</div>
      </div>
    </div>
  </div>
  <div style="font-size:12px;color:var(--text-muted);margin-top:8px">Op mobiel plakt die onderste balk aan de onderkant van het scherm zolang de lijst zichtbaar is.</div>
</div>

<div style="display:flex;gap:16px;flex-wrap:wrap">
<!-- A3 VOORTGANG -->
<div style="flex:1;min-width:300px;background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">A3 — Tijdens de run. Eén kaart, geen drie statusregels.</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:14px 16px">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
        <span style="font-weight:500">Extracting playlist</span>
        <span style="margin-left:auto;font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">2 / 8 · 0:16</span>
      </div>
      <div style="height:6px;border-radius:3px;background:var(--surface-0);overflow:hidden"><div style="width:25%;height:100%;background:#BA7517"></div></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px">Runs in the background — safe to close this tab.</div>
    </div>
    <div style="border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border)"><span style="color:#3B7A3B">&#10003;</span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Why Season 1 of Game of Thrones Is SO GREAT</span><span style="background:#E3F0FA;color:#2C6A96;font-size:11px;padding:2px 7px;border-radius:5px">Auto</span></div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:13px;border-bottom:1px solid var(--border)"><span style="color:#BA7517">&#9673;</span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Why Season 2 of Game of Thrones is SO GREAT</span><span style="background:#DFE7FA;color:#2F4C9A;font-size:11px;padding:2px 7px;border-radius:5px">AI</span></div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:13px;color:var(--text-muted)"><span>&#9711;</span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Why Season 3 of Game of Thrones is SO AMAZING</span><span style="font-size:11px">Queued</span></div>
    </div>
  </div>
</div>

<!-- A4 FOUTKAART -->
<div style="flex:1;min-width:300px;background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">A4 — Foutkaart. Eén vorm voor elke fout, inclusief onbekende.</div>
  <div style="background:var(--surface-2);border:1px solid #E8B9B9;border-left:3px solid #C05252;border-radius:10px;padding:14px 16px">
    <div style="display:flex;gap:9px;align-items:flex-start">
      <span style="color:#9B3232;flex-shrink:0">&#9888;</span>
      <div style="min-width:0">
        <div style="font-weight:500">This video has no captions</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.5">YouTube has no caption track for this video. AI transcription can still generate one from the audio. No credits were used.</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <div style="height:36px;padding:0 14px;border-radius:8px;background:#BA7517;color:#fff;font-size:13px;font-weight:500;display:flex;align-items:center">Use AI transcription — 13 credits</div>
          <div style="height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--text-secondary);font-size:13px;display:flex;align-items:center">Try another URL</div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:10px;font-family:var(--font-mono)">NO_CAPTIONS_AVAILABLE</div>
      </div>
    </div>
  </div>
  <div style="font-size:12px;color:var(--text-muted);margin-top:10px;line-height:1.55">Onbekende code krijgt dezelfde kaart met neutrale tekst, de code zichtbaar, en een contact-actie. Nooit kale rode tekst, nooit een doodlopend eind.</div>
</div>
</div>
</div>
```

---

## Mockup B — kostenweergave

Corrigeert mockup A: daar stond de prijs van een job als kleinste en grijste element op het scherm. Dat is de verkeerde nadruk voor het getal dat de gebruiker geld kost.

De oorzaak was dat twee vragen op één regel geplet waren. Uit elkaar halen:

- **"Wat kost dit"** hoort bij de kostenopbouw, als grootste getal in dat blok
- **"Kan ik dat betalen"** hoort bij het moment van bevestigen, secundair maar leesbaar
- de knop draagt het bedrag als bevestiging

Bij onvoldoende saldo geen dode disabled-knop, maar de twee echte uitwegen: minder video's kiezen, of bijkopen.

Dezelfde fout zit in de video-modus: daar staat alleen het tarief per minuut, nooit wat déze video kost.

```html
<div style="padding:16px;background:#faf8f4;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#2a2724">
<style>
:root{--surface-0:#f0ece6;--surface-1:#f7f4ef;--surface-2:#fff;--border:#e2ddd5;--border-strong:#c9c2b8;--text-primary:#2a2724;--text-secondary:#5c564e;--text-muted:#8a8279;--font-mono:ui-monospace,monospace}
</style>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">

<div style="flex:1;min-width:300px;background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">B1 — Kostenopbouw. Het totaal is het grootste getal in het blok.</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:14px 16px">
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-bottom:10px">
        <div style="width:62%;background:#7FB3D9"></div><div style="width:38%;background:#5C74C4"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:3px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#7FB3D9;margin-right:7px"></span>5 videos · auto-captions</span><span>free</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:3px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#5C74C4;margin-right:7px"></span>3 videos · AI transcription</span><span>18 credits</span>
      </div>
    </div>
    <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-weight:500">Total</span><span style="font-size:20px;font-weight:600">18 credits</span>
    </div>
    <div style="padding:11px 16px;border-top:1px solid var(--border);background:var(--surface-1);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text-secondary)">You have 34 · 16 left after this</span>
      <div style="margin-left:auto;display:flex;gap:8px">
        <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--text-secondary);display:flex;align-items:center;font-size:13px">Cancel</div>
        <div style="height:38px;padding:0 18px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;font-size:13px">Extract — 18 credits</div>
      </div>
    </div>
  </div>
  <div style="font-size:12px;color:var(--text-muted);margin-top:9px">Bij de knop staat "Once started, this can't be cancelled."</div>
</div>

<div style="flex:1;min-width:280px;background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">B2 — Onvoldoende saldo</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-weight:500">Total</span><span style="font-size:20px;font-weight:600">18 credits</span>
    </div>
    <div style="padding:11px 16px;border-top:1px solid var(--border);background:var(--surface-1);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:#9B3232">6 credits short — you have 12</span>
      <div style="margin-left:auto;display:flex;gap:8px">
        <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--text-secondary);display:flex;align-items:center;font-size:13px">Deselect some</div>
        <div style="height:38px;padding:0 18px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;font-size:13px">Buy credits</div>
      </div>
    </div>
  </div>
  <div style="font-size:12px;color:var(--text-muted);margin:16px 0 10px">B3 — Mobiel, sticky onderaan</div>
  <div style="max-width:300px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
      <span style="font-weight:500;font-size:13px">Total</span><span style="font-size:19px;font-weight:600">18 credits</span>
    </div>
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">You have 34 · 16 left after this</div>
    <div style="height:44px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;justify-content:center;font-size:14px">Extract — 18 credits</div>
  </div>
</div>
</div>

<div style="background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">B4 — Video-modus. Nu staat er alleen het tarief, nooit wat déze video kost.</div>
  <div style="max-width:520px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="width:56px;height:32px;border-radius:5px;background:var(--surface-0);flex-shrink:0"></div>
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Brazil's Top Ufologist Rony Vernet Opens Up on UFOs</div>
        <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">91:24</div>
      </div>
      <span style="background:#DFE7FA;color:#2F4C9A;font-size:11px;padding:3px 8px;border-radius:5px;white-space:nowrap">AI transcription</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:11px;border-top:1px solid var(--border);margin-bottom:11px">
      <span style="font-weight:500">Total</span><span style="font-size:20px;font-weight:600">92 credits</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text-secondary)">You have 34 · 58 short</span>
      <div style="margin-left:auto;height:38px;padding:0 18px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;font-size:13px">Buy credits</div>
    </div>
  </div>
  <div style="font-size:12px;color:var(--text-muted);margin-top:9px;line-height:1.55">Onzeker: of de duur al bekend is vóór de credit-reservering. Zo niet, dan verschijnt dit blok pas na de check. Uitzoeken in de codebase, niet aannemen.</div>
</div>
</div>
```

---

## Open onzekerheden — OPGELOST (2026-07-26, ADR-080)

Geverifieerd in de codebase:

1. **Heeft Library een eigen badge/kleur voor geüploade audiobestanden?** Nee. `TranscriptList.tsx`'s `transcriptBadges` kent één methode-badge per transcript: `processing_method === 'youtube_captions'` → Auto-captions (sky), anders → AI Transcription (indigo). Een upload heeft geen `youtube_captions`-methode en valt dus in de **indigo AI-badge**. Er is **geen aparte bron-badge** voor audio-upload. → Audio-modus gebruikt indigo.
2. **Is de duur bekend vóór de reservering in de video-modus?** De duur wordt opgehaald via `/api/video/metadata/${videoId}` **bij de klik op Extract (AI)** (`VideoTab.tsx:506-524`), niet bij het plakken van de URL. De reservering gebeurt daarná (bij bevestiging). → Het concrete totaal (B4) verschijnt in de **bevestigingsstap** (post-klik, pré-reservering), niet eerder — zonder een proactieve metadata-call per toetsaanslag toe te voegen.
3. **Heeft de voortgangskaart de per-video status al lokaal?** Ja. `PlaylistManager` krijgt `videoStatuses` (per-video) en `receipt` (credit-afrekening) al als **props**. Per-video rijen in de voortgangskaart + de afrondingsbon zijn dus pure presentatie — **geen verplaatsing van job-state**.


---

## Mockup C — playlist-afrondingsscherm

Corrigeert het live scherm. Wat daar misgaat:

- de hele kaart is groen getint terwijl 4 van de 21 video's mislukt zijn; groen voor een gedeeltelijke mislukking is niet eerlijk
- "Extraction Complete!" met uitroepteken viert iets wat niet af is
- dezelfde mislukking staat drie keer uitgelegd: in de samenvattingszin, in het gele waarschuwingsblok, en in de kop van de retry-lijst
- "View in Library" staat er twee keer
- de creditregel — inclusief een terugstorting — is de kleinste tekst op het scherm, als één doorlopende zin
- de oude selectielijst staat er nog onder met "0 of 21 selected", stale state na afronding
- BLOCKED-badges zijn amber, dezelfde kleur als de primaire knop
- "BLOCKED" in de retry-kaart en "TEMPORARILY BLOCKED" in de lijst eronder zijn twee labels voor hetzelfde

### Anatomie

1. **Kop** — neutraal zolang er iets mislukt is: "17 of 21 videos transcribed", eronder de doorlooptijd en het aantal mislukkingen. Alleen bij 100% succes een groen vinkje en "All 21 videos transcribed".
2. **Bon** — kostenbalk met de methodesplitsing plus een rode segment voor niet-opgehaalde video's, legenda met bedragen rechts, en daaronder de totaalregel "Charged — 15 credits" op ~20px. De terugstorting is een eigen regel, geen bijzin.
3. **Mislukking** — één blok: kop, één uitleg, de lijst met mislukte titels zonder per-rij knop, en één primaire actie "Retry all N — N credits" met de saldoregel ernaast.
4. **Acties** — "Start new extraction" secundair links, "View N in Library" rechts. Bij gedeeltelijk succes is View secundair want Retry is de logische volgende stap; bij volledig succes is View primair.

### Productbeslissing

Per-video Retry-knoppen vervallen. Alleen "Retry all N".

Rationale: de mislukte video's zijn video's die de gebruiker al had geselecteerd en waarvoor hij al wilde betalen; de credits zijn bij de skip teruggestort. Retry-all rekent dus precies af wat hij toch al van plan was. Het granulaire geval — je wilt maar één van de vier — is theoretisch, want dan had je hem vooraf gedeselecteerd. Levert bovendien één schoon telemetrie-event per ronde in plaats van losse kliks.

Na twee mislukte retry-rondes verdwijnt de knop en verandert de tekst in de uitleg dat YouTube deze playlist momenteel blokkeert, met Audio Upload als alternatief. Geen derde ronde — anders draait iemand credits rond zonder resultaat.

### Mobiel

Identieke volgorde, alles full-width gestapeld, actieknoppen onderaan over de volle breedte, retry-lijst maximaal vijf rijen met "show all".

```html
<div style="padding:16px;background:#faf8f4;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#2a2724">
<style>
:root{--surface-1:#f7f4ef;--surface-2:#fff;--border:#e2ddd5;--border-strong:#c9c2b8;--text-primary:#2a2724;--text-secondary:#5c564e;--text-muted:#8a8279}
</style>
<div style="display:flex;gap:16px;flex-wrap:wrap">

<div style="flex:1;min-width:330px;background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">C1 — Gedeeltelijk. Neutrale kop, geen groen, geen uitroepteken.</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
      <div style="font-size:17px;font-weight:600">17 of 21 videos transcribed</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">Finished in 10:32 · 4 could not be fetched</div>
    </div>
    <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-bottom:10px">
        <div style="width:57%;background:#7FB3D9"></div><div style="width:24%;background:#5C74C4"></div><div style="width:19%;background:#E3B7B7"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:2px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#7FB3D9;margin-right:7px"></span>12 auto-captions</span><span>12 credits</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:2px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#5C74C4;margin-right:7px"></span>5 AI transcription</span><span>3 credits</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#9B3232;padding:2px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#E3B7B7;margin-right:7px"></span>4 not fetched</span><span>3 credits refunded</span></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:10px;margin-top:8px;border-top:1px solid var(--border)">
        <span style="font-weight:500">Charged</span><span style="font-size:20px;font-weight:600">15 credits</span></div>
    </div>
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--surface-1)">
      <div style="font-weight:500;margin-bottom:4px">4 videos could not be fetched</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:11px">YouTube rate-limited these during extraction. An automatic retry already failed once. Retrying now uses a fresh connection.</div>
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:12px">
        <div style="padding:7px 12px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Psychology of JAIME LANNISTER | therapist breaks down</div>
        <div style="padding:7px 12px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">CATELYN STARK is NOT terrible | Therapist breaks down</div>
        <div style="padding:7px 12px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">the moment that RUINED Daenerys in Game of Thrones</div>
        <div style="padding:7px 12px;font-size:13px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Joffrey is the BEST character in Game of Thrones, ok?</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:13px;color:var(--text-secondary)">You have 15 · 11 left after this</span>
        <div style="margin-left:auto;height:38px;padding:0 16px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;font-size:13px">Retry all 4 — 4 credits</div>
      </div>
    </div>
    <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap">
      <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--text-secondary);display:flex;align-items:center;font-size:13px">Start new extraction</div>
      <div style="margin-left:auto;height:38px;padding:0 16px;border-radius:8px;border:1px solid var(--border-strong);font-weight:500;display:flex;align-items:center;font-size:13px">View 17 in Library</div>
    </div>
  </div>
</div>

<div style="flex:1;min-width:300px;background:var(--surface-1);border-radius:12px;padding:18px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">C2 — Volledig geslaagd. Hier mag groen wel.</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">
      <span style="color:#3B7A3B;font-size:18px">&#10003;</span>
      <div><div style="font-size:17px;font-weight:600">All 21 videos transcribed</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">Finished in 12:04</div></div>
    </div>
    <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-bottom:10px">
        <div style="width:71%;background:#7FB3D9"></div><div style="width:29%;background:#5C74C4"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:2px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#7FB3D9;margin-right:7px"></span>15 auto-captions</span><span>15 credits</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:2px 0">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#5C74C4;margin-right:7px"></span>6 AI transcription</span><span>4 credits</span></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:10px;margin-top:8px;border-top:1px solid var(--border)">
        <span style="font-weight:500">Charged</span><span style="font-size:20px;font-weight:600">19 credits</span></div>
    </div>
    <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap">
      <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);color:var(--text-secondary);display:flex;align-items:center;font-size:13px">Start new extraction</div>
      <div style="margin-left:auto;height:38px;padding:0 18px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;font-size:13px">View 21 in Library</div>
    </div>
  </div>
</div>

</div>
</div>
```


---

## Mockup D — bevestigings-, voortgangs- en afrondingskaart (video-modus)

**Datum:** 2026-07-27
**Aanleiding:** deze drie kaarten zijn gebouwd uit prozabeschrijvingen in plaats van uit een mockup. Dat is zichtbaar: op 390px lopen knoppen uit het scherm, staat de metaregel als één lange run-on, en leest de voortgangskaart als een formulier-wizard.

Zelfde regels als mockup A t/m C: bindend voor hiërarchie en volgorde, niet voor kleurwaarden of pixelmaten.

### Bevestigen

- titel over twee regels, daaronder duur en methodebadge op één regel
- totaalregel ongewijzigd (label links, bedrag ~20px rechts)
- footer op mobiel: saldoregel, dan de Extract-knop **full width**, dan de onomkeerbaarheidsregel eronder, dan Cancel als tekstlink gecentreerd
- geen rechtsuitlijning van knoppen op mobiel — dat is wat de huidige rommel maakt

### Voortgang

- kop = de huidige fase ("Downloading audio"), niet "Transcribing…" als vaste titel
- voortgangsbalk toont **echte** voortgang met bytes eronder ("19.2 MB of 50.4 MB") tijdens de downloadfase
- de vier stappen worden één compacte regel met vinkje / gevulde stip / open stip — geen genummerde bolletjes, die lezen als een formulier-wizard
- één korte achtergrondregel onderaan

### Afronding

- kop met vinkje + "Transcript ready"
- meta in **twee** regels op mobiel: "69 min · 689 lines" en "69 credits · done in 4:01"
- acties mobiel: Copy en Export naast elkaar, elk halve breedte; **View in Library als tekstlink** eronder — drie knoppen passen niet op 390px
- acties desktop: alle drie op één rij rechts van de kop
- Reader Mode wordt één woord ("Timestamps") met de schakelaar rechts, in een dunne rij met scheidingslijn. Geen tweede regel uitleg.

```html
<div style="padding:16px;background:#faf8f4;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#2a2724">
<style>
:root{--surface-0:#f0ece6;--surface-1:#f7f4ef;--surface-2:#fff;--border:#e2ddd5;--border-strong:#c9c2b8;--text-primary:#2a2724;--text-secondary:#5c564e;--text-muted:#8a8279;--font-mono:ui-monospace,monospace}
</style>
<div style="display:flex;gap:14px;flex-wrap:wrap">

<div style="width:320px;background:var(--surface-1);border-radius:12px;padding:14px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">D1 — Bevestigen, 390px</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:12px 14px;border-bottom:1px solid var(--border)">
      <div style="font-size:14px;line-height:1.35">100% Free Software: Digital Privacy for Everyone</div>
      <div style="margin-top:5px;display:flex;align-items:center;gap:8px">
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">69:00</span>
        <span style="background:#DFE7FA;color:#2F4C9A;font-size:11px;padding:2px 7px;border-radius:5px">AI transcription</span>
      </div>
    </div>
    <div style="padding:11px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-weight:500">Total</span><span style="font-size:20px;font-weight:600">69 credits</span>
    </div>
    <div style="padding:12px 14px;background:var(--surface-1)">
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:9px">You have 223 · 154 left after this</div>
      <div style="height:44px;border-radius:8px;background:#BA7517;color:#fff;font-weight:500;display:flex;align-items:center;justify-content:center;font-size:14px">Extract — 69 credits</div>
      <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:7px">Once started, this can't be cancelled</div>
      <div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-top:9px;text-decoration:underline">Cancel</div>
    </div>
  </div>
</div>

<div style="width:320px;background:var(--surface-1);border-radius:12px;padding:14px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">D2 — Voortgang met echte download-voortgang</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px">
    <div style="display:flex;align-items:baseline;margin-bottom:8px">
      <span style="font-weight:500">Downloading audio</span>
      <span style="margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">0:11</span>
    </div>
    <div style="height:6px;border-radius:3px;background:var(--surface-0);overflow:hidden"><div style="width:38%;height:100%;background:#BA7517"></div></div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);margin-top:6px">19.2 MB of 50.4 MB</div>
    <div style="display:flex;gap:14px;margin-top:12px;padding-top:11px;border-top:1px solid var(--border);font-size:12px;flex-wrap:wrap">
      <span style="color:var(--text-muted)"><span style="color:#3B7A3B">&#10003;</span> Queued</span>
      <span><span style="color:#BA7517">&#9673;</span> Downloading</span>
      <span style="color:var(--text-muted)">&#9711; Transcribing</span>
      <span style="color:var(--text-muted)">&#9711; Saving</span>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:11px">Runs in the background — safe to close this tab.</div>
  </div>
</div>

<div style="width:320px;background:var(--surface-1);border-radius:12px;padding:14px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">D3 — Afronding, 390px</div>
  <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:13px 14px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#3B7A3B;font-size:17px">&#10003;</span>
        <span style="font-size:16px;font-weight:600">Transcript ready</span>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:5px">69 min · 689 lines</div>
      <div style="font-size:13px;color:var(--text-muted)">69 credits · done in 4:01</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <div style="flex:1;height:40px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:13px">Copy</div>
        <div style="flex:1;height:40px;border-radius:8px;background:#BA7517;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500">Export</div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:10px;text-decoration:underline">View in Library &rarr;</div>
    </div>
    <div style="padding:9px 14px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface-1);display:flex;align-items:center">
      <span style="font-size:13px;color:var(--text-secondary)">Timestamps</span>
      <span style="margin-left:auto;width:36px;height:20px;border-radius:10px;background:var(--surface-0);border:1px solid var(--border-strong);position:relative"><span style="position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--border-strong)"></span></span>
    </div>
    <div style="padding:12px 14px;font-size:13px;color:var(--text-secondary);line-height:1.6">Okay, so my name is Mathieu and I'm from this organization…</div>
  </div>
</div>

</div>

<div style="background:var(--surface-1);border-radius:12px;padding:16px;margin-top:14px">
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">D4 — Afronding desktop, alles op één rij</div>
  <div style="max-width:600px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="color:#3B7A3B;font-size:18px">&#10003;</span>
      <div>
        <div style="font-size:16px;font-weight:600">Transcript ready</div>
        <div style="font-size:13px;color:var(--text-muted)">69 min · 689 lines · 69 credits · done in 4:01</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;font-size:13px">Copy</div>
        <div style="height:38px;padding:0 16px;border-radius:8px;background:#BA7517;color:#fff;display:flex;align-items:center;font-size:13px;font-weight:500">Export</div>
        <div style="height:38px;padding:0 14px;border-radius:8px;border:1px solid var(--border-strong);display:flex;align-items:center;font-size:13px">View in Library</div>
      </div>
    </div>
    <div style="padding:9px 16px;border-top:1px solid var(--border);background:var(--surface-1);display:flex;align-items:center">
      <span style="font-size:13px;color:var(--text-secondary)">Timestamps</span>
      <span style="margin-left:auto;width:36px;height:20px;border-radius:10px;background:var(--surface-0);border:1px solid var(--border-strong);position:relative"><span style="position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--border-strong)"></span></span>
    </div>
  </div>
</div>
</div>
```

### Openstaand, buiten de frontend

De echte download-voortgang (D2) vereist dat de backend de bytes naar de jobrij schrijft. yt-dlp's progress-hook heeft die data al — hij wordt gebruikt voor de deadline-check — maar er wordt niets weggeschreven. Zonder dat kan de frontend alleen een onbepaalde balk tonen.

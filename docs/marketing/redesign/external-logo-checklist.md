# Oude logo buiten de repo: checklist voor Khidr (2026-11-06)

Het nieuwe logo (L2) en de stijl-B-afbeeldingen staan in de repo. De plekken hieronder kan alleen Khidr bijwerken: ze zitten achter jouw accounts, en wachtwoorden en accountinstellingen zijn voor Claude verboden terrein.

**Bestanden om te uploaden** (alles in `apps/marketing/public/`, ook live op `https://indxr.ai/...`):
| Waarvoor | Bestand |
|---|---|
| Vierkant icoon / avatar (wit vlak) | `logo/indxr-mark-black-on-white.png` (354×354) · groter: `web-app-manifest-512x512.png` (512×512) |
| Vierkant icoon, donker | `logo/indxr-mark-white-on-black.png` |
| Horizontaal logo, licht | `logo/indxr-horizontal-black-on-white.png` · transparant: `logo/indxr-horizontal-black-transparent.png` |
| Horizontaal logo, donker | `logo/indxr-horizontal-white-on-black.png` |
| Vectorbestanden (tekst als paden) | `logo/indxr-mark-black-transparent.svg`, `logo/indxr-horizontal-black-transparent.svg` |
| Banner / deelafbeelding 1200×630 | `og-default.jpg` |
| Merkkleur | amber `#FFB000`, inkt `#111111` |

## Checklist
- [ ] **Stripe:** Dashboard → Settings → Branding. Icoon = `web-app-manifest-512x512.png`, logo = `logo/indxr-horizontal-black-on-white.png`, merkkleur `#FFB000`, accentkleur `#111111`. (De pakketafbeeldingen in Checkout zijn al vervangen via de repo.)
- [ ] **Google OAuth-toestemmingsscherm:** Google Cloud Console → APIs & Services → OAuth consent screen → App logo, vierkant, 120×120 px aanbevolen → `web-app-manifest-512x512.png`. Let op: een nieuw logo kan een herverificatie door Google vragen, waarna het scherm tijdelijk zonder logo staat.
- [ ] **AlternativeTo** (alternativeto.net/software/indxr-ai): icoon = `logo/indxr-mark-black-on-white.png`, screenshots vervangen door de nieuwe home/bibliotheek. Bruikbaar als screenshot: `docs/marketing/producthunt/gallery/01–05.png`.
- [ ] **Product Hunt** (product @sinbadbuilds, draft "INDXR"): thumbnail = `web-app-manifest-512x512.png`. Galerij: `docs/marketing/producthunt/gallery/01–05.png` (uploaden zodra je akkoord geeft; Claude kan dat ook doen).
- [ ] **X-profiel:** avatar = `logo/indxr-mark-black-on-white.png` (rond bijgesneden, het merk valt binnen de cirkel), header = `og-default.jpg` (X wil 1500×500; bij bijsnijden blijft de kop leesbaar).
- [ ] **YouTube-kanaal:** profielfoto = `web-app-manifest-512x512.png`; banner 2560×1440 met een veilige zone van 1546×423 in het midden. Die banner bestaat nog niet: vraag Claude om er een te maken.

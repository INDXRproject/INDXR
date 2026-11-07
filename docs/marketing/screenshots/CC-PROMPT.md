# Prompt voor Claude Code op de laptop: demo-account + marketing-screenshots (2026-11-07, ronde 2)

Waarom op de laptop: de schermafbeeldingen vanuit de cloud-sessie komen maar 1092 px breed uit Chrome, en dat is te klein voor Product Hunt en de site. Playwright op de laptop maakt ze scherp (2×). Daarnaast staan daar de service-role-sleutels al in `.env.local`, die de cloud-sessie niet heeft.

Kopieer alles tussen de lijnen in Claude Code (in de map `INDXR.AI V2`).

---

Eerst `git pull` (de app heeft sinds ronde 1 een nieuwe werkbalk en een bronkaart). Maak een schone demo-bibliotheek in een apart intern account en maak daarvan marketing-screenshots met Playwright. Raak het account van Khidr niet aan: je mag het alleen lezen als bron.

**1. Demo-account**
- Maak `demo@indxr.ai` aan via `admin.createUser`, met `email_confirm: true` en `profiles.is_internal = true`, op dezelfde manier als de e2e-pool in `tests/playwright/helpers/provision.ts`.
- Genereer het wachtwoord per run en bewaar het nergens duurzaam, net als bij de e2e-pool. Zet het ook bij een bestaand account opnieuw (het vorige wachtwoord stond in een terminal-log). Toon het nergens in je output.
- Bestaat het account al, hergebruik het dan en zet de staat terug: verwijder de transcripten en collecties van dit account.

**2. Inhoud kopiëren**
- Neem de transcripten (captions) uit het account van Khidr met deze video_id's. Zoek het account op als eigenaar van video_id `kBdfcR-8hEY`.
- Lees alleen: kopieer de rijen naar het demo-account. Wijzig of verwijder niets bij Khidr.
- Gebruik deze collecties en korte titels:

  | Collectie | Video's en titels |
  |---|---|
  | `PHIL 101 · Justice (Sandel)` | kBdfcR-8hEY → "Justice 01 — The Moral Side of Murder"<br>0O2Rq4HJBxw → "Justice 02 — Putting a Price Tag on Life"<br>Qw4l1w0rkjs → "Justice 03 — Free to Choose"<br>MGyygiXMzRk → "Justice 04 — This Land Is My Land"<br>8yT4RZy1t3s → "Justice 05 — Hired Guns"<br>8rv-4aUbZxQ → "Justice 06 — Mind Your Motive" |
  | `PHIL 176 · Death (Kagan)` | p2J7wSuFRl8 → "Death 01 — Course Introduction"<br>gh-6HyTRNNY → "Death 02 — Dualism vs. Physicalism"<br>GR63MMAi-fs → "Death 03 — Arguments for the Soul, I"<br>AGXYeV2v5fU → "Death 04 — Plato's Phaedo" |
  | `HIST 210 · Early Middle Ages` | ZC8JcWVRFp8 → "Middle Ages 01 — Rome's Greatness and First Crises"<br>2B9b9mUPJik → "Middle Ages 02 — The Crisis of the Third Century"<br>tcIuAJ-jaSg → "Middle Ages 03 — Constantine and the Early Church"<br>gzibwdsl_SI → "Middle Ages 04 — The Christian Roman Empire"<br>KiPJq7-5lH4 → "Middle Ages 05 — St. Augustine's Confessions" |

- Zet `viewed_at` op alle rijen, zodat er geen "ongelezen"-stippen in beeld staan.
- Wijs het demo-account 20 interne credits toe via de bestaande admin-route `add-credits`, met de reden "demo screenshots".
- Genereer via de gewone UI één AI-samenvatting, voor "Justice 01". Dat kost 6 credits en ongeveer een cent aan API-kosten.

**3. Screenshots**
- Gebruik Playwright tegen `https://app.indxr.ai`, ingelogd als `demo@indxr.ai`, in licht thema. Accepteer of weiger eerst de cookiebanner, zodat hij niet in beeld staat.
- Desktop: 1440×900 met `deviceScaleFactor: 2`. Mobiel: `devices['iPhone 14']`.
- Sla alles op in `docs/marketing/screenshots/2026-11/`:
  1. `library-all.png`: All Transcripts, met de 3 collecties zichtbaar in de zijbalk.
  2. `library-collection.png`: de collectie PHIL 101.
  3. `library-search.png`: zoeken op `trolley`. De treffer komt uit de tekst, niet uit de titel.
  4. `transcript-timestamps.png`: "Justice 01", weergave Timestamps (tijd in de marge).
  5. `transcript-paragraphs.png`: dezelfde pagina, weergave Paragraphs.
  6. `summary.png`: het tabblad Summary van "Justice 01".
  7. `export-menu.png`: "Justice 01" met het Export-menu open.
  8. `dashboard-home.png`: Home.
  9. `transcribe-youtube.png`: Transcribe → YouTube, met de URL van Justice 07 (`KqzW0eHzDSQ`) ingevuld. Niet op Extract klikken.
  10. `mobile-library.png` en `mobile-transcript.png`: mobiel, bibliotheek en "Justice 01".
  11. `transcript-source-card.png`: desktop, "Justice 01", met rechts de bronkaart (thumbnail, gegevens, citaat met datum 2009).
  12. `mobile-transcript-toolbar.png`: mobiel, "Justice 01", ingezoomd op titel + bronregel + werkbalk.
- Overschrijf de PNG's van ronde 1 (die tonen nog de oude werkbalk).
- Controleer elke afbeelding door hem te openen: geen cookiebanner, geen laadstatus, geen foutmelding, geen zinnen die midden in een regel afbreken, en op mobiel niets dat buiten het scherm valt.

**4. Afronden — de cloud-Claude moet erbij kunnen**
- De PNG's staan in `docs/marketing/screenshots/2026-11/` in de repo. Daar leest de cloud-sessie ze uit via `git pull`. Zet ze dus nergens anders neer, ook niet in `test-results/` of `/tmp`.
- Geen PNG groter dan 5 MB. Comprimeer anders met `pngquant` of `sharp`.
- Commit de PNG's plus dit script als `scripts/marketing-screenshots.ts`, zodat het later opnieuw kan draaien.
- **Push naar `master`.** Zonder push ziet de cloud-Claude niets.
- Rapporteer de commit-hash en de lijst met bestanden.

---

Daarna haalt Claude (cloud) de bestanden op en zet ze op Product Hunt (galerijkaart 3 en verder), AlternativeTo en de site.

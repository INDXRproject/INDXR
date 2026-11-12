# CC-prompt: INDXR-bronnen in Zotero + meerdere citatiestijlen (12-11, AKKOORD Khidr 12-11 avond: fase 1 en 2)

Idee meerdere stijlen: Khidr. Zotero-koppeling: n.a.v. Obsidian-forumonderzoek 12-11 (`docs/marketing/community/obsidian-forum.md`).

---

**Doel.** Onderzoekers en studenten bewaren hun bronnen in Zotero en citeren vandaar (in Word, Google Docs, Obsidian via Pandoc). Een INDXR-bron (YouTube-video of eigen opname) moet daar met één klik in kunnen, met de link en de tijdstempels, en INDXR zelf moet naast APA ook MLA, Chicago en Harvard kunnen geven. Nu bestaat alleen een APA-tekstregel (`buildCitation` in SourceCard, port in `backend/mcp_server.py`); er is geen BibTeX/RIS/CSL-JSON (grep = 0).

**Fase 1: bestanden en stijlen (geen accounts, geen secrets).**
1. Eén bron van waarheid voor brongegevens als **CSL-JSON** per transcript: type `motion_picture` (YouTube) of `song`/`interview` — kies het CSL-type dat in Zotero als *Video Recording* resp. *Audio Recording* binnenkomt en verifieer dat in Zotero zelf. Velden: titel, kanaal als auteur, publicatiedatum, URL, duur, medium, toegangsdatum.
2. Citaten via **citeproc-js** met de officiële CSL-stijlen APA 7, MLA 9, Chicago (author-date), Harvard. Vervangt `buildCitation` in SourceCard (stijlkeuze onthouden per gebruiker) en in MCP `get_source` (optionele `style`-parameter, default APA; bestaande output voor APA mag inhoudelijk niet verslechteren — vergelijk met de huidige tests/fixtures).
3. Exports per transcript én per collectie: `.ris`, `.bib` (BibLaTeX, `@video`/`@audio` of `@misc` — kies wat Zotero, Pandoc en de Obsidian-Citations-plugin correct inlezen) en CSL-JSON.
4. Markdown-export: `citekey` (stabiel, uniek per gebruiker, bv. `kanaaljaartitelwoord`) in de YAML-frontmatter, zodat `[@citekey]` in Obsidian/Pandoc werkt.
5. Zotero Connector: zet op de transcriptpagina in de app `citation_*`-metatags (Zotero "Exposing your metadata"), zodat de Zotero-browserextensie de bron herkent.

**Fase 2: "Send to Zotero" (direct koppelen).** Gebruiker koppelt zijn Zotero-account (Zotero OAuth 1.0a key exchange, write-rechten, alleen eigen bibliotheek). Knop per transcript en per collectie: maakt het item aan via de Zotero Web API v3 (write requests), INDXR-collectie → Zotero-collectie, met als child-note de link naar het transcript en de hoofdstukken/tijdstempels. Opnieuw sturen = bijwerken, geen duplicaat (bewaar Zotero-item-key per transcript). Token versleuteld opgeslagen, alleen backend, intrekbaar ("Disconnect Zotero"). Nieuwe tabel → migratie met 14-cijferige prefix, RLS aan.

**Niet aanraken:** credits, Stripe, playlist-limieten. Geen financieel pad.

**Verificatie (bewijs in je rapport):**
- Fase 1: een echt transcript uit de testaccount exporteren als .ris, .bib en CSL-JSON; alle drie importeren in een echte Zotero (desktop) en laten zien dat type, titel, auteur, datum en URL kloppen (screenshot of Zotero-export terug). Dezelfde bron in APA/MLA/Chicago/Harvard naast de verwachte vorm uit de officiële stijlgids. Markdown-export met citekey in een Obsidian-vault + Pandoc: `[@citekey]` rendert tot een citaat + literatuurlijst. MCP `get_source` met en zonder `style`. `pnpm build` groen.
- Fase 2: testaccount koppelt een Zotero-testaccount, stuurt een transcript en een collectie, stuurt opnieuw (geen duplicaat), koppelt los (token weg). Laat de items via de Zotero API zien.
- Wiki: credit-system niet geraakt; werk `architecture/` en `product-gaps-2026-11-04.md` (gat 3) bij; ADR voor CSL-JSON als bron + Zotero-koppeling.

Commit en push zelf per fase; verifieer deploy groen; rapporteer commit-hash + deploy-status.

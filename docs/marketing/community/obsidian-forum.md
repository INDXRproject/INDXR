# Obsidian-forum (forum.obsidian.md): wat we leren en waar sinbadbuilds reageert

Account: `sinbadbuilds` (login contact@indxr.ai, Khidr). Claude leest het forum via WebFetch (`/latest`, `/c/knowledge-management/6`, topic-pagina's). Zoeken, tags en `/guidelines` zijn geblokkeerd voor Claude (robots).

## Waar het gesprek zit
- **Knowledge management** (`/c/knowledge-management/6`): werkwijzen, onderzoeksnotities, LLM's op je vault. Beste plek om mee te praten.
- **Help** (`/c/get-help/19`): concrete vragen, vaak Zotero/plugins.
- **Share & showcase** (`/c/share-showcase/9`): hier hoort een eigen tool thuis (plugins, workflows). Pas als sinbadbuilds een tijd behulpzaam meedoet, en dan als werkwijze-post ("how I get lectures into my vault"), niet als advertentie. Lees eerst zelf de forumregels (Claude kan `/guidelines` niet openen).

## Hoe Obsidian-gebruikers citeren (onderzoek 12-11)
- **Zotero is de norm.** Plugin "Zotero Integration" ±495.000 downloads, "Citations" ±242.000, "Zotero Citations" ±5.900. Ter vergelijking: "YTranscript" (YouTube-transcripten) ±57.000. Er zijn dus veel meer Obsidian-gebruikers met Zotero dan met YouTube-transcripten.
- **De keten:** Zotero → plugin Better BibTeX → een `.bib`-bestand (of CSL-JSON) → in Obsidian een plugin die daaruit kiest → in de tekst een citekey als `[@kagan2007]` → bij export maakt Pandoc er een citaat en literatuurlijst van, in elke stijl.
- **.bib = BibTeX:** een tekstbestand met per bron een blok (`@misc{kagan2007, author=..., title=..., url=..., year=...}`). Oud (LaTeX), maar de lingua franca. CSL-JSON is het modernere broertje (Zotero, Pandoc, citeproc-js).
- **Stijlen:** CSL kent meer dan 10.000 citatiestijlen (APA, MLA, Chicago, Harvard, ...). Wie CSL-data levert, krijgt alle stijlen gratis via citeproc.
- **Eén voorbeeld van pijn (geen patroon bewezen):** draad 113012, na Zotero 8 werkten citekeys niet meer; workaround: hele bibliotheek handmatig naar `.bib`.
- **Let op:** downloads zijn cumulatief en geen actieve gebruikers; alleen een ruwe vergelijking.
- **Video's:** APA 7 citeert een quote uit video/audio met tijdstempel in plaats van pagina (`(Kagan, 2007, 23:14)`).
- Gevolg voor INDXR: zie product-gat 3 in `docs/wiki/roadmap/product-gaps-2026-11-04.md`.

## Draden (nieuwste onderaan)
- 12-11 Ibis (citatiepicker) — https://forum.obsidian.md/t/how-i-add-citations-to-my-obsidian-notes/121851
- 12-11 onderzoeksnotities na een project — https://forum.obsidian.md/t/what-do-you-do-with-research-notes-once-a-project-is-finished/120011
Concepten: `drafts/2026-11-12.md`.

# INBOX — Binnenkomende taken voor Claude Code

---

## Openstaande items uit vorige sessie (2026-04-16)

De grote SEO/content-batch is afgerond. Zeven kleine taken zijn blijven liggen:

1. **`public/llms.txt` aanmaken** — inhoud staat in de oude INBOX (§3A). Korte beschrijving van wat INDXR.AI doet, prijzen, RAG JSON, key pages, en wat het niet doet.

2. **`public/robots.txt` aanmaken / bijwerken** — inhoud staat in de oude INBOX (§3B). Allow alle AI-bots (ClaudeBot, GPTBot, PerplexityBot), disallow CCBot en Meta-ExternalAgent, disallow /api/ /dashboard/ /admin/.

3. **`docs/wiki/business/seo-content-plan.md` aanmaken** — gebruik `docs/wiki/business/INDXR-SITEMAP.md` als bronbestand. 32 pagina's, 8 categorieën, prioriteitsvolgorde voor implementatie.

4. **`docs/wiki/business/writing-framework.md` aanmaken** — gebruik `docs/wiki/business/INDXR-WRITING-FRAMEWORK.md` als bronbestand. Tone, pagina-anatomie, verplichte elementen, verboden formuleringen.

5. **ADR-015 bijwerken** (`docs/wiki/decisions/015-rag-json-export.md`) — definitieve RAG JSON spec toevoegen: schema met `version`, `chunking_config`, chunk-velden incl. `chapter_title` en `start_time_formatted`. Configureerbare chunk-groottes 30s/60s/90s/120s. UX: toggle per tab, inline waarschuwing bij auto-captions. Pricing: 1 credit per 15 min, eerste 3 exports gratis.

6. **`docs/wiki/roadmap/backlog.md` bijwerken** — export-optimalisaties toevoegen als concrete taken: JSON `offset→start` + `end` + metadata wrapper, Markdown YAML frontmatter, CSV segment_index/end_time/word_count + UTF-8 BOM, SRT/VTT resegmentatie 3-7s/42-chars, TXT filler-word removal toggle.

7. **`docs/wiki/roadmap/priorities.md` bijwerken** — Stripe checkout/route.ts bijwerken met nieuwe prijzen (Starter €2.99/150cr, Basic €6.99/500cr, Plus €13.99/1200cr, Pro €27.99/2800cr, Power €54.99/6000cr) staat als hard blocker in known-issues maar moet ook zichtbaar zijn in priorities.

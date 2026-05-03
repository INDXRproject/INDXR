# INBOX — Binnenkomende taken voor Claude Code

---

**[2026-05-03 — Werksessie A2 — Server/Client verificatie]**

**`/pricing` heeft geen metadata export — mogelijke SEO impact**

`src/app/pricing/page.tsx` is een `"use client"` component. Next.js metadata exports (`export const metadata`) werken niet in client components — ze worden genegeerd. Dit betekent dat `/pricing` geen eigen `<title>`, `<description>`, OG-tags, of JSON-LD heeft; het erft de root layout fallback ("INDXR.AI - YouTube Transcript Extractor").

Voor een pagina met Stripe product-informatie is dit suboptimaal — een `Offer` schema, eigen OG-titel, en een pricing-specifieke description zouden SEO en social sharing verbeteren.

**Mogelijke oplossingen (keuze aan Khidr):**
1. Wrap de client-interacties in een client child component, maak de page.tsx zelf een server component met `export const metadata`
2. Voeg een `generateMetadata` functie toe als server component wrapper
3. Accepteer als low-priority — `/pricing` is intern-navigatie, geen primaire SEO-target

Dit is geen blocker voor launch maar het is een bekende inconsistentie (gedocumenteerd in sitemap-audit-2026-05.md, sectie 6.4 en 10.2.3).

---

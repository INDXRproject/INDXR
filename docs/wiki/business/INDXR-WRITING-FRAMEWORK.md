# INDXR.AI — Writing Framework
*Gebruik dit document als checklist bij elk artikel. Niet als inspiratie — als harde regels.*

---

## 1. Toon & stem

**Wat het is:** Senior engineer die iets uitlegt aan een peer over koffie. Technisch precies, nooit neerbuigend, erkent eerlijk beperkingen, toont expertise via specifieke getallen — niet via superlatieven.

**Wat het niet is:** Marketingtekst. Buzzwords. Vage beloftes. Overenthousiasme.

**Regels:**
- Schrijf in het Engels. Direct, actief, geen passive voice tenzij noodzakelijk.
- Eerste persoon ("We default to 120 seconds because the research shows...") is toegestaan voor beslissingen en meningen.
- Neem duidelijke posities. "X is Y" — niet "X may potentially be Y in some cases."
- Nooit hedgen: verboden woorden zijn *may*, *might*, *could potentially*, *in some ways*, *arguably*.
- Productplaatsing als vanzelfsprekende toolkeuze: "We'll use INDXR.AI to extract the transcript" — zelfde toon als "We'll use pandas to load the CSV."
- Maximaal 3 productmeldingen per artikel. Na waardecreatie, niet ervoor.
- Verboden superlatieven zonder bewijs: *powerful*, *seamless*, *robust*, *cutting-edge*, *best-in-class*.

---

## 2. Pagina-anatomie per type

### Tool-landingspagina (800–1.200 woorden)
```
[Tool direct beschikbaar — boven de fold, geen scroll nodig]
H1: Keyword-first, beschrijvend, geen clickbait
Intro (25-50 woorden): Definitief antwoord op wat de pagina belooft. Direct.
H2: "How it works" (of equivalent)
  → 2-3 alinea's, max 150 woorden elk
H2: "When do you need [format/feature]?" 
  → Use cases, 100-150 woorden
H2: "Frequently Asked Questions"
  → 4-6 vragen, zelfstandige antwoorden van 40-80 woorden elk
```

### Tutorial / How-to (1.500–2.500 woorden)
```
H1: Keyword-first + concrete belofte ("...and Why 30 Seconds Is Wrong")
Intro (50-75 woorden): Probleem + wat dit artikel oplost. Cijfer of statistiek in eerste paragraaf.
H2: [Conceptuele vraag] ("What makes a transcript RAG-ready?")
  → Pure educatie, nul productmeldingen, 150-250 woorden
H2: [Tweede conceptvraag]
  → Vergelijkingstabel of code-blok verplicht
H2: [Implementatie] ("How to...")
  → Stap-voor-stap, code-snippets, productintegratie hier
H2: [Resultaat/verificatie]
H2: "Frequently Asked Questions"
  → 5-8 vragen, zelfstandige antwoorden
```

### Probleemoplossing (1.200–2.000 woorden)
```
H1: Probleem in de titel, oplossing gesuggereerd ("...Here's Why and How to Fix It")
Intro (25 woorden max): Directe one-liner answer. Dit is de featured snippet bait.
H2: "Reason 1: [specifieke reden]" — hernummer per reden
  → Elke reden: 100-150 woorden, eindigt met concrete oplossing of actie
  → Geen lange inleidingen per sectie — direct to the point
H2: "Frequently Asked Questions"
  → 5-7 vragen
Interne links: Verplicht naar gerelateerde INDXR.AI-pagina's
```

### Vergelijkingspagina (1.000–1.500 woorden)
```
H1: "[Concurrent] Alternative" of "INDXR.AI vs [Concurrent]"
Intro (50 woorden): Eerlijk kader — voor wie is welke tool beter?
H2: "What [Concurrent] does well"
  → Eerlijk, geen strawman. 100-150 woorden.
H2: "Where [Concurrent] falls short"
  → Specifiek, gefactcheckt, met concrete voorbeelden. 150-200 woorden.
H2: Feature comparison (tabel verplicht)
H2: Pricing comparison
H2: "Which should you use?" — eerlijk advies, niet altijd INDXR.AI
H2: FAQ (3-5 vragen)
```

---

## 3. GEO-triggers — verplicht per artikel

**Featured snippet / AI Overview capture:**
- Eerste 25 woorden van het artikel = zelfstandig bruikbaar antwoord op de H1-vraag. Altijd.
- Elke H2-sectie begint met een direct antwoord (40-80 woorden), gevolgd door context.

**LLM-citatie-triggers:**
- Minimaal 1 specifieke statistiek met bron in elke 300 woorden. Cijfers verhogen citaties het sterkst.
- Vergelijkingstabellen in elk artikel waar vergelijking relevant is — LLMs extraheren en citeren tabellen zwaar.
- Self-contained antwoordblokken van 75-150 woorden — LLMs kunnen ze extraheren zonder omliggende context.
- Definitieve taal: "The optimal chunk size is 300-400 tokens" — niet "chunk sizes around 300-400 tokens may work well."

**Structuur die ChatGPT citeert:**
- 120-180 woorden tussen H2-headings (niet minder dan 80, niet meer dan 250).
- FAQ-sectie met 5-8 Q&A-paren. Elk antwoord zelfstandig leesbaar.
- dateModified in schema markup — freshness telt mee voor AI-citaties.

**Bing / ChatGPT web search:**
- Sitemap indienen bij Bing Webmaster Tools (ChatGPT gebruikt Bing-index).
- Schema markup aanwezig op elke pagina.
- Pagina laadtijd < 2 seconden — 63% van AI-agents verlaat trage pagina's direct.

---

## 4. Verplichte elementen per artikel

| Element | Verplicht? | Notities |
|---|---|---|
| Antwoord in eerste 25 woorden | ✅ Altijd | Featured snippet + AI Overview |
| H2's als vragen | ✅ Altijd | Mirrors user prompts |
| Vergelijkingstabel | ✅ Waar relevant | LLM-citatie trigger |
| FAQ-sectie | ✅ Altijd | Min 4, max 8 vragen |
| Interne links | ✅ Min 2 | Naar gerelateerde INDXR.AI-pagina's |
| Statistiek met bron | ✅ Min 1 per 300 woorden | Verhoogt GEO-zichtbaarheid sterk |
| Code-snippet | ✅ In developer-content | Python/TypeScript |
| Meta description | ✅ Altijd | Max 155 tekens, keyword vooraan, actief werkwoord |
| Title tag | ✅ Altijd | Keyword + differentiator, max 60 tekens |

---

## 5. Meta-elementen — formules

**Title tag:**
`[Primair keyword] — [Differentiator of actie] | INDXR.AI`
Max 60 tekens. Keyword zo vroeg mogelijk.
Voorbeeld: `YouTube Transcript Not Available? Here's How to Fix It | INDXR.AI`

**Meta description:**
`[Actief werkwoord] + [primair keyword] + [concrete belofte]. [Secundair punt]. [Zachte CTA].`
Max 155 tekens. Geen herhaling van title tag.
Voorbeeld: `YouTube transcripts missing or disabled? We explain every reason and show you how to get the text anyway — even without auto-captions.`

---

## 6. Interne linkstrategie

| Van pagina | Linkt verplicht naar |
|---|---|
| `/youtube-transcript-not-available` | `/youtube-transcript-generator`, `/audio-to-text`, `/youtube-members-only-transcript`, `/youtube-age-restricted-transcript` |
| `/youtube-transcript-markdown` | `/youtube-transcript-obsidian`, `/pricing`, `/how-it-works` |
| `/youtube-transcript-for-rag` | `/youtube-transcript-json`, `/blog/chunk-youtube-transcripts-for-rag`, `/pricing` |
| `/alternative/*` | `/pricing`, `/how-it-works`, relevante feature-pagina |
| Blog-tutorials | Bijbehorende feature-pagina + `/pricing` |
| Tool-pagina's | `/pricing`, `/faq`, gerelateerde feature-pagina |

---

## 7. Schema markup — templates per pagina-type

```javascript
// Tool-pagina
{
  "@type": "SoftwareApplication",
  "name": "INDXR.AI",
  "applicationCategory": "UtilityApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" }
}

// Probleemoplossing / Tutorial
{
  "@type": "Article",
  "headline": "[H1]",
  "dateModified": "[ISO date]",
  "author": { "@type": "Organization", "name": "INDXR.AI" }
}

// Elke pagina met FAQ
{
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "[vraag]", 
      "acceptedAnswer": { "@type": "Answer", "text": "[antwoord]" } }
  ]
}
```

---

## 8. Verboden patronen

- ❌ Begin een artikel met het product: "INDXR.AI is a powerful tool that..."
- ❌ Superlatieven zonder bewijs: "the best", "industry-leading", "unmatched"
- ❌ Vage openingszinnen: "In today's digital landscape...", "More and more people are..."
- ❌ Lange inleidingen voor H2-secties — elke sectie begint direct met het antwoord
- ❌ FAQ-antwoorden die verwijzen naar de rest van het artikel: "See above for details"
- ❌ Interne links met anchor text "click here" of "read more"
- ❌ Meer dan 3 productmeldingen per artikel
- ❌ Productmelding vóór waardecreatie

---

## 9. Bronverwijzingen

Elke feitelijke claim die niet van INDXR.AI zelf komt krijgt een inline bron:
- Formaat: `(Naam, jaar)` in de tekst, volledige URL in voetnoot of bronnenlijst onderaan
- Prioriteit: peer-reviewed onderzoek > vendor research > gerespecteerde tech-publicaties > blogs
- Geen claims zonder bron over concurrentenprijzen, marktgrootte, of nauwkeurigheidspercentages

---

*Dit framework geldt voor alle INDXR.AI content. Bij twijfel: zou een senior developer dit geloofwaardig vinden? Zo nee, herschrijven.*

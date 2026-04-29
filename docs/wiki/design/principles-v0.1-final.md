# INDXR.AI — Design Principles

**Status:** Concept — wacht op validatie van Khidr
**Doel:** Interne werkstandaard die elke design-keuze toetst. Geen marketing-document, geen externe communicatie.
**Datum:** 2026-04-29
**Bron:** Ihsan (إحسان) als kerndiscipline + INDXR's gebruikerscontext + state-of-the-art SaaS design (Linear, Stripe, Anthropic).

---

## Waarom dit document bestaat

Goed design ontstaat niet uit "wat eruit ziet". Goed design ontstaat uit een set principes die élke beslissing onderbouwen — van de hexagon-radius tot de empty-state copy. Zonder zo'n set wordt elke keuze willekeurig en raakt het werk in 6 maanden al inconsistent.

Linear ([Quality is our first principle](https://review.firstround.com/linears-path-to-product-market-fit/)) heeft hun versie. Anthropic heeft de hunne. Stripe heeft "developer empathy". INDXR's versie staat hieronder. Het fundament is **ihsan** — een islamitisch concept dat zich uitstekend leent als seculiere werkstandaard, zonder dat het naar buiten zichtbaar hoeft te zijn.

---

## Het fundament: Ihsan als werkstandaard

Ihsan (إحسان, "to do beautiful things", "perfection", "excellence") is in de islamitische traditie de hoogste graad van religieuze beoefening. De Profeet ﷺ definieerde het als *"Allah aanbidden alsof je Hem ziet, want al zie je Hem niet, Hij ziet jou wel."* Toegepast op werk: **alles maken alsof het beoordeeld wordt door iemand die élk detail ziet — ook wat verborgen is.**

Drie afgeleide concepten zijn relevant voor design:

- **Itqan** (إتقان) — perfectie in uitvoering. *"Allah loves a person who perfects his craft."* Geen halfwerk, geen schoonschijn, geen "het is goed genoeg".
- **Husn** (حسن) — schoonheid. De wortel van ihsan zelf. Schoonheid is op zichzelf een vorm van aanbidding ("Allah is beautiful and loves beauty"). Esthetiek is geen luxe — het is een verplichting.
- **Niyyah** (نية) — oprechte intentie. Werk dat gemaakt wordt om indruk te maken, om verkocht te worden, om viraal te gaan, mist niyyah. Werk dat gemaakt wordt vanuit oprechte zorg voor de gebruiker en de discipline zelf, draagt niyyah.

Deze drie samen vormen de meetlat van INDXR's design-werk.

---

## De zeven principes

### 1. Honest Materiality

> *"Do not represent things to be more than they are."*

Geen drop-shadows die suggereren dat een kaart "premium" is. Geen glassmorphism die suggereert dat er diepte is waar geen diepte hoort. Geen gradients die kleur fingeren waar geen kleur is.

Materialen zijn wat ze zijn:
- Een kaart is een afgegrensd content-blok, niet een 3D object dat zweeft
- Een knop is een actie, niet een sculptuur
- Een achtergrond is een achtergrond, niet een artwork

Dit sluit aan bij Linear's keuze om in 2025 [hun gradient-zware design af te schaffen voor monochroom](https://blog.logrocket.com/ux-design/linear-design/) — niet omdat gradients lelijk zijn, maar omdat ze toevoegen wat er niet hoort te zijn.

**Wel toegestaan:** subtiele schaduwen die werkelijke hiërarchie aangeven (modal boven content), gradients die functioneel zijn (verloop in een progress bar), texturen die betekenis dragen.

**Niet toegestaan:** decoratieve effecten zonder functionele reden.

---

### 2. Itqan in het Onzichtbare

> *"De empty state die niemand ziet, verdient dezelfde zorg als de hero die iedereen ziet."*

Veel SaaS-producten zien er op de marketing-pagina's prachtig uit en op de admin-pagina's verschrikkelijk. Of de happy path is gepolijst en de error path is een afterthought. Dit is **anti-ihsan** — schoonheid alleen waar gekeken wordt, ruwheid waar geen camera staat.

INDXR's standaard:
- De suspended-pagina is even verzorgd als de landing
- De 404-pagina even doordacht als de homepage
- De empty state na "geen credits over" even bewust gemaakt als de hero op /pricing
- De error message bij een failed transcription even genuanceerd als de success message
- De admin-dashboard even consistent als de gebruikers-dashboard

**Praktische test:** wanneer ik dit detail in 6 maanden terugzie, zou ik tevreden zijn dat ik het zo heb gemaakt? Zo nee — opnieuw doen.

---

### 3. Functional Beauty (Husn)

> *"Iets is mooi omdat het werkt; iets werkt omdat het mooi is gemaakt."*

Functie en esthetiek zijn niet tegengesteld — ze zijn tweelingen. Een knop die mooi is maar niet duidelijk een knop, faalt. Een knop die werkt maar lelijk is, is niet *af*. Beide moeten kloppen.

Inspiratie: de Mezquita van Córdoba, de Alhambra, de Süleymaniye Moskee — gebouwen die structureel functioneren én transcenderen wat strikt nodig is. De pilaren dragen het dak én de pilaren zijn schoon. Niet of-of.

Voor INDXR betekent dit:
- Een loading state heeft een doel (gebruiker informeren) én is rustig om naar te kijken
- Een dashboard-grafiek toont data accuraat én is compositorisch sterk
- Een form werkt foutloos én leest aangenaam
- Iconen zijn herkenbaar én esthetisch consistent

Geen functionele compromissen voor schoonheid. Geen esthetische compromissen voor functie. Allebei tegelijk, of nog niet af.

---

### 4. Quiet Quality

> *"Een product hoeft niet te schreeuwen om belangrijk te zijn."*

INDXR is geen entertainment-product. Het is een gereedschap voor mensen die werk willen doen — studenten, journalisten, onderzoekers, ontwikkelaars, makers. Hun aandacht zit in hun *werk*, niet in INDXR's interface.

Dit vraagt om **terughoudend design**: kleuren die ondersteunen in plaats van afleiden, animaties die orienteren in plaats van imponeren, copy die helpt in plaats van overtuigt.

Anti-pattern: features-marketing die overal in de UI doorklinkt. INDXR is niet "the magical AI-powered transcription experience that revolutionizes your workflow". INDXR is een tool die transcripten levert. De UI hoort dat te ondersteunen, niet erbovenuit te gaan.

Inspiratie: Anthropic.com is voorbeeldig hierin — uiterst weinig pyrotechniek, alle aandacht voor het product. Apple's documentation. iA Writer.

**Praktische test:** als ik elke animatie/kleur/icoon weghaal, raakt de gebruiker dan het pad kwijt? Zo ja, het is functioneel — houden. Zo nee, het is decoratie — heroverwegen.

---

### 5. Inclusive by Default (Geen Zulm)

> *"Een product dat sommigen uitsluit, faalt allemaal — ook degenen die niet uitgesloten worden."*

In de islamitische ethiek is *zulm* (ظلم) onrechtvaardigheid — letterlijk "iets uit zijn juiste plek halen". Een ontoegankelijk product is zulm: het ontneemt mensen met beperkingen wat ze toekomt.

INDXR's standaard:
- **WCAG 2.2 AA als minimum**, niet als doel — kleurcontrast, font-sizes, focus states, alt text, semantic HTML
- **Keyboard navigation werkt overal** — niet alleen in forms
- **Touch targets minimaal 44x44px** op mobile
- **Geen kleur-alleen signalering** — een error is niet alleen rood, hij heeft ook een icoon en tekst
- **Reading-friendly typografie** — voor mensen met dyslexie, voor lange transcripten, voor avond-lezen
- **Internationale fonts** — wat als iemand een Arabisch transcript inplakt? Met of zonder bidirectional support?

Dit kost ontwerptijd. Dat is geen excuus om het niet te doen. Een product gebouwd op uitsluiting is geen excellent product.

---

### 6. Coherentie Boven Lokale Optimalisatie

> *"Een excellent onderdeel in een rommelig systeem is alsnog rommel."*

In Islamitische geometrie zit de schoonheid niet in één tegel — die zit in hoe alle tegels samen één patroon vormen. Een geweldige tegel die niet aansluit op zijn buren, breekt het patroon.

Voor INDXR:
- **Eén spacing scale**, niet 47. Als ergens 13px nodig is, is dat een teken dat je systeem incompleet is, niet dat je een uitzondering moet maken.
- **Eén kleurensysteem.** Geen ad-hoc `#1a1a1a` ergens omdat het "even nodig was". (De huidige audit toonde precies dit probleem in `billing/cancel/page.tsx`.)
- **Eén iconen-stijl.** Geen lucide-react bij de meeste icons en daarnaast random custom SVGs.
- **Eén type-systeem.** De huidige audit toonde dat `prose-content` (globals.css) en Tiptap's `prose` met `!important` overrides **naast elkaar** bestaan. Dat is een coherentie-breuk.

**Praktische test:** als ik een nieuw component bouw zonder dat ik in de huidige codebase kijk, alleen door het systeem te volgen — ziet het er dan thuis uit?

---

### 7. Geen Verspilling (Geen Israf)

> *"Voeg niets toe dat geen reden heeft om er te zijn."*

In de islamitische ethiek is *israf* (إسراف) verkwisting — gebruiken wat niet nodig is. In design vertaalt dit naar:

- **Geen 8 fonts waar 2 volstaan**
- **Geen 23 spacing-waarden waar 8 volstaan**
- **Geen 3 button-varianten die hetzelfde doen**
- **Geen animaties die langer duren dan nodig (>200ms zonder reden = teveel)**
- **Geen content waar geen content hoort** — een lege state hoeft niet 6 zinnen tekst en een illustratie te hebben als 1 zin volstaat
- **Geen JavaScript waar HTML/CSS volstaat** — bijv. de FAQ's `<details>` is anti-coherent (zie principe 6) maar de keuze om geen complexe accordion-component te gebruiken is *pro*-anti-israf
- **Geen features die niemand gebruikt** — observeer met PostHog, durf weg te halen

Israf is niet alleen tech debt — het is morele verkwisting. Tijd, aandacht, energie van gebruikers, hun apparaten' batterij, het netwerk — alles wat verspild wordt zonder reden.

---

## Hoe we deze principes gebruiken

### Bij elke design-beslissing

Voor elke vraag — "Welke font?", "Welke kleur?", "Hoe ziet deze card eruit?" — toetsen we tegen alle 7 principes:

1. Honest? Geen pretentie van wat niet bestaat?
2. Itqan? Verzorgd ook waar niemand kijkt?
3. Functional Beauty? Werkt én voelt af?
4. Quiet? Trekt het de aandacht weg van wat de gebruiker doet?
5. Inclusive? Sluit dit iemand uit?
6. Coherent? Past dit bij wat we al hebben en bouwen?
7. Geen Israf? Voegt dit iets toe dat de moeite waard is?

Als één principe wordt geschonden zonder duidelijke reden, opnieuw doen. Als meerdere geschonden worden, fundamenteel heroverwegen.

### Bij conflicten tussen principes

Soms staan principes op gespannen voet. Een voorbeeld: een rijke loading-animatie (functional beauty) versus minimalisme (quiet quality + geen israf).

**Geen vaste volgorde — per geval afwegen.**

Geen enkel principe wint automatisch. Elk conflict vraagt om expliciete redenering over de specifieke situatie:

- **Wat is hier het zwaarste belang?** Een toegankelijkheidsschending op een kritieke flow weegt zwaarder dan op een marginale pagina. Verspilling op een hot path weegt zwaarder dan op een edge case.
- **Welk principe is hier in dienst van de gebruiker, en welk in dienst van het systeem?** Bij conflict heeft de gebruiker meestal voorrang — maar niet altijd: een kortzichtige toegeving aan één gebruiker die het systeem voor anderen breekt, is geen excellence.
- **Is dit een eenmalige uitzondering of een patroon?** Eenmalige uitzonderingen mogen subjectief beslecht. Patronen vragen om systeem-aanpassing zodat het conflict niet terugkeert.
- **Documenteer de redenering.** Een afgewogen keuze is geen compromis als de redenering helder is. Leg vast in `wiki/design/decisions/` waarom een principe in dit specifieke geval moest wijken.

Twee vuistregels die geen rangorde zijn maar wel guidance:

- **Toegankelijkheid is zelden de juiste keuze om in te leveren.** Als Inclusive by Default wijkt, moet de reden uitzonderlijk sterk zijn. Niet onmogelijk — maar zeldzaam.
- **Honest Materiality is zelden de juiste keuze om in te leveren.** Esthetiek die liegt over wat iets is, ondermijnt vertrouwen op een fundamenteel niveau.

### Bij review

Voor élke pagina, élke component, élke landing voor merge naar `main` — een korte zelf-review tegen de principes. Dat hoeft geen uur te duren. Vijf minuten lezen door de lens van de zeven principes vangt 80% van wat anders pas in productie zou worden ontdekt.

---

## Wat dit niet is

- **Geen marketing.** Niemand buiten dit document hoeft "ihsan" te horen. Het werkt achter de schermen.
- **Geen religieuze gatekeeping.** Deze principes zijn universeel toepasbaar. Iemand die niet moslim is, kan ze even goed volgen — net zoals Linear's "quality first" universeel is.
- **Geen rigide regelboek.** Principes geven richting, niet voorschriften. Een principe wijst naar een waarde, niet naar één implementatie.
- **Geen excuus voor langzaam werk.** Ihsan is geen perfectionisme dat uitvoering blokkeert. Itqan zegt: doe wat je doet zo goed als je nu kunt. Niet: doe niets totdat het volmaakt is.

---

## Concrete implicaties voor INDXR's komende keuzes

Deze principes maken sommige aanstaande beslissingen helder voordat we beginnen met onderzoeken:

| Vraagstuk | Wat de principes zeggen |
|-----------|--------------------------|
| **Font keuze** | Moet leesbaar zijn voor lange transcripten (Inclusive), niet schreeuwerig of trendy (Quiet), goed schalen op alle apparaten (Itqan) |
| **Kleurenpalet** | Geen valse premium-suggestie (Honest), goed contrast voor toegankelijkheid (Inclusive), beperkt en coherent (Geen Israf, Coherentie) |
| **Default theme** | Wat is rustend voor lange werksessies? (Quiet, Functional Beauty) |
| **Animaties** | Functioneel of weglaten (Geen Israf), nooit langer dan nodig |
| **Empty states** | Even verzorgd als happy paths (Itqan in het Onzichtbare) |
| **Error states** | Eerlijk over wat fout ging, niet eufemistisch (Honest), niet alleen kleur-gesignaleerd (Inclusive) |
| **Hexagon-thema** | Mag, maar alleen waar het functie heeft of betekenis draagt (Geen Israf) |
| **Tiptap editor** | Of opwaarderen of vervangen — geen halfwege oplossing (Itqan, Coherentie) |
| **Mobile design** | Zelfde zorg als desktop, niet een ingekrompen versie (Itqan, Inclusive) |
| **SEO templates** | Drie templates voor 31 pagina's = goed (Coherentie, Geen Israf) — alleen redesign nodig, geen restructuur |

---

## Levend document

Dit document is **versie 0.1** — een concept. Elke maand werkbare ervaring met de principes leidt tot kleine bijstellingen. Als een principe in de praktijk niet werkt of een ander principe ontbreekt, voegen we dat toe.

Volgende stap: **valideren** met Khidr, dan vastleggen in `wiki/design/principles.md` en koppelen aan `wiki/INDEX.md`.

Daarna: **concrete keuzes onderzoeken** (font, theme, kleur, etc.) in volgende research-sessies, allemaal getoetst aan deze meetlat.

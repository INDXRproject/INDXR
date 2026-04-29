# INDXR.AI — Batch 3A Research Document
## Information Architecture & Naming Strategy

*Phased redesign research, follow-up to Batch 1 (typography/theme/color/scale/hexagon) and Batch 2 (tokens/layout/mobile/state/Next.js/a11y).*

---

## 0. Lens en framing — how this document is structured

This research is filtered through the seven internal *ihsan* design principles: **Honest Materiality, Itqan in the Invisible, Functional Beauty (Husn), Quiet Quality, Inclusive by Default, Coherence Over Local Optimization, No Waste (No Israf — but beauty that carries meaning is not waste).** Every concrete recommendation below is tested against these principles, with explicit calibration for Khidr's recent feedback that prior batches leaned too minimal: *kaal/barren is not ihsan*. Where "more weight" earns its keep, we add it; where it would be israf, we strip it.

Each of the five required areas closes with a **RECOMMENDATION FOR INDXR** — ranked options, the recommended choice, and reasoning grounded in the principles. A short cross-cutting section (§6) ties these decisions back to Batch 1/2 and forward to Batch 3B.

---

## 1. Sitemap & Information Architecture Restructure

### 1.1 The actual problem, restated

INDXR has 47 routes today. 31 of them — the SEO landing pages and articles (ToolPageTemplate, ArticleTemplate, TutorialTemplate) — are "footer-buried SEO bait" only reachable via Google or a hidden footer link. They cover real product questions: export formats, transcript availability, age restrictions, RAG workflows, Notion/Obsidian integrations, etc. Khidr wants these to *also* function as a knowledge base — accessible, beautiful, optional — without (a) breaking SEO, or (b) shoving documentation in front of users who only want to use the tool.

This is not a UX choice masquerading as IA — it is genuinely an IA problem, because it concerns how content categories relate, how URLs map to mental models, and how primary navigation surfaces (or doesn't surface) the work.

### 1.2 Reference patterns from "docs as product" companies

#### **Stripe** — `docs.stripe.com` as flagship
- **Top-level navigation:** Stripe's marketing site (`stripe.com`) and docs site (`docs.stripe.com`) live on different subdomains, but the docs are *navigationally first-class* — they appear in the global header of stripe.com and are typed as a peer of Products, Solutions, Pricing.
- **Three-column layout:** stable hierarchical nav left, content middle, code/contextual right. Docs are organized by product area (Payments, Business operations, Developer tools), then by task, then by reference.
- **Dual audience handling:** Marketing pages tell prospects *why*; docs tell developers *how*. The bridge between them is heavy: marketing pages link into docs at every "Learn more" point; docs cross-reference back to marketing only for high-level positioning. Stripe assumes the developer audience treats docs *as* the marketing — many prospects evaluate Stripe by reading the docs.
- **Discovery patterns:** prominent global search, persistent left-sidebar tree, syntax-highlighted icons to break monotony, and contextual "next steps" in the third column. Critically, the menu remains *anchored* — users never lose orientation while drilling down.
- **Relationship to internal product:** authenticated `dashboard.stripe.com` users see docs with their *own* test API keys auto-injected — a deeply contextualised experience that earns the "docs as product" label.

**Takeaway for INDXR:** subdomains (`docs.indxr.ai`) are overkill for a small SaaS. But the *promotion of docs to top-level nav* and the *anchored sidebar* pattern are directly applicable. The "docs are part of done" culture (a feature isn't shipped until its docs are written) is also directly applicable to a solo dev workflow.

#### **Linear** — separate-but-interconnected `/method`, `/docs`, `/changelog`
- Linear maintains four distinct content surfaces: marketing (`linear.app`), method essay (`/method`), product docs (`/docs`), and changelog (`/changelog`) — each a peer in the global navigation, each visually consistent but with subtly different IA.
- Linear's *internal* product naming is famous for refusing generic SaaS conventions: **Issues, Cycles, Triage, Inbox, Initiatives, Projects, Roadmap, Views, Asks**. Each is a deliberate piece of vocabulary that shapes how teams think about work — "Cycles are similar to sprints… they specifically do not end in a release," "Triage is your team's shared inbox for new issues." Linear's docs treat these terms as proper nouns, defined once in `/docs/conceptual-model` and used consistently across the product, marketing, and changelog.
- The changelog itself is treated as a marketing surface: visual, scannable, with reactions and links to relevant help docs. ~60% of Linear users interact with the changelog monthly (vs. 10–15% industry average), per published case studies.
- Discovery: `Cmd-K` global command palette doubles as a navigation primitive — `G` then `I` for Inbox, `G` then `T` for Triage. The keyboard-first pattern *is* the IA.

**Takeaway for INDXR:** a coherent internal vocabulary ("Linear has Cycles") creates a thematic identity that makes the product feel deliberate without theatrics. INDXR should consider whether *its* nouns (Transcript, Library, Index) are doing similar work or just borrowing generic SaaS labels.

#### **Vercel** — `/docs`, `/templates`, `/guides`, `/resources`, `/changelog`
- Vercel splits content even more granularly: **Docs** (technical reference), **Templates** (deployable starters), **Knowledge Base** (in-depth guides), **Customers** (case studies), **Blog** (changes), **Changelog** (what shipped), **Press**, **Events**. Each lives under `/resources` in the global navigation but has its own URL slug at the top level.
- The pattern: marketing positions, templates demonstrate, docs reference, knowledge base teaches, blog narrates. Different surfaces for different intents.
- Vercel does *not* duplicate content across surfaces — a guide lives in one place, and other surfaces link to it.

**Takeaway for INDXR:** at scale, content fragments by intent (positioning vs. reference vs. teaching vs. narrating). Pre-launch, INDXR doesn't need this many surfaces — but the underlying principle (one piece of content, one home, many entry points) matters now.

#### **Anthropic / Claude** — `claude.com`, `claude.ai`, `platform.claude.com/docs`, `code.claude.com/docs`
- Anthropic separates audience by subdomain: marketing (`anthropic.com`), product (`claude.ai`), API platform docs (`platform.claude.com/docs`), and code-CLI docs (`code.claude.com/docs`). Each has its own navigation tree.
- This is *coherence at the brand level, divergence at the product surface level* — a pattern that scales for products with genuinely distinct audiences (consumer chat users vs. API developers).

**Takeaway for INDXR:** INDXR's audience is mixed (students/journalists/researchers/podcasters/RAG developers), but it is *one* audience, not two distinct ones with different mental models. So the Anthropic split is overkill. A single domain with internal IA tiers is right.

#### **Resend** — docs deeply integrated, `resend.com/docs` flat
- Resend's docs sit at `/docs` on the main domain. Not a subdomain. The marketing site is small (homepage + pricing + integrations + blog), and the docs carry the bulk of the content weight.
- Notable: Resend's docs *are* the marketing for developers. The "Email API for developers" positioning is delivered as much through `/docs/send-with-nextjs` as through `/`.
- The site uses an `llms.txt` file to expose a complete documentation index for AI agents.

**Takeaway for INDXR:** for a small SaaS, *flat docs on the main domain* (not a subdomain) is the right pattern. `indxr.ai/docs` not `docs.indxr.ai`. Less infrastructure, less DNS, less duplicated branding work.

#### **Supabase** — three peer apps in a monorepo
- Supabase explicitly architects three Next.js applications in one monorepo: `apps/www` (marketing), `apps/docs` (docs portal), `apps/studio` (product dashboard). Each shares packages, design system, auth, but has distinct IA optimised for its role.
- Marketing tells the story; docs deliver implementation; studio is the working surface. Cross-linking is heavy and bidirectional.
- Their docs middleware does smart things: when a bot crawls `/reference/*`, it serves a pre-rendered crawler-optimized version; when a user appends `.md` to a docs URL, it serves raw markdown for AI tools.

**Takeaway for INDXR:** the architecture is overkill, but the *principle* — "marketing, docs, and product are peers, not parent-and-child" — is correct. INDXR should structure the IA so that `/docs` (the new knowledge base) is a peer of the marketing site and the dashboard, not a footer afterthought.

#### **Notion Help Center** & **Plausible Analytics**
- Notion's help center (`notion.so/help`) is as polished as the product — same typography, same colour, same components, with rich illustrations. The help center is treated as a brand surface, not a support afterthought. There is no visual "cliff" when stepping from product to help.
- Plausible's docs (`plausible.io/docs`) double as comparison/SEO content: pages like `/vs-google-analytics`, `/most-accurate-web-analytics`, `/for-bloggers-creators` rank for buyer-intent queries while also serving as in-depth reference for current users. The same article serves marketing and education simultaneously — the audiences are differentiated only by their entry path.

**Takeaway for INDXR:** This is the most relevant precedent. INDXR's existing 31 SEO articles already conflate marketing and documentation — that is *not a flaw*, that is the same model Plausible uses deliberately. The article `/youtube-transcript-csv` serves both "I'm searching for a CSV transcript tool" (prospect) and "How does INDXR's CSV export work?" (existing user). The IA fix is to make the second journey legible without breaking the first.

### 1.3 Patterns extracted across references

| Dimension | Stripe | Linear | Vercel | Resend | Supabase | Plausible | Notion |
|---|---|---|---|---|---|---|---|
| Docs in primary nav | ✅ | ✅ | ✅ (under Resources) | ✅ | ✅ | ✅ | ✅ (Help) |
| Subdomain for docs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Marketing/docs separation | High | Medium | Medium | Low | High | None (intentional) | Medium |
| Sidebar in docs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Global search | ✅ | ✅ (Cmd-K) | ✅ | ✅ | ✅ | minimal | ✅ |
| Auth-aware docs | ✅ (test keys) | ❌ | ✅ (project context) | ❌ | ✅ | ❌ | ✅ |
| Categorization scheme | Product → task | Concept → feature | Platform → workflow | Use case → SDK | Service → guide | Use case → topic | User intent |

### 1.4 Concrete recommendations for INDXR

**Should articles live under `/docs`, `/learn`, `/help`, `/guide`, `/library`?**

Tested against the seven principles:

| Slug | Connotation | Honesty | Itqan | Husn | Coherence | Israf risk | International |
|---|---|---|---|---|---|---|---|
| `/docs` | Reference, technical, developer-leaning | High — accurately describes content | Strong | Quiet | Industry-standard, neutral | None | Universal — recognized in CJK, Arabic, Devanagari contexts as a Latin word with stable meaning |
| `/learn` | Tutorial-shaped, instructional | Medium — implies course-like progression INDXR doesn't have | OK | Soft | OK but slightly aspirational | Mild — overpromises pedagogy | Translates well; "leren" in Dutch, "تعلم" in Arabic — clear intent |
| `/help` | Reactive support | Medium — suggests problem-solving only, undersells the content | OK | Slightly weak | Conflicts with future `/support` | None | Universal |
| `/guide` (singular) | Authored, opinion-bearing | High — fits long-form articles | Strong | Has weight | OK but unusual as singular | None | Translates clearly |
| `/library` | Collection, browsable | Medium — already used internally for transcripts (collision) | OK | Has weight | **Direct conflict with `/dashboard/library`** | High — confuses two surfaces | Universal but creates ambiguity |
| `/knowledge` | Aspirational, slightly heavy | Low — too grandiose for the actual content | Risk | Heavy-handed | OK | Mild — pretentious if articles are short | Translates oddly in CJK |
| `/resources` | Vague catch-all | Low — no specific promise | Weak | Generic | None | None | Slightly bureaucratic in Arabic/Indonesian |

**Recommendation: `/docs`** — with internal navigation labels free to evolve. `/docs` is honest, internationally interpretable, conflicts with nothing in INDXR's existing routes, and matches the mental model of the audience (students, researchers, developers, content creators all parse `/docs` consistently). The semi-pretentious alternatives (`/knowledge`, `/library`) violate Honest Materiality. `/help` collides with future `/support` semantics. `/learn` overpromises.

**How to surface in primary navigation without dominating**

Recommended primary navigation, marketing site (unauthenticated):

```
[INDXR logo]   Pricing   Docs   Changelog   →  [Log in]  [Start free]
```

That's it. Five items max. Pricing and Docs are co-equal — both are how prospects evaluate the product. Changelog is included pre-launch as a public-build trust signal (see §3). FAQ and How-it-works fold *into* `/docs` (see below).

For the authenticated dashboard, docs appears as a tertiary-but-always-available element. Two options here:

- **Option A (recommended):** A persistent `?` icon in the top-right of every dashboard page that opens a slide-over docs panel (Stripe pattern). It is unobtrusive and contextual — when the user is on `/dashboard/transcribe`, the panel pre-filters to relevant docs. When closed, it leaves no visual weight.
- **Option B:** A "Docs" link in the user-menu dropdown only (very quiet; possibly *too* quiet — fails the Husn test by hiding the work).

**Should `/faq`, `/how-it-works`, support docs all merge into one knowledge base?**

Yes — *with caveats*.

- `/how-it-works` is currently a marketing page that explains the product. It should remain a marketing page (it sells), but its content overlap with `/docs/getting-started` should be acknowledged: write the marketing page once, factor any reusable explanatory chunks into `/docs/getting-started`, and link the marketing page *into* docs at the natural "Learn more" point.
- `/faq` should be **deprecated as a top-level page** and folded into `/docs` as `/docs/faq` or, better, broken apart into individual docs articles tagged "FAQ." Reasoning: FAQ pages are 2010-era IA; modern users search. A single `/docs/faq` pile competes with itself for SEO and creates orphaned questions. Better: each FAQ becomes a focused article (`/docs/transcript-availability`, `/docs/age-restricted-videos`, etc.) — which is *exactly what the existing 31 SEO landing pages already are*. The migration is therefore: rename `/faq` content as docs articles, and let the existing 31 fill out the same shelf.
- `/support` stays as a page but is renamed and positioned as the *contact path* (see §2e), not the documentation entry point. Docs answers "what can the product do?"; Support answers "I have a problem this product can't solve myself."

**Categorization scheme**

INDXR's articles cover overlapping axes. Forcing a single hierarchy creates orphaned content. Recommended: a *primary* hierarchy by **user task**, with *secondary* facets by export format and use case.

```
/docs
├── /docs/getting-started          (was: /how-it-works content)
├── /docs/transcribe                (the act — all questions about extraction)
│   ├── /docs/transcript-availability     (existing SEO URL preserved)
│   ├── /docs/age-restricted-videos       (existing SEO URL preserved)
│   ├── /docs/private-videos              (existing SEO URL preserved)
│   └── ... (existing SEO articles, URL stable, label updated)
├── /docs/export                    (output formats — group)
│   ├── /youtube-transcript-csv     (existing canonical SEO URL)
│   ├── /youtube-transcript-srt     (existing canonical SEO URL)
│   ├── /youtube-transcript-json    (existing canonical SEO URL)
│   └── ...
├── /docs/integrations              (workflows — Notion, Obsidian, RAG)
│   ├── /notion-youtube-transcript  (existing SEO URL)
│   ├── /obsidian-youtube-transcript
│   ├── /rag-youtube-transcript
│   └── ...
├── /docs/account                   (billing, credits, plans)
└── /docs/faq                       (catch-all, ideally empty over time)
```

Critical: the **URLs do not change**. Only the sidebar grouping, breadcrumb, and internal anchor text reflect this categorization. The article slugs (`/youtube-transcript-csv`) keep all their accumulated SEO authority. This is achievable via a single configuration object that maps existing routes to docs sections — see §5 for the technical pattern.

**Search**

- **Pre-launch:** simple client-side search (Fuse.js or pagefind) scoped to docs only. Docs is where search has the highest leverage; transcript-library search is a separate feature with different requirements.
- **Post-launch v1:** consider `Cmd-K` global command palette (Linear pattern) that searches docs, library, settings, and offers actions ("Start new transcription"). This is genuinely high-value — it serves Husn (a small, beautiful primitive) and Coherence (one search across surfaces). But it is *not* required for launch; it earns its place after the basics work.
- **Algolia/Pagefind:** Pagefind is recommended over Algolia for INDXR. It is static, fast, free, no external dependency, and aligns with No Israf — Algolia adds complexity disproportionate to value at INDXR's scale.

**Authenticated vs. unauthenticated docs**

Same content, same URLs, no auth distinctions. The 31 SEO articles must remain crawlable and equally valuable to prospects and customers. The only difference is *contextual surfacing*: an authenticated user on `/dashboard/transcribe` may see a hint or `?` panel that links to `/docs/transcript-availability`; an unauthenticated visitor reaches the same article via Google. The article doesn't know who's reading it — and shouldn't. That's Honest Materiality.

**"Docs as product" positioning**

The framing for INDXR should be: docs are *part of the product*, not a marketing layer. They are how INDXR teaches the things the UI can't show — the limitations honest about (age-restricted videos, transcript availability), the workflow recipes that turn a transcript into a Notion page or RAG embedding. The docs aren't SEO bait that happens to also help users; they are *real reference content that happens to also rank in Google*. That reframing is the Itqan in the Invisible — invisible work that earns user trust.

### 1.5 RECOMMENDATION FOR INDXR — IA Restructure

Recommended top-level sitemap (post-restructure):

```
Marketing (unauthenticated, indexed)
├── /                              (homepage)
├── /pricing                       (kept)
├── /docs                          (NEW umbrella, navigationally first-class)
│   ├── /docs                      (docs landing — categorized index)
│   ├── /docs/getting-started      (NEW; absorbs /how-it-works content)
│   └── [all 31 existing SEO URLs remain, regrouped in sidebar only]
├── /changelog                     (NEW; see §3)
└── /support                       (renamed from /support → semantically: contact)

Auth (functional, no-index)
├── /login, /signup, /forgot-password, /onboarding, /suspended

Product (authenticated, no-index)
├── /dashboard                     (Home — see §2c)
├── /dashboard/transcribe          (URL stable, label may evolve)
├── /dashboard/library             (URL stable, label may evolve)
│   └── /dashboard/library/[id]
├── /dashboard/inbox               (NEW; see §3 — Message Center)
├── /dashboard/billing             (URL stable; /success and /cancel kept)
├── /dashboard/account             (consolidated; absorbs /settings — see §2d)
└── /admin/*                       (unchanged; admin-only)

Removed / merged
├── /faq                           (content folded into /docs)
├── /how-it-works                  (content split: marketing portion stays at /, deeper portion becomes /docs/getting-started)
├── /account/credits               (already legacy; remove on migration)
└── /dashboard/settings            (merged into /dashboard/account)
```

This sitemap drops one route (`/account/credits`), merges two (`/faq` + `/how-it-works` into `/docs`; `/settings` into `/account`), and adds three (`/docs` umbrella, `/changelog`, `/dashboard/inbox`). The net is a smaller, more coherent surface.

Tested against the principles:
- **Honest Materiality:** docs aren't dressed up as a "knowledge graph" or "academy." They're called docs.
- **Itqan in the Invisible:** the empty states for `/docs` (no search results, etc.) and `/dashboard/inbox` (no messages) get the same care as the hero pages.
- **Husn:** docs as a first-class nav item gives the work weight; the `?` slide-over gives it presence in-product without dominating.
- **Quiet Quality:** the navigation has 5 items, not 12. Restraint without being barren.
- **Inclusive by Default:** no hover-only menus; all items keyboard-reachable; the `?` panel is screen-reader announced.
- **Coherence:** docs is one surface, not split across `/faq`, `/how-it-works`, and footer.
- **No Israf:** every added surface (changelog, docs umbrella, inbox) has a concrete, testable purpose. Nothing decorative, nothing speculative.

---

## 2. Naming & Terminology

### 2.1 Methodology note

Khidr's question — *should INDXR follow generic SaaS conventions, or develop its own naming language?* — has a specific answer rooted in the principles: **a quiet thematic identity, not a heavy theme**. Linear took a heavy hand ("Cycles," "Triage," "Asks," "Initiatives") because Linear is a product whose entire value proposition is rethinking how teams work. INDXR's value proposition is more humble: *make YouTube transcripts useful*. So the naming language should *mostly* default to recognizable SaaS conventions (no friction for Indonesian/Malay/Arabic users, no English idioms to decode), with **one or two light thematic threads** that earn their weight.

The light thematic thread: **the act of indexing — careful stewardship of recorded thought**. This is honest to the product name (INDXR), aligns with the audience's underlying purpose (students collecting research, journalists archiving sources, developers feeding RAG systems), and gives the verbs a quiet center of gravity without becoming costume.

### 2.2 Naming decisions

#### a) The tool itself (currently "Transcribe")

**What it actually does:** extracts a transcript from a YouTube video, makes it searchable, and lets the user export it. The verb form ("Start a new ___") is what appears in CTAs; the noun form ("My ___") is what appears in the library label.

**Shortlist (verb / noun pairs):**

| Verb | Noun | Honesty | Husn | International | Verdict |
|---|---|---|---|---|---|
| **Transcribe / Transcript** | Transcribe / Transcript | Highest — describes the action precisely | Quiet, restrained | "Transcribe" is universally recognized in academic/journalistic contexts; "transcript" is a Latin loanword present in most languages | **Recommended primary** |
| Index / Index | Index / Index | High — ties to the brand name | Has thematic weight | "Index" is universal but reads slightly technical | Recommended thematic accent (used as a second-tier verb, not primary CTA) |
| Extract / Extraction | Extract / Extraction | High but slightly clinical | Functional | Universal | Workable but cold — fails the Husn test slightly |
| Capture / Capture | Capture / Capture | Medium — overpromises (the user isn't capturing the video) | OK | Universal but cinema-leaning | Reject — implies media capture, misleading |
| Distill / Distillation | Distill | Low — implies summarization, which INDXR doesn't do | Pretty but false | Confusing in non-English | Reject — Honest Materiality fails |
| Decode / Decode | Decode | Low — implies cryptography | Punchy but inaccurate | OK | Reject |

**Recommended:**
- Primary verb in CTAs and dashboard actions: **Transcribe** ("Transcribe a video", "New transcript")
- Primary noun in product surfaces: **Transcript** ("My transcripts", "This transcript", "Open transcript")
- Light thematic accent: **Index** appears as a verb in 1–2 specific places — e.g., the action "Index this transcript for search" or in the marketing tagline ("INDXR indexes the world's spoken knowledge"). Used sparingly. Becomes the brand-voice signature without spreading into every label.

This is the *quiet thematic identity* — most of the product reads as conventional SaaS, but a careful reader notices `INDXR` connects to a real verb that the product genuinely does.

**Tested against principles:** Transcribe is honest (the product does transcribe), inclusive (universal Latin loanword), coherent (one verb across contexts), no israf (no second word for the same action). Husn is preserved by *not* using a fancier alternative — the restraint is the beauty.

#### b) The library (currently "Library")

| Term | Suggests | Scales to 1000+? | Conflicts | International |
|---|---|---|---|---|
| **Library** | Personal browsable collection | Yes — libraries scale infinitely in the metaphor | None internally; risk if `/library` becomes a docs slug | "Library/Bibliotheek/مكتبة" — universally evocative |
| Collection | A curated, smaller set | Less well — feels limited | None | Universal |
| Archive | Older, less-active items | Conflicts with intent — the library is *active* | None | Universal |
| Vault | Secured, sealed | Inappropriate — INDXR transcripts are not secrets | Cliché in tech (Obsidian) | Universal |
| Workspace | Active project space | Misleading — implies editing/collaboration | Notion-claimed | Universal |
| Catalog | Indexed, formal | Slightly heavy | None | Universal |
| Index | Brand-aligned, organisational | Risk of conflating with brand name everywhere | Recursive with brand | Universal |
| Notes | Note-taking specific | Misleading — these aren't notes, they're transcripts | Roam/Obsidian-claimed | Universal |
| Transcripts | Literal | Honest but flat | None | Universal |
| Saved | Verb-as-noun, casual | Too informal | None | Universal |

**Shortlist:**
1. **Library** (recommended) — accurate metaphor, scales, universally legible, restrained.
2. **Transcripts** (alternative) — maximally literal; consider for the URL `/dashboard/transcripts` if the team wants flat-honesty over metaphor. Slight cost: less warmth, less of an "object you visit."
3. **Catalog** (alternative thematic) — pulls more weight from the indexing thread but reads slightly formal.

**Recommendation: Library** for the navigation label, with the URL **kept at `/dashboard/library`**. The metaphor scales (a library of 10,000 transcripts is still a library), the term is internationally legible, and it avoids both the recursion of using "Index" everywhere and the literalness of "Transcripts." The Obsidian "Vault" pattern is too tech-claimed and connotes secrecy that INDXR doesn't have.

If at any point a docs-slug conflict arises (e.g., considering `/library` for docs), defer to the dashboard usage — Library is for the user's transcript collection. Docs lives at `/docs`.

#### c) Overview / Dashboard home (currently "Dashboard")

**Purpose of the page:** quick stats (credits remaining, recent activity), shortcut to start a new transcription, surface to onboarding tasks for new users, and home for the WelcomeCreditCard.

| Term | Connotation | Industry pattern | INDXR fit |
|---|---|---|---|
| **Home** | Personal, default landing, low-friction | Notion, Anthropic Claude.ai | High — implies "you're here, this is yours" |
| Overview | Summary, surface-level | Stripe, Vercel | High — accurate but a bit cold |
| Dashboard | Metrics-heavy, control-panel | Generic SaaS default | Medium — connotes more analytics than INDXR shows |
| Today | Time-based, action-oriented | Notion, some calendar apps | Low fit — INDXR isn't time-bound |
| Activity | Stream-based | Linear, GitHub | Low fit — implies a feed |
| Hub | Central convening | Various | Pretentious for INDXR's scale |

**Shortlist:**
1. **Home** (recommended) — warm, universally legible, matches what the page actually is for users. URL stays `/dashboard` (the URL is fine as-is; it's the *label* that changes).
2. **Overview** (alternative) — appropriate if the page leans more toward stats. Cooler tone.
3. **Dashboard** (current, fallback) — workable but feels slightly more enterprise than INDXR's tone.

**Recommendation: Home** as the navigation label and breadcrumb. URL stays `/dashboard`. Reasoning: the page is already serving as a personal landing surface (welcome card, recent transcripts, credit status). "Home" matches that exactly. Notion's "Home" approach is the closest precedent — Notion's Home shows recent pages, suggested actions, and quick stats, which is what INDXR's `/dashboard` does. The current "Dashboard" label is fine, but "Home" reads warmer and aligns better with INDXR's voice (quiet, considered, not enterprise-style metric-heavy).

#### d) Account vs. Settings split (currently both exist)

Modern SaaS conventions converge on:
- **Account:** identity, billing, subscription, security, danger zone (delete account)
- **Settings:** preferences, notifications, integrations, appearance, locale

Examples:
- **Vercel:** splits Account (personal identity, billing) from Team Settings — the split is *scope-based* (personal vs. team).
- **Linear:** one Settings tree, deeply nested — Account, Preferences, Notifications, API, Integrations as siblings under one root.
- **Stripe:** one Settings tree, deeply nested.
- **Notion:** combines as "Settings & Members."

**INDXR's specific situation:** single-user product (no teams), so the Vercel split logic doesn't apply. The Linear/Stripe pattern fits better — *one settings root with sections*.

**Shortlist:**
1. **Single `/dashboard/account` with sections** (recommended) — Profile, Plan & Credits, Notifications, Preferences, API (future), Danger Zone. Removes `/dashboard/settings` as a separate route.
2. **Keep both, split modernly** — `/dashboard/account` (identity, billing, security) and `/dashboard/settings` (preferences, notifications, appearance). Vercel-style.
3. **One `/dashboard/settings`** — consolidate under "Settings" not "Account." Less recommended; "Account" reads more identity-personal.

**Recommendation: Option 1 — collapse into one `/dashboard/account` page with sections.** Reasoning:
- INDXR is a single-user product. There is no team to require a Settings/Team-Settings split.
- Splitting Account from Settings requires the user to remember which lives where — Israf, mild but real.
- A single `/dashboard/account` page with clearly grouped sections (Profile, Plan & Credits, Notifications, Preferences, API access (future), Danger Zone) is simpler, more coherent (Coherence Over Local Optimization), and future-proof — if INDXR adds API keys, integrations, or exports, they land as new sections in the same page.
- The label in primary nav: "Account" (warmer) over "Settings" (colder).

Future-proofing: if INDXR ever adds teams, this becomes `/dashboard/account` (personal) and `/dashboard/team-settings` or `/dashboard/team` (organizational). The current split into Account + Settings would not survive that change well.

#### e) Other pages

**`/pricing`** — Keep as-is. "Pricing" is universally legible, indexed by buyer-intent searches, and conventionally placed. "Plans" is a workable alternative if Khidr ever wants to soften it, but "Pricing" is more honest and SEO-relevant. **Recommendation: keep.**

**`/faq`** — Deprecate as a top-level route (see §1). **Recommendation: redirect to `/docs/faq`** with a 301; long-term, decompose individual FAQs into focused docs articles.

**`/how-it-works`** — This is currently a marketing page that explains the product flow. **Recommendation: keep as a marketing route** but rename internally (label: "How it works") and ensure overlap with `/docs/getting-started` is intentional — marketing tells the *why* in 30 seconds; docs tells the *how* in 5 minutes. Consider folding into the homepage (`/`) as a section if the page is short, freeing the route. If kept, link from it into `/docs` at the natural "Learn more" point.

**`/support`** — Rename label to **"Get help"** or keep as **"Support"**, but reposition: this is the *contact path* (email, form, response time expectations), not the documentation entry point. The page should clearly say: *"Looking for an answer? Start with our [Docs]. Still stuck? Reach us here."* This forks expectations cleanly.
- Shortlist: **Support** (recommended — universally legible) > Get help > Contact.
- URL stays `/support`.

**`/admin`** — Keep as-is, admin-only, internal naming.

**`/onboarding`** — Three options:
1. **Welcome** (recommended) — warmer, matches the WelcomeCreditCard already in product
2. **Get started** — action-oriented, good for first-time
3. **Onboarding** — accurate but bureaucratic

**Recommendation: Welcome** as the page label and route stays `/onboarding` (URL is internal-only, doesn't matter much; could optionally rename to `/welcome` but the change is cosmetic). The label "Welcome" carries Husn — a small piece of warmth at exactly the moment the user is forming their first impression. Itqan in the Invisible: this is the page nobody designs carefully, which is exactly why it deserves care.

**`/suspended`** — Currently named for the system state, not the user's experience. The user reading this page is not "suspended" in their own narrative — they have a problem to resolve.
- Shortlist: **Account paused** (recommended — neutral, blame-free, suggests recoverable) > Account on hold > Restricted.
- "Suspended" reads punitive; "Paused" reads neutral and reflects that INDXR can restore access. Honest Materiality: the page should also explain *why* (failed payment, abuse flag, etc.) in plain language.
- **Recommendation: relabel to "Account paused"; URL stays `/suspended` or migrate to `/account-paused` with a redirect.**

**`/billing/success` and `/billing/cancel`** — These are Stripe redirect targets and rarely seen by humans for long. Keep URLs as-is. Internal labels can be friendlier:
- `/billing/success` → page heading "Welcome to Pro" (or current plan name) or "Payment received"
- `/billing/cancel` → page heading "Checkout cancelled — no charge made"
- **Recommendation: keep URLs, soften copy.** These pages are perfect Itqan-in-the-Invisible territory: they're rarely seen, but when seen they shape trust.

### 2.3 Summary table — naming decisions

| Surface | Current | Recommended | URL change? |
|---|---|---|---|
| Tool action | Transcribe | **Transcribe** (kept; lightly accented by "Index" in marketing) | No |
| Library | Library | **Library** (kept) | No |
| Dashboard home | Dashboard | **Home** | No (URL stays `/dashboard`) |
| Settings/Account split | Two pages | **One page: Account** (with sections) | Yes — `/dashboard/settings` removed |
| Pricing | Pricing | Pricing (kept) | No |
| FAQ | FAQ | **Folded into /docs** | Yes — `/faq` → `/docs/faq` (301) |
| How it works | How it works | How it works (kept, lighter) | No |
| Support | Support | **Support** (repositioned as contact path) | No |
| Onboarding | Onboarding | **Welcome** (label only) | Optional |
| Suspended | Suspended | **Account paused** | Optional (`/suspended` → `/account-paused`) |
| Billing success/cancel | Billing success/cancel | Soften copy ("Welcome to Pro" / "Checkout cancelled") | No |

### 2.4 RECOMMENDATION FOR INDXR — Naming

**Primary navigation labels (marketing site, unauthenticated):**
```
[INDXR]   Pricing   Docs   Changelog            Log in    Start free
```

**Primary navigation labels (authenticated dashboard, sidebar):**
```
Home
Transcribe
Library
Inbox        ← new
Account
```
plus a persistent `?` (Help) icon in the top-right that opens a contextual docs panel.

**Voice rules (for Batch 3B sidebar/copywriting work):**
1. Verbs are short and direct: *Transcribe, Open, Export, Save.*
2. Avoid English idioms that don't translate: no "let's go," "we're cooking," "houston we have a problem."
3. Empty states use complete sentences in plain language: "No transcripts yet — try transcribing your first video" (not "No data" or "Nothing here yet").
4. Error states are honest about cause and recovery: "We couldn't reach this video — it may be private or age-restricted. [Learn more]" (links to relevant docs article).
5. The word "Index" / "indexing" appears 1–2 times in marketing voice as a quiet thematic anchor (homepage tagline, perhaps a docs landing-page sentence). Not in product UI labels.

This satisfies:
- **Honest Materiality** — every label describes what the surface actually does.
- **Itqan in the Invisible** — the suspended/welcome/billing pages get the same care as marketing.
- **Husn** — the "Index" thematic accent gives the brand a quiet center.
- **Quiet Quality** — five primary nav items, no clever jargon.
- **Inclusive by Default** — every label translates and avoids idiom.
- **Coherence** — one verb (Transcribe) across product and marketing; one noun (Library) for collections; one Account page for self.
- **No Israf** — every renaming earns its keep; nothing renamed for novelty.

---

## 3. Missing Pages & Features (New Product Surfaces)

### 3.1 Message Center / Inbox — recommended **YES, pre-launch v1**

**Khidr's specific requirements:** admin-to-user messaging, free credits arrival, feedback rewards, response notifications.

**Reference patterns:**
- **Linear's Inbox** — first-class navigation item ("G then I" shortcut), grouped notifications, mark-read, snooze, archive. Linear treats Inbox as the "default home" for many users — it's where work converges.
- **GitHub Notifications** — granular configuration, multi-channel (web, email, mobile), inbox triage.
- **Notion notifications** — popover with bell icon, simpler than Linear, lighter weight.
- **Stripe communications** — primarily email-based; in-app surfaces alerts via banners but no dedicated inbox.

**INDXR's right level — Khidr's specific use cases:**
1. *Admin-to-user messages* (e.g., "Welcome bonus added: 50 free credits")
2. *Credit arrival notifications* (Stripe payment processed, credits topped up)
3. *Feedback rewards* (Khidr personally responds to user feedback with a thank-you and bonus credits — this is core to the "honest, hand-crafted" brand)
4. *Response notifications* (when admin replies to a support ticket from within the product)

This is *not* a full Linear-style notifications system. It's a small, dignified inbox: a list of messages from INDXR (the company, not other users), each readable, archivable, with a clear sender (almost always "INDXR" or "Khidr"). Itqan in the Invisible: this is the surface where users feel personally acknowledged.

**Shortlist for naming:**
1. **Inbox** (recommended) — universally legible, scales, matches mental model (Linear, GitHub, email).
2. Messages — workable; slightly less specific.
3. Notifications — reject; "notifications" implies fleeting toasts, not persistent messages.

**Shortlist for placement:**
1. **`/dashboard/inbox`** as a sidebar item, with a small numeric badge for unread count (recommended).
2. Bell-icon dropdown only (Notion pattern) — too quiet; underweights the human touch.
3. Both — bell icon for quick peek + full-page Inbox for browsing. Recommended evolution post-v1, not pre-launch.

**Recommendation: build a minimal `/dashboard/inbox` for v1.** Pre-launch scope: a list of messages (sender, timestamp, title, body, unread/read state). Archive action. Mark all as read. That's it. Smallest implementation that earns its keep. Adds genuine value (free credits arrival, Khidr's personal feedback responses), reinforces the "honest, hand-crafted" brand, and lays architectural groundwork for future system-generated alerts (transcript-ready notifications, billing alerts).

Tested against the principles: Honest Materiality (the inbox shows messages, not metrics dressed as messages); Itqan (each empty state, e.g., "No messages — we'll write when something matters," gets crafted copy); Husn (a bare badge with a number is a small piece of beauty when used sparingly); Coherence (one place for all admin-to-user communication); No Israf (only built because there's a concrete pre-launch use case — Khidr's personal credit-bonus messages).

### 3.2 Changelog / Releases — recommended **YES, pre-launch**

**Reference data:** Linear's changelog gets ~60% monthly user engagement vs. industry 10–15%. Resend, Vercel, and most modern dev-tool SaaS treat changelog as a first-class marketing surface. For solo developers in particular, the consensus from indie-hacker postmortems is: *"if you don't tell people you shipped something, they won't notice"* — and this is true even more pre-launch, when a public changelog signals seriousness, momentum, and a willingness to build in public.

**Pros for INDXR pre-launch:**
- Builds trust before launch — users see the product is alive
- SEO: changelog entries are crawlable content
- Re-engagement: gives lapsed users a reason to return
- Brand: aligns with the "honest, hand-crafted" positioning (every entry shows real work)

**Cons / risks:**
- Empty changelog hurts more than no changelog (Itqan applies — empty changelog must be designed as a stage, not a vacuum)
- Maintenance discipline required (Khidr is solo)

**Recommendation: build `/changelog` pre-launch, but seed it with at least 4–6 honest entries before public launch** — covering early decisions like the design system, the redesign, the typography choice, etc. This makes the empty state a *non-empty state* on day one.

**Implementation pattern:** static markdown files in the Next.js project, MDX rendered as a list ordered by date, with simple tags (Improvement, Fix, New). No third-party tool (Beamer, Productlane, Canny) needed pre-launch — that's Israf. Tools become useful when the team grows and wants in-app notification widgets; not before.

**URL/naming:** `/changelog` (universally legible, matches Linear/Vercel/Resend convention). Top-level marketing route. Internal label: "Changelog."

### 3.3 Roadmap — recommended **NO pre-launch; revisit post-launch v1**

**Pros:** transparency, customer feedback, alignment with feedback-rewarding ethos.

**Cons (decisive for pre-launch):**
- A solo dev pre-launch has uncertain priorities; a public roadmap creates implicit promises that pivots will violate
- Indie-hacker consensus is that roadmap visibility is a *post-launch* trust mechanism, not a pre-launch one
- Tooling (Productlane, Featurebase, Canny) adds complexity; without tooling, manual roadmap maintenance is high overhead
- Israf risk: building a roadmap surface before there are enough users to give meaningful input is decoration without function

**Recommendation: defer.** Post-launch v1, if INDXR has enough users that feedback prioritization is legitimately a question, add a simple `/roadmap` page (static, three columns: Now / Next / Later, no specific dates). Until then, the changelog *is* the roadmap signal — what shipped is the only honest forward-looking statement.

### 3.4 Feedback / Suggestions — recommended **lightweight, integrated with Inbox**

**Khidr already uses Sentry for technical feedback.** What's missing is a product-feedback channel.

**Options:**
1. **In-app feedback form that creates an Inbox conversation** (recommended) — user submits feedback via a modal in `/dashboard`, gets a confirmation in their `/dashboard/inbox`, and Khidr's reply (with possible bonus credits) lands in the same inbox thread. This is *the most coherent design* — feedback and rewards live in the same surface where they originate.
2. Canny / Featurebase — adds external dependency, brand inconsistency, monthly cost. Israf for INDXR's stage.
3. GitHub Discussions — free but assumes technical audience; INDXR's audience is mixed.

**Recommendation: build a minimal in-app feedback modal that writes to the Inbox** — same architectural bones as the Inbox itself, no new surface, no new external tool. The Inbox absorbs the feedback flow. This is genuine Coherence Over Local Optimization.

### 3.5 Referral / Community — recommended **architectural placeholder only, pre-launch**

INDXR pre-launch has no community to reward. Building referral infrastructure now is speculative — Israf.

**Recommendation: don't build pre-launch.** But ensure the Inbox and credits architecture support a future referral flow without rework — i.e., credit grants can be tagged with a source ("referral", "feedback", "welcome"), and the inbox can carry referral-flavored messages.

### 3.6 Status page — recommended **NO pre-launch; defer indefinitely**

For a solo-dev SaaS, a status page (`status.indxr.ai`) is theatre — incidents are rare, the dev is the entire ops team, and a status page commits to a level of availability monitoring that's hard to sustain alone.

**Recommendation: don't build.** When INDXR has paying customers asking about uptime, revisit. A simple `/changelog` entry for an incident is more honest than a status page that shows green when nobody's checking.

### 3.7 Profile / Public profile — recommended **NO**

INDXR's transcripts are personal. There is no community feature that would benefit from public profiles. Building one is decoration without function — Israf.

**Recommendation: don't build, ever, unless a clear use case (e.g., shared transcripts, team libraries) emerges.**

### 3.8 API documentation — recommended **plan for `/docs/api` post-launch**

If INDXR ships an API in v2, it lives at `/docs/api` — a sub-section of docs, not a separate surface. Stripe/Resend/Supabase all converge on this pattern. Pre-launch: nothing to build.

### 3.9 Onboarding tour vs. onboarding page — recommended **onboarding page + opt-in tour**

The current `/onboarding` (renamed Welcome — see §2e) is a static page. An interactive tour is a separate question.

**Reference patterns:** Notion, Linear, and most modern SaaS have abandoned forced first-time tours in favor of *contextual hints* (small dismissible callouts on first encounter with a feature). Forced tours are Israf — they delay the user from value.

**Recommendation:** keep the static Welcome page (sets expectations, surfaces credit balance, points to first action). Skip the interactive tour pre-launch. Post-launch, add 1–2 contextual hints on the Transcribe page ("Paste a YouTube URL to start") — these earn their place via Itqan, not because users need them but because the empty state deserves the same care as the populated state.

### 3.10 First-transcription guidance / WelcomeCreditCard expansion — recommended **expand thoughtfully**

The existing WelcomeCreditCard is good. It can grow into a richer "first run" surface on `/dashboard` (Home) that:
- Shows credit balance
- Offers a "Transcribe your first video" CTA with a paste-input
- Links to `/docs/getting-started` for users who want to read first

This is Itqan applied to the empty Home state. Recommended for v1 polish.

### 3.11 RECOMMENDATION FOR INDXR — Missing Pages

**Build pre-launch (v1):**
1. `/dashboard/inbox` — minimal Message Center
2. `/changelog` — public, seeded with 4–6 honest entries
3. In-app feedback modal that writes to Inbox (same architecture)
4. Expanded WelcomeCreditCard / first-run guidance on `/dashboard`

**Defer to post-launch v1:**
5. Roadmap (`/roadmap`) — only if user feedback volume warrants
6. Contextual onboarding hints (1–2 only, on Transcribe page)

**Defer indefinitely / don't build:**
7. Status page
8. Public profile
9. Referral surface (architectural placeholder only)
10. Forced onboarding tour

**API docs (`/docs/api`):** ready when API ships.

This satisfies No Israf — every new surface earns its place against a concrete pre-launch use case — while honoring Khidr's recent feedback that beauty/husn carries meaning. The Inbox in particular adds *more weight*, not less, to the product, because admin-to-user dialogue is exactly where INDXR's "honest, hand-crafted" voice differentiates.

---

## 4. Knowledge Base Positioning & Discovery

### 4.1 Reframe: docs is a product surface, not SEO bait

The 31 articles already exist. The IA fix in §1 promotes them from footer-buried to first-class. This section addresses *positioning and discovery* — how to make them *feel* deliberate rather than scrap.

### 4.2 Reference: how docs-as-product products do it

- **Stripe** treats docs as the product for developers. Docs *are* the marketing because the audience evaluates Stripe by trying to integrate.
- **Vercel** layers docs with templates and guides — discovery is task-oriented, not topic-oriented. Users arrive looking to deploy a Next.js app, not to learn about Vercel's CDN.
- **Resend** docs are flat, deeply integrated with the product — the "Send your first email" tutorial *is* the value prop demo.
- **Plausible** runs comparison and use-case content (`/vs-google-analytics`, `/for-bloggers-creators`) inside docs, treating docs as both education and SEO. INDXR's existing 31 articles are exactly this pattern — they *are* the model.

### 4.3 INDXR's audience differs from these examples

INDXR's audience mixes technical (RAG developers, podcasters with technical workflows) and non-technical (students, journalists, content creators, Notion/Obsidian users with workflow-but-not-code mental models). This means:
- Docs cannot be developer-only in voice (Resend's pure-code approach won't fit)
- Docs cannot be too consumer-marketing in voice (Plausible's comparison-page voice would alienate the technical audience)
- The right voice is **plain-language, honest about limitations, occasionally code-flavored when integration content warrants**

This is exactly the voice Khidr already writes in the existing articles. The IA promotion is the main lift; voice is mostly there.

### 4.4 Discovery patterns for INDXR

**Sidebar navigation (left):**
Stable, hierarchical, anchored as the user reads (Stripe pattern). Sections (Getting started, Transcribe, Export, Integrations, Account, FAQ) each expandable, current article highlighted, parent-child relationships visible. Scrollable independently of main content.

**Search:**
Top of sidebar (and `Cmd-K` later). Pagefind static index over MDX content. Returns article titles + matched snippets.

**Categorization:**
Per §1.4 — primary by user task (transcribe, export, integrate, account), secondary by facets exposed via tags (CSV, SRT, Notion, RAG). Tag pages can be lightweight `/docs/tags/[tag]` views without their own SEO ambition.

**Cross-linking from app to docs (contextual help):**
This is the highest-leverage move and the clearest expression of Itqan in the Invisible.

- On `/dashboard/transcribe`, the URL-input form has a small `?` next to the label "YouTube URL" that opens a slide-over with the relevant subset of docs (transcript availability, age restrictions, private videos).
- On `/dashboard/library/[id]`, the Export menu has a "What format should I use?" link that opens `/docs/export`.
- On `/dashboard/account`, billing-related help links to `/docs/account/credits`.

This is the Stripe global-search-from-anywhere pattern simplified: contextual help is a *panel*, not a separate page navigation. The user stays in flow.

**Auth-gated content:**
None recommended pre-launch. The content is honest, the SEO benefit of openness is real, and gating creates a perceived information-hierarchy that doesn't match the product's spirit. If post-launch INDXR adds advanced API content that genuinely requires authentication context (e.g., "your org's API rate limits"), that earns its gating. Until then — open.

### 4.5 Article quality calibration

The existing 31 articles cover real questions and are honest about limitations (per Khidr's note). They serve dual purpose (SEO + reference) well.

**Flag for editorial pass (post-Batch 3):**
- Consistency of voice across articles (some may have drifted; a single editorial pass will harmonize)
- Cross-linking from each article into 2–3 related articles (currently weak — most exist as orphan SEO landing pages with no internal-link graph)
- Each article should end with a "Related" section linking to 2–3 sibling articles
- Each article should have a clear opening sentence that states the answer before the elaboration (Stripe/Plausible pattern)

These are voice/copy concerns, not IA concerns — flag for a future batch, not Batch 3A.

### 4.6 Knowledge graph / cross-linking

A docs site of 31+ articles benefits enormously from internal linking. Per the SEO research consulted, internal links:
- Help search engines discover and prioritize pages
- Pass link equity from high-authority pages (homepage, popular SEO articles) to deeper articles
- Reduce orphaned pages (orphan pages can be ignored by Google entirely)

**Recommendation:**
1. **Sidebar navigation** is itself an internal-linking surface — every docs page links to all major sections.
2. **"Related articles" footer** on every docs page — 2–3 manually curated links to siblings.
3. **In-body links** where contextually natural (e.g., the CSV article naturally references the JSON article; the Notion article references the Markdown export article).
4. **From product to docs** — every contextual help panel in the dashboard links to a specific article, distributing internal-link signal from authenticated routes (which Google doesn't index but follows from the dashboard's link graph).

The graph should be *manual and considered*, not auto-generated. Auto-generated link bots (criticized in the SEO research) tend to overlink and dilute.

### 4.7 RECOMMENDATION FOR INDXR — Knowledge Base Positioning

1. **Promote `/docs` to top-level navigation** (already covered in §1).
2. **Anchored left sidebar** with hierarchical sections — Getting started, Transcribe, Export, Integrations, Account, FAQ.
3. **Pagefind static search** — small, free, no-dependency, fast.
4. **No auth gating** — docs are open and serve both prospects and users.
5. **Contextual help slide-over** in the dashboard — `?` icon on each major page opens relevant docs.
6. **"Related articles" footer** on every docs page (2–3 manual links).
7. **Editorial pass deferred** to a later batch — flag inconsistencies but don't rewrite in 3A.

Tested against principles: Honest Materiality (docs are docs, not "academy"); Itqan (the empty docs-search state, the "no results" state, the article-not-found 404 — all designed); Husn (sidebar anchored, typography matching the product, contextual `?` adds presence); Quiet Quality (no banners, no growth-hack popovers); Inclusive (search keyboard-reachable, sidebar collapsible on mobile, proper landmarks); Coherence (one search across docs, one help pattern across product); No Israf (no Algolia, no Beamer, no third-party widgets pre-launch).

---

## 5. URL Stability vs. Internal Naming — Technical Strategy

### 5.1 Core principle reaffirmed

Khidr's instruction: SEO URLs (e.g., `/youtube-transcript-csv`) stay stable. Internal navigation labels and anchor text can change freely. This is **architecturally correct** and aligns with Google's own guidance: changing internal navigation doesn't move URL authority, but changing URLs requires careful redirect management.

### 5.2 Next.js App Router patterns

In Next.js App Router, URL slugs and link text are fully decoupled:
- The URL is determined by the file path: `app/youtube-transcript-csv/page.tsx` → `/youtube-transcript-csv`
- The link text in nav components is just JSX: `<Link href="/youtube-transcript-csv">CSV export guide</Link>`

The architecture for *presentation labels vs. URL slugs*:

```typescript
// content/docs/index.ts — single source of truth
export const docsConfig = {
  sections: [
    {
      label: "Getting started",
      slug: "getting-started",
      pages: [
        { href: "/docs/getting-started", label: "Welcome to INDXR" },
        { href: "/docs/getting-started/your-first-transcript", label: "Your first transcript" },
      ],
    },
    {
      label: "Transcribe",
      pages: [
        { href: "/youtube-transcript-availability", label: "Why some transcripts aren't available" },
        { href: "/age-restricted-youtube-videos", label: "Age-restricted videos" },
        { href: "/private-youtube-videos", label: "Private and unlisted videos" },
      ],
    },
    {
      label: "Export",
      pages: [
        { href: "/youtube-transcript-csv", label: "Export to CSV" },
        { href: "/youtube-transcript-srt", label: "Export to SRT (subtitles)" },
        { href: "/youtube-transcript-json", label: "Export to JSON" },
      ],
    },
    // ...
  ],
};
```

The `href` values are the existing SEO URLs (untouched). The `label` values are the new presentation strings — sidebar text, breadcrumb text, internal-link anchor text. This config drives the docs sidebar component, the breadcrumb component, and any "Related articles" sections.

This pattern means:
- Reorganizing the sidebar (moving an article from "Export" to "Integrations") requires only a config edit
- Renaming a label requires only a config edit
- The URL never changes
- Google never sees a redirect or lost authority

### 5.3 When URLs DO need to change

Cases where URL change is legitimate:
1. A typo in the existing URL
2. A genuinely confusing slug that hurts CTR even though it ranks
3. Consolidation of two articles that compete for the same query (keyword cannibalization)

**Strategy when this happens:**
- 301 permanent redirect from old to new — preserves the bulk of link authority
- Update internal links to point at new URL (Google's guidance: "link consistently to the URL you consider canonical")
- Update sitemap.xml entry
- Allow 2–4 weeks for Google to re-crawl and re-index

For INDXR's existing 31 SEO URLs, **none of these conditions clearly apply** based on the existing route names visible in the brief. The URLs are already keyword-aligned (`/youtube-transcript-csv`, `/notion-youtube-transcript`). No change recommended unless a specific URL is identified as problematic.

### 5.4 Internal linking from app to docs

When the dashboard links to a docs article, two URL options exist:

**Option A: link directly to the existing SEO URL** — `<Link href="/youtube-transcript-csv">`
- Pro: simplest, no rewrites, shares URL with public visitors
- Con: the URL slug doesn't read well in a "presentation-friendly" sense (slug looks like a marketing keyword phrase)
- Con: if INDXR ever decides to rebrand the docs portion of these URLs (e.g., move them under `/docs/`), this link breaks (or requires a redirect)

**Option B: introduce a docs-prefixed alias** — `<Link href="/docs/csv-export">` which rewrites/redirects to `/youtube-transcript-csv`
- Pro: cleaner internal URL pattern; future-proofs against rebrand
- Con: introduces a duplicate route surface; Google must be told which is canonical
- Con: more code to maintain

**Recommendation: Option A for now.** The existing SEO URLs *are* the canonical addresses. Linking to them from the dashboard preserves link consistency. If INDXR ever wants to restructure URLs in the future, that's a separate migration, not part of Batch 3A.

### 5.5 Internal docs vs. public docs — should they be the same content?

This is the key question. Three architectures considered:

**Architecture 1: Single content, single URL** (recommended)
The 31 existing SEO URLs *are* the docs. There's no separate `/dashboard/docs` route. The dashboard's `?` help slide-over fetches and renders the same MDX content from the same URLs as `/docs`.
- Pro: one source of truth; no canonical confusion; SEO authority unchanged
- Pro: no duplicate content concerns
- Con: when an authenticated user views docs, the URL shown in their browser is the public URL (e.g., `/youtube-transcript-csv`), not a `/dashboard/...` URL — they "leave" the dashboard visually. Mitigation: the slide-over panel keeps them inside the dashboard layout, so the URL change is contextual not visual.

**Architecture 2: Duplicate content under `/docs/` with canonical tags pointing back to existing URLs**
Add `/docs/transcribe/csv-export` as a parallel URL with the same content, with `<link rel="canonical" href="/youtube-transcript-csv">`.
- Pro: cleaner internal URL hierarchy
- Con: actively introduces duplicate-content management; canonical tags work but are a "weak signal" per Google's docs
- Con: maintenance overhead — two URLs to keep synchronized
- Con: israf

**Architecture 3: Layer ON a `/docs` index page that links to existing URLs** (pragmatic compromise)
`/docs` is a *new* page — a curated directory of links to the existing 31 SEO articles, organized by section. The articles themselves don't move. The sidebar on each article comes from the same shared docs config (per §5.2) and is rendered consistently across all 31 article pages.
- Pro: existing URLs untouched
- Pro: single source of presentation truth (the config)
- Pro: `/docs` itself ranks for "INDXR docs" / "INDXR documentation" queries
- Con: very minor — `/docs` itself becomes a new route to maintain, but it's a thin index page

**Recommendation: Architecture 3** — keep all 31 existing SEO URLs, layer on a `/docs` umbrella index that organizes them, and render a consistent docs-shell (sidebar, breadcrumb, related articles) on each existing article via the shared config. This:
- Preserves all SEO authority (no URL changes)
- Promotes docs to first-class navigation (per §1)
- Avoids duplicate-content traps (no canonical complexity)
- Achieves the "knowledge base feel" Khidr wants
- Is simpler to maintain than Architecture 2

### 5.6 What does Stripe do, and why isn't it right for INDXR?

Stripe runs `docs.stripe.com` as a separate Next.js application from `stripe.com`. This makes sense for Stripe because:
- The docs are a multi-thousand-page tree
- Multiple teams (DocOps, DevRel, Product Marketing) own different sections
- The docs require their own infrastructure (search, code playgrounds, API explorers)

For INDXR — single domain, ~31 articles, solo dev — the subdomain split is theatrical Israf. `indxr.ai/docs` is the right scale.

### 5.7 RECOMMENDATION FOR INDXR — URL & Linking Strategy

1. **Keep all 31 existing SEO URLs unchanged.** No redirects needed.
2. **Add `/docs` umbrella index page** — a curated directory rendering the docs config from §5.2.
3. **Render a shared docs shell** (sidebar, breadcrumb, related articles, footer) on the umbrella page AND on each of the existing 31 article routes, via a Next.js layout (`app/(docs)/layout.tsx`) or per-page composition. Same shell, same nav, regardless of URL.
4. **Maintain a single docs config** (`content/docs/index.ts`) as the source of truth for sidebar structure, labels, and groupings. Article URLs are stable; their *position in the sidebar* is config-driven.
5. **Internal app-to-docs links** point directly at existing SEO URLs (Option A in §5.4).
6. **`/faq` deprecates with a 301 redirect** to `/docs/faq` (where the existing FAQ content moves) — this is the only URL change recommended.
7. **`/account/credits` removes** with a 301 to `/dashboard/account` (Khidr already noted this as legacy).
8. **`/dashboard/settings` removes** if Recommendation 2.d Option 1 is accepted, with a 301 to `/dashboard/account`.

Net URL change footprint: 3 redirects total. All for clear consolidation reasons. SEO impact negligible.

---

## 6. Cross-cutting — IA & Brand Coherence

### 6.1 How these IA + naming choices reinforce the design principles

| Decision | Honest Materiality | Itqan | Husn | Quiet | Inclusive | Coherence | No Israf |
|---|---|---|---|---|---|---|---|
| `/docs` as primary nav | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verb "Transcribe" + accent "Index" | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Library kept | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Home over Dashboard | — | — | ✅ | ✅ | ✅ | — | — |
| One Account page | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inbox added | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Changelog added | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| No Roadmap pre-launch | ✅ | — | — | ✅ | — | — | ✅ |
| URLs stable | ✅ | — | — | ✅ | — | ✅ | ✅ |
| Welcome / Account paused (relabeled) | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |

The pattern: every recommendation is *quiet* (small surface, restrained language), *coherent* (one verb, one noun, one Account), *honest* (labels describe content), and *inclusive* (no idiom, no jargon). Husn appears not as ornament but as the result of restraint applied with care — the empty Inbox state, the Welcome page, the Account paused page.

### 6.2 Connection to Batch 1 (identity) decisions

- **IBM Plex Sans / Mono variable** with multi-script support — the docs sidebar will hold long article titles in many languages cleanly; the Inbox messages can render Arabic, CJK, Devanagari without visual disruption. The naming language ("Transcribe," "Library," "Home") is fully script-neutral.
- **Warm-tinted neutrals + amber accent** — the docs hierarchy can lean entirely on neutral surfaces with the amber accent reserved for the current-section indicator in the sidebar (one accent per page).
- **OKLCH color** — the inbox unread badge, the changelog "New" pill, the docs "Recommended" tag all draw from the same OKLCH ramp, ensuring perceptual consistency.
- **Hexagon Level A+** — the docs landing page (`/docs`) and the Welcome page are exactly the surfaces where a low-opacity hexagon background pattern earns its keep — these are pages where users orient themselves, where a small amount of branded visual texture says "you are still in INDXR's house." Not on every dashboard page; on the *landing/wayfinding* pages.

### 6.3 Connection to Batch 2 (architecture) decisions

- **Token architecture, layout, mobile patterns** — the new sidebar in `/docs` and the slide-over `?` panel both reuse Batch 2's drawer/panel primitives. No new patterns needed.
- **Next.js conventions** — the `app/(docs)/layout.tsx` route group + shared docs config is a natural fit for App Router. The Inbox, Changelog, and `/docs` umbrella are all simple route groups.
- **WCAG 2.2 AA** — the sidebar is fully keyboard navigable; the slide-over panel traps focus correctly; the Inbox uses proper ARIA live regions for new-message announcements; all label changes preserve semantic relationships.

### 6.4 What this enables for Batch 3B (UX patterns, sidebar, editor, aesthetic direction)

Batch 3A locks down *what* is in the navigation and *what it's called*. Batch 3B can now focus on *how it looks and feels*:

- The sidebar component (docs sidebar, dashboard sidebar) — already constrained to a known set of items and labels
- The transcript editor / library detail view — knows its place in the IA (`/dashboard/library/[id]`)
- The empty states (no transcripts, no messages, no docs results, no changelog yet) — the surfaces are now defined; their crafted copy and visual treatment are Batch 3B work
- The aesthetic direction — knowing the navigation has 5 marketing items and 5 dashboard items lets Batch 3B size and weight visual elements correctly without later rework

### 6.5 Naming/IA decisions that enable a coherent "INDXR voice"

The voice rules in §2.4 are the seed of the INDXR voice without a heavy theme:

1. Direct verbs ("Transcribe," "Open," "Export")
2. Plain-language empty states ("No transcripts yet — try transcribing your first video")
3. Honest error states with linked help ("We couldn't reach this video — it may be private or age-restricted. [Learn more]")
4. Inbox messages from "INDXR" or "Khidr" — an actual human signature where it matters
5. The word "Index" / "indexing" used 1–2 times in marketing as a quiet thematic anchor

This is enough thematic cohesion to feel deliberate, not enough to feel costumed. It scales to international audiences because no English idiom carries the brand weight — the brand is carried by the consistency of the verbs, the warmth of the empty states, and the personal touch of the Inbox.

### 6.6 What this research does not solve

Honest scoping for Khidr:

1. **Voice / copywriting pass** on the existing 31 articles — flagged in §4.5; needs its own batch
2. **Cmd-K command palette** — recommended for post-launch v1; not designed in 3A
3. **Visual treatment of sidebar / docs shell / Inbox UI** — Batch 3B
4. **Mobile-specific IA** (does the sidebar collapse to a hamburger? a bottom-nav?) — partially Batch 2, finishes in 3B
5. **Internationalization of routes** (does INDXR ever have `/id/docs` for Indonesian?) — not in scope; defer
6. **Marketing site homepage IA** (sections, hero structure) — partially Batch 1, finishes in 3B/3C

These are flagged as known-deferred so the synthesis document `wiki/design/system.md` can carry them forward.

---

## Summary — quick-reference recommendations

**Sitemap deltas:**
- Add: `/docs` (umbrella), `/changelog`, `/dashboard/inbox`
- Remove: `/faq` (→ /docs/faq, 301), `/account/credits` (→ /dashboard/account, 301), `/dashboard/settings` (→ /dashboard/account, 301)
- Keep: all 31 SEO URLs, all dashboard URLs, all admin URLs

**Naming deltas:**
- Dashboard → **Home**
- Settings + Account → **Account** (one page, sectioned)
- Suspended → **Account paused**
- Onboarding → **Welcome**
- Library, Transcribe, Pricing, Support, How it works, Admin → unchanged
- Add Inbox, Changelog as labels

**New surfaces (pre-launch v1):**
1. `/docs` umbrella + sidebar shell
2. `/changelog` (seeded with 4–6 entries)
3. `/dashboard/inbox` (minimal, supports Khidr's personal credit-bonus messages)
4. In-app feedback modal that writes to Inbox
5. Expanded WelcomeCreditCard / first-run guidance on Home
6. Contextual `?` slide-over panel on dashboard pages (links to relevant docs)

**Deferred:**
- Roadmap, Status page, Public profile, Forced onboarding tour, Algolia/Beamer/Canny/Productlane/external tooling, API docs (until API ships), Cmd-K palette (post-launch v1)

**Voice baseline (for Batch 3B):**
- Direct verbs
- Plain-language empty/error states
- Honest about limitations, linked to docs
- Inbox messages signed by a real human
- "Index" as quiet thematic accent in marketing only — not in product UI labels

This document, paired with Batch 3B, will form the IA and naming foundation of `wiki/design/system.md`. The decisions above prioritize **quiet, coherent, honest** structure — adding weight (Inbox, Changelog, docs as first-class) where it carries meaning, and refusing weight (Roadmap, Status, third-party tooling) where it would be israf.
# INDXR.AI — Brand Identity Foundation Research (Batch 1)

**Audience:** Khidr (founder)
**Purpose:** Source material for `wiki/design/system.md`
**Scope:** Five foundational decisions (typography, default theme, color philosophy, type scale, geometric language) plus cross-cutting coherence
**Testing lens:** Seven internal "ihsan" design principles (Honest Materiality, Itqan in the Invisible, Functional Beauty, Quiet Quality, Inclusive by Default, Coherence, No Waste)
**Date:** 29 April 2026

---

## 0. Executive summary — leeswijzer

This document does not prescribe one answer; it ranks options with explicit reasoning so you can decide. The high-conviction recommendations, summarised:

| Area | Recommended | Runner-up | Reject |
|---|---|---|---|
| **Sans family** | **Inter (variable, with Inter Display for ≥20px)** | IBM Plex Sans (best multi-script, less neutral) | Keeping Geist Sans as primary |
| **Mono family** | **JetBrains Mono (variable, no-ligature variant)** | Geist Mono | Berkeley Mono (license cost + IDE restrictions) |
| **Default theme** | **`system` (with explicit user override, persisted)** | Light-default | Hard-coded dark-default (current) |
| **Color philosophy** | **Near-monochrome neutrals + one calm accent (low-saturation amber/ochre, *honingtoon*) + minimal semantic set** | Pure monochrome, no accent | Broad multi-hue palette |
| **Type scale** | **1.200 (Minor Third), 16 px base, 3 weights (400/500/600), tight set of 7 sizes, 4-px rhythm with 8-px alignment** | 1.250 Major Third | Golden ratio (too dramatic for dense UI) |
| **Hexagon level** | **A: minimal — logo + credit "coin" only; everything else is a square/4-px grid system** | B: subtle structural (hexagon influences icon corner radii) | C: visual motif everywhere |

The cross-cutting argument: each of these choices makes the *next* one easier. Inter's tall x-height and tabular figures pair with a 1.200 scale at 16 px base; a near-monochrome palette removes the burden of picking exact hexagon-themed colors; a `system` default removes the political question of "is dark or light more INDXR"; a 4-px rhythm is incompatible with hexagonal grids without compromise — confirming Level A is the right hexagon answer.

---

# 1. Font selection

## 1.1 Landschap 2025–2026

The SaaS typography landscape in 2025 has crystallised into three patterns, documented across audits of 30–50 SaaS companies (FullStop, SaaS Landing Page catalogue):

1. **Inter as default infrastructure.** Inter served roughly 414 billion Google Fonts requests in the year ending May 2025 (FullStop, citing Google Fonts data), a ~57 % YoY increase. It is in production at Linear (`Inter UI` declared in their CSS via Typ.io capture), Notion, Mozilla, GitHub product (with Mona Sans for marketing/brand), Shopify, and Vercel's older properties. SaaS Landing Page catalogued 500+ SaaS websites and found Inter on 182 of them; Graphik was second at 21.
2. **DevTools open-sourcing house fonts.** Vercel built Geist (OFL, 2023), GitHub built Mona Sans + Hubot Sans (OFL, 2022), GitLab built GitLab Sans, Wise built Wise Sans (with NaN foundry, supporting 342 languages). All released under permissive licences. The motive is identity differentiation without lock-in.
3. **Fintech/premium brands paying for licensed grotesques.** Stripe replaced Camphor with Klim's Söhne in 2020 (Fonts in Use, Sept 2020); Ramp uses TWK Lausanne; Robinhood uses DIN. The "free Google Font" signal is rejected when trust is the product.

The strategic question for INDXR: which pattern matches a transcript-extraction tool?

You are *not* fintech (signal: trust through restraint, not premium swagger). You are *adjacent to* developer tools (RAG/AI developers are part of your audience, mono fonts matter), but you are equally adjacent to *journalism and academia* (long-form reading, multi-language transcripts), which leans toward humanist neutrality rather than geometric coldness. This double constraint drives the shortlist below.

## 1.2 Candidates evaluated

### Geist Sans (current) — ASSESS
- **Provenance:** Vercel + Basement Studio, 2023, OFL (Vercel Geist Font page).
- **Influences (per official repo):** Inter, Univers, SF Mono, SF Pro, Suisse International, ABC Diatype Mono, ABC Diatype.
- **Variable font:** yes (weight axis), npm-distributed via `geist/font/sans` (works natively with `next/font/local`, your current setup).
- **Multi-script:** ⚠️ The Geist homepage states "32 languages." GitHub Issue #22 on `vercel/geist-font` confirms there is no official list. Issue #36 explicitly reports "No Cyrillic support" — this was *partly remedied* in a later release ("redesigned Cyrillic script for all Geist and Geist Mono styles," per the v1.x release notes), but **CJK, Arabic, Hebrew, Devanagari, Thai are not supported**.
- **Notable users:** Vercel itself, Next.js docs, v0, alephic.com, much of the post-2023 Next.js starter ecosystem.
- **Test against the 7 principles:**
 - *Honest Materiality* ✓ — Vercel publishes its design intent ("Swiss principles, simplicity, minimalism, speed").
 - *Functional Beauty* ✓ — well-tuned at 12–14 px UI sizes.
 - *Inclusive by Default* ✗ — A transcript SaaS targeting journalists, researchers, and podcasters who may transcribe Arabic news, Mandarin lectures, or Russian podcasts cannot ship a sans that fails CJK and Arabic. This is the disqualifying point.
 - *Coherence* ⚠️ — Geist Sans + Geist Mono pair beautifully, but if you fall back to Noto for Arabic/CJK you get a script-mismatch problem (different x-heights, weights, optical adjustments). This breaks coherence at the exact moments where it matters most.
 - *No Waste* ✓ — small file (variable), npm-managed, no FOUT issues with `next/font/local`.

### Inter — TOP CANDIDATE
- **Provenance:** Rasmus Andersson, 2017, OFL. Originally seeded inside Figma, now community-maintained at github.com/rsms/inter.
- **Variable font:** yes — `Inter var` and `InterVariable.woff2`. Optical-size axis was added (Inter Display is the >20 px optical size variant).
- **Multi-script:** ✓ — Inter ships glyphs for Latin (extended), Greek, Cyrillic (full, including the variants designed for Bulgarian / Russian / Serbian), and Vietnamese, with broad currency and math symbol support. For Arabic / CJK, Inter relies on script-aware fallbacks (Noto Sans Arabic, Noto Sans CJK), with optical-metric matching that is intentional and well documented (Wise's localisation team forked Inter to *Wise Sans* in part because Inter's Latin scaffolding paired so cleanly with extension scripts).
- **Pairing:** The de-facto pairing is Inter + JetBrains Mono. Both share generous x-heights and humanist proportions. Linear ships exactly this stack.
- **Notable users:** Linear, Notion, Mozilla Firefox (web properties), GitHub (UI before Mona Sans took marketing), Vercel (older properties), elementary OS, Pixar Presto UI (per Andersson's `rsms.me/work/inter` work page). Wise built Wise Sans on Inter foundations.
- **Performance:** ~150 KB woff2 single variable file; CDN at rsms.me/inter; perfect Next.js `next/font/google` support.
- **Test against the 7 principles:**
 - *Honest Materiality* ✓ — open-source, no premium-mimicking effects.
 - *Functional Beauty* ✓ — Inter exists *for* on-screen reading; the optical-size axis explicitly targets text vs display contexts.
 - *Quiet Quality* ✓ — Inter is so neutral some critics call it boring; that boringness is the point. It supports the user's transcript without competing with it.
 - *Inclusive by Default* ✓ — slashed zero, dotted-i alternates, contextual punctuation, tabular figures, Cyrillic + Greek + Vietnamese. Combined with Noto fallbacks, it is the most inclusive Latin-rooted UI font you can ship.
 - *Coherence* ✓ — single family covers UI text, display, and (with InterVariable) every weight you need.
 - *No Waste* ✓ — one file via variable axis; CSS `font-feature-settings: "tnum", "ss01"` configurable.
- **The critique** (FullStop's line: "if everyone uses Inter, you look like every other SaaS"): true, but the seven principles explicitly reject *brand differentiation through type* as a goal. Inter's genericness is aligned with *Quiet Quality*. Distinctiveness comes from the logo, the colour philosophy, the editor experience — not the font.

### IBM Plex Sans — STRONG CONTENDER (especially if multi-script is a near-term priority)
- **Provenance:** Mike Abbink + Bold Monday for IBM, 2017, OFL.
- **Multi-script:** ✓✓ — the most internationally complete free family available. Plex covers extended Latin, Cyrillic, Greek, Arabic, Hebrew, Devanagari, Thai (looped & loopless), and as of March 2025, Sandoll completed IBM Plex Sans CJK — Traditional Chinese, Simplified Chinese, Japanese, Korean — bringing the family to over 100 languages from a single coherent design system (IBM Plex `languages` page; BusinessWire, March 2025).
- **Variable font:** yes (Plex Sans Variable since April 2019), but **the variable axes are weight-only**, no width/slant axes like Mona Sans.
- **Personality:** humanist grotesque, inspired by Franklin Gothic with Bodoni-derived Serif companion. Slightly warmer and less neutral than Inter; some characters (single-storey g, angled terminals on certain weights) carry visible character.
- **Pairing:** Plex Sans + Plex Mono is a complete same-family pairing — the same advantage as Geist, but with vastly better multi-script support.
- **Test against the 7 principles:**
 - *Honest Materiality* ✓ — IBM publishes the design rationale openly; OFL.
 - *Inclusive by Default* ✓✓ — best-in-class for a transcript app where Arabic, CJK, and Devanagari content is realistic.
 - *Quiet Quality* ⚠️ — Plex has slightly more personality than Inter. For a transcript app, this can actively help (it feels less generic) or get in the way (a strong italic g can distract over a 60-minute reading session). This is a taste call.
 - *No Waste* ⚠️ — if you don't load the multi-script subsets, you're paying for warmth you could get from Inter. If you *do* load them, you pay file-size cost. Subsetting strategy is mandatory.

### Mona Sans — SECONDARY CONTENDER
- **Provenance:** GitHub + Degarism Studio, 2022 (v2.0 in 2024), OFL.
- **Variable axes:** weight, width (75 %–125 %), slant, italic, plus an optical-size axis (1–100). The most multi-axis variable open font widely available.
- **Multi-script:** Latin only (extended). No Cyrillic, Greek, Arabic, CJK in the official build. **This rules it out for INDXR's audience.** It's mentioned only because of its industrial design quality and potential as a *display-only* font.
- **Specifically for INDXR:** if you ever wanted a marketing-page heading font with character (condensed, expressive), Mona Sans width axis is interesting — but adding it costs *No Waste* and *Coherence* unless used very sparingly.

### Other contenders surveyed and rejected
- **DM Sans, Manrope, Figtree** — all viable open-source UI sans-serifs, all weaker than Inter on multi-script and used by fewer comparable products. No strategic reason to pick over Inter.
- **Söhne, Founders Grotesk, GT America** — licensed, $$$, used by Stripe/Notion-esque companies. Premium signalling actively conflicts with *Honest Materiality* and *Quiet Quality* given INDXR's pre-launch stage. Re-evaluate post-PMF.
- **Public Sans** (US GSA) — admirable accessibility-first design; lacks the optical refinement of Inter at very small sizes.
- **Lato, Source Sans, Roboto** — solid but dated for a 2025–2026 launch.

### Mono shortlist

| Font | Lic. | Variable | Ligatures | Best for | Verdict |
|---|---|---|---|---|---|
| **JetBrains Mono** | OFL | yes | optional (NL = no-ligature variant ships in zip) | code blocks, timestamps, transcript metadata | **Pick this** |
| **Geist Mono** | OFL | yes (weight) | no | matches Geist Sans | Pick if you keep Geist Sans |
| **IBM Plex Mono** | OFL | partial | no | matches Plex Sans | Pick if you pick Plex Sans |
| **Berkeley Mono v2** | $75 dev / commercial $$$ | yes (3 axes) | 150+ optional | premium aesthetic | Reject — see below |
| **Commit Mono** | OFL | yes | no | minimalist alternative | Backup option |
| **Fira Code, Cascadia Code** | OFL | varies | yes (heavy) | code-heavy IDEs | Avoid — ligatures in transcripts can corrupt token-level meaning |

**Berkeley Mono is the only paid font worth a paragraph.** It's beautiful (Tobias Lütke and other Hacker News voices vouch for it). But its commercial licence "is not compatible with open-source apps" and "commercial use [is] restricted to UI elements only" — explicitly excluding "IDE, Terminal app, Text Editor, etc." (usgraphics.com). Tiptap is rich-text editing, which is borderline; you'd need to email them. The licence cost is fine; the compliance ambiguity is not. Reject by *Honest Materiality* (no premium signalling that is contractually fragile) and *No Waste* (procurement overhead for marginal aesthetic gain).

**Reject ligature-heavy mono for transcripts.** A transcript timestamp `00:01:32 -> 00:02:15` rendered with Fira Code becomes `00:01:32 → 00:02:15` — the ligature merges `->` into a glyph that *is no longer the literal characters in the text*. For a tool whose entire value proposition is faithful transcript representation, this fails *Honest Materiality* in a way that no aesthetic preference can excuse. JetBrains Mono ships a "NL" (no-ligature) variant in the official archive — use it.

## 1.3 Variable vs static, and the licensing matrix

**Variable fonts** are now the default in 2025 across all serious modern type. For Inter, IBM Plex, Geist, Mona Sans, JetBrains Mono — all five — the variable woff2 is a single file under ~250 KB that replaces 9–18 static weights, dramatically reducing CLS and request count. With Next.js 15 + `next/font` (your stack), the framework subsets, self-hosts, and preloads automatically. There is no remaining technical reason to ship static weights for a greenfield SaaS in 2026 *unless* you need a weight outside the variable axis range, which none of the recommended fonts require.

**Licence** for all OFL fonts: free for commercial bundling with software/products; you cannot resell the font itself or derivatives. SIL OFL 1.1 is universally compatible with SaaS distribution, including embedding in PDFs and rendering in user-generated content. No counsel needed.

## 1.4 RECOMMENDATION FOR INDXR — Fonts

**Ranked options:**

1. **🥇 Inter (Variable) + JetBrains Mono NL (Variable) — RECOMMENDED**
 - Inter for all UI, body, headings (use Inter Display optical-size variant for ≥20 px once shipped publicly via the Inter v4+ optical axis).
 - JetBrains Mono no-ligature for code blocks, timestamps, all monospace-tagged transcript metadata, video IDs.
 - **Reasoning per principle:**
 - *Inclusive by Default* — Latin/Greek/Cyrillic/Vietnamese native; clean fallback path to Noto Sans Arabic/CJK with comparable x-height. Tabular figures, slashed zero, dyslexia-friendly alternates available via OpenType `ss01..ssXX`.
 - *Quiet Quality* — Inter is the most-tested screen font in the world; it disappears, which is the goal. The transcript is the content; the font is *Itqan in the Invisible*.
 - *Honest Materiality* — open-source, well-documented, no fake premium signal.
 - *No Waste* — two woff2 files, ~400 KB total, served via `next/font` with subsetting. Replaces the current Geist Sans + Geist Mono setup with a near-identical bundle.
 - *Coherence* — single-family within UI; mono is from a different family but Inter + JetBrains Mono is the most common, most documented pairing in the world (Linear, dozens of design systems, including the Tailwind UI default examples). Coherence at the *ecosystem* level.

2. **🥈 IBM Plex Sans Variable + IBM Plex Mono — IF MULTI-SCRIPT IS A LAUNCH PRIORITY**
 - Pick this if you anticipate >20 % of transcripts being non-Latin within 12 months. The same-family CJK + Arabic + Hebrew + Devanagari support eliminates the metric-matching problem you'd otherwise solve with fallbacks. Trade off: slightly more personality in the letterforms (a single-storey g, angled terminals) costs you a small amount of *Quiet Quality*. This is a defensible trade for a journalism/research-leaning audience.

3. **🥉 Keep Geist Sans + Geist Mono — ONLY IF you accept Latin-only and want zero migration cost**
 - Already in your stack via `next/font/local`. Ship-as-is is defensible for a pre-launch optimisation phase if Arabic/CJK transcripts are a v2 concern. The migration to Inter is small (drop-in CSS variable swap) but non-zero. Choose this only if you explicitly defer multi-script to post-launch and revisit at the v1.0 milestone.

**What this enables for Batch 2:** the type-token system in `--font-sans`, `--font-mono` CSS custom properties; the script-fallback strategy for `font-family` stacks; the `font-feature-settings` defaults (`"tnum" 1, "cv11" 1` for slashed zero, `"ss03" 1` for the simplified-g if you pick Inter).

---

# 2. Default theme

## 2.1 Wat zegt het bewijs

The popular discourse ("82 % of users prefer dark mode") is largely vendor-marketing data. The serious literature gives a more nuanced picture:

**Nielsen Norman Group's literature review (Pernice & Budiu, "Dark Mode vs. Light Mode: Which Is Better?")** concluded:
> "In people with normal vision (or corrected-to-normal vision), visual performance tends to be better with light mode... irrespective of age, the positive contrast polarity was better for both visual-acuity tasks and for proofreading tasks."

NN/g's caveats: users with cataracts, photophobia, or some forms of low vision sometimes perform better in dark mode; users with astigmatism often struggle with light text on dark backgrounds (haloing). The conclusion is *not* "light wins" — it is **"polarity should match the user's eyes, environment, and task,"** which is precisely what the system-level setting represents.

**Long-form reading evidence:** Dobres et al. (cited via Designial, 2025) measured judgment speed at 78 ms (light, 4 mm font, daylight) vs 92 ms (dark, same conditions). For *long-form reading* — exactly the INDXR use case where a user reads a 60-minute transcript — multiple meta-reviews (Lookaway, NCBI PMC12027292) converge on: light mode is easier in bright environments, dark mode is easier in dim environments, the differential is small, and *the user's environment is the dominant variable.*

**The practical conclusion:** the only theme that respects the user's actual lighting context is `system`.

## 2.2 Hoe doen vergelijkbare producten het

| Product | Default | Toggle | Notes |
|---|---|---|---|
| **GitHub** | `system` (auto) | yes (light/dark/auto/colorblind variants) | Per docs.github.com — they offer light + dark + light-high-contrast + dark-high-contrast + light-colorblind + dark-colorblind |
| **Notion** | `system` | yes | Light is the historical default; system is the preferred current setting |
| **Linear** | dark (de facto) | yes (with custom-theme generation via base/accent/contrast — Linear's "How we redesigned the Linear UI" post) | Linear is the strongest brand-led "we are dark by identity" example |
| **Vercel Dashboard** | dark | yes | Dev-tool aesthetic |
| **Stripe Dashboard** | light | yes (dark theme launched 2023) | Fintech trust signal |
| **Anthropic Claude.ai** | light | yes (Light / Match System / Dark) — Anthropic support article | Conversational/research-leaning brand |
| **Substack reading view** | light (writer can toggle to dark theme for the publication) | per-publication | Reading product → light wins by default |
| **Tailwind UI / Vercel Geist showcase** | toggle prominent, no strong default | yes | DX-oriented |

**Two distinct conventions emerge:**
- *Identity-led dark* (Linear, Vercel, Cursor, Raycast — products marketing themselves to "developer/designer" audiences).
- *Reading-led light or system* (Substack, Notion, Stripe Dashboard, Claude.ai, GitHub).

INDXR's audience straddles both groups but is *content-led* at the core (transcripts are the product). The reading-led convention applies more strongly than the identity-led one.

## 2.3 Implementatie in jouw stack

You are on Next.js 15 + Tailwind v4 + CSS-variables. The state-of-the-art pattern (per smashingmagazine.com 2024 article and the GoogleChromeLabs/dark-mode-toggle reference) is:

1. CSS uses `@media (prefers-color-scheme: dark)` to set `:root` token defaults, with a `[data-theme="dark"]` / `[data-theme="light"]` override class (and `[data-theme="system"]` is the absence of an override).
2. A pre-hydration inline `<script>` in the `<head>` reads `localStorage.theme` and applies the `data-theme` attribute *before* React hydrates, preventing the FOIT/flash. This is exactly how `next-themes` ships and what shadcn/ui assumes.
3. The user toggle has three states: **System / Light / Dark.** The system option is the *default* (no override stored).
4. `<meta name="color-scheme" content="light dark">` in the head so native form controls and scrollbars also adapt.

WCAG 2.2 implications:
- Both themes must independently pass contrast (4.5:1 normal text, 3:1 large text and UI components — SC 1.4.3 & 1.4.11).
- Focus rings must hit 3:1 against adjacent colours in both themes (SC 2.4.7 / 2.4.11 in WCAG 2.2).
- `prefers-contrast: more` should map to a higher-contrast token set (Linear ships this via the contrast variable in their LCH theme generation system).

Mobile vs desktop: do **not** differentiate. The OS sets `prefers-color-scheme` per-device, which is already context-aware. Adding INDXR-specific platform logic is *No Waste* violation.

## 2.4 Test against the 7 principles

| Principle | dark default | light default | **system default** |
|---|---|---|---|
| Honest Materiality | weak — implies "developer/sleek" identity not earned | weak — implies "professional/journalistic" identity not earned | ✓ — claims nothing about the user, lets context speak |
| Itqan in the Invisible | needs both themes equally polished | needs both themes equally polished | ✓ — forces both to be first-class from day one |
| Functional Beauty | wins for low-light coding | wins for daylight reading | ✓ — wins for the user's actual situation |
| Quiet Quality | dark feels louder when used in bright rooms | light feels harsh in dim rooms | ✓ — never imposes on the room |
| Inclusive by Default | excludes astigmatic users by default | excludes photophobic users by default | ✓ — respects existing accessibility settings |
| Coherence | OK | OK | ✓ — coherent with OS, browser, and other tools |
| No Waste | toggle still required | toggle still required | ✓ — same toggle, but the default is the user's existing decision |

`system` wins on every principle.

## 2.5 RECOMMENDATION FOR INDXR — Default theme

**Ranked options:**

1. **🥇 `system` default, with persistent user override (System / Light / Dark)** — RECOMMENDED
 - Implementation: Tailwind v4 CSS-variables in `:root` and `@media (prefers-color-scheme: dark) { :root { ... } }`, plus `[data-theme="dark"] { ... }` and `[data-theme="light"] { ... }` for explicit overrides; `next-themes` for persistence; pre-hydration `<script>` to prevent flash. **Migration from current state:** flip the existing dark-by-default CSS to system-by-default; both themes you already have are reused.
 - This contradicts your current state (`dark` hard-coded). The migration is small but not free; it is correct.

2. **🥈 Light default, with toggle** — defensible alternative
 - Justified by: (a) Substack/Notion reading lineage, (b) NN/g visual-acuity evidence for normal-vision users, (c) better default for first-time, low-trust visitors who associate dark with "developer tool, not for me." Pick this if your usability research shows >60 % of first-time users land during daytime hours and that the "developer" perception is hurting top-of-funnel conversion for journalists/students.

3. **🥉 Keep dark default** — only defensible if you commit fully to the developer-tool brand
 - This is what Linear does, deliberately. It costs you the journalism/research segment of your audience at first impression. If you keep this, you must justify it against every principle in writing — which is hard to do honestly.

**What this enables for Batch 2:** the architecture of `:root` vs `@media (prefers-color-scheme)` vs `[data-theme]` token resolution, which is the single most important decision in the token system.

---

# 3. Initial color palette direction

## 3.1 Filosofie, niet hex

The brief is right that exact colours are Claude Design's later job. The foundational decision is **how many colours, how saturated, and what role each plays.**

## 3.2 De drie SaaS-strategieën

**A. Near-monochrome with a single calm accent.** This is Linear's strategy (mobbin.com captured Linear's palette as Indigo, Woodsmoke, Oslo Gray, Black Haze, White — five tokens). Vercel's Geist colour system describes itself as "a high-contrast, accessible color system" with neutral scales and one accent. Raycast does similar. The advantage: cognitive simplicity, infinite scalability, easy WCAG compliance. The cost: less "personality" per pixel — but per *Quiet Quality*, that is the point.

**B. Broader brand palette.** Stripe (per design-foundations.com extraction: 73 colours on the homepage, with named roles — call-to-action, hero, accent, surface, background — anchored by signature blues). Notion uses ten named accent colours that users apply to pages and tags. The advantage: expressiveness; users can colour-code. The cost: every additional hue adds three contrast pairs to validate, four state variations (default/hover/active/disabled), and two theme variants (light/dark). For a small team pre-launch, this is *Israf*.

**C. Saturated brand-driven.** Mailchimp, Slack, MongoDB. INDXR has neither the brand recognition nor the design budget to make this look like anything other than a startup template.

## 3.3 De honingtoon-vraag

The honey-comb logo strongly suggests amber/honey/ochre. Four ways to handle this:

1. **Literal — make the accent honey-amber.** Risk: kitsch. Honey + hexagon is on-the-nose; it telegraphs "we are a hexagon company" at the colour level, doubling a metaphor that is already present in the logo. *Honest Materiality* warning: the brand becomes about *the metaphor* rather than *the work*.
2. **Abstract — pick a desaturated warm neutral.** A warm-leaning grey scale (off-white with a hint of cream, dark with a hint of warm) plus a low-saturation amber/ochre accent. This honours the logo's warmth without screaming "honeycomb." This is what Anthropic's Claude theme does (per shadcn.io's "Claude" theme writeup — terracotta + cream).
3. **Counter — go cool.** A neutral grey scale with a calm blue/indigo accent (Linear-style). The hexagon stays warm, the system stays cool, and they hold a deliberate tension. Workable but slightly *Israf* (you're paying for two opposing temperatures with no functional payoff).
4. **No accent — pure neutral with semantic colours only.** Vercel's Geist is close to this. Maximally restrained. *Quiet Quality* maxed out. Risk: feels institutional / lifeless without something to anchor the brand.

**Recommendation: option 2.** Warm-leaning neutral system + one calm low-saturation accent in the amber/ochre family. The accent is used sparingly (primary button, focused input ring, key data emphasis, the credit-coin in the credit balance UI). Semantic colours (success/warning/error/info) live in their own minimal palette and are *not* the same hue as the accent.

## 3.4 Islamic geometric color tradition — relevant?

Lapis blue, vermilion, ochre, gold — these are powerful traditions but they are *not* a colour system; they are a *palette tradition.* Importing them literally fails *Honest Materiality* (the design borrows visual prestige from a tradition the product is not actually about) and *Coherence* (you can't run an SaaS in vermilion without a lot of compensating chrome).

The *abstract* lesson from Islamic colour traditions worth keeping is: **high-saturation accents on calm, plaster-like neutrals.** That's the same principle as option 2 above, expressed differently. So the influence is real but invisible — exactly what the brief asks for.

## 3.5 Semantic minimalism

The minimum semantic set that stays accessible:

| Role | Required? | Why |
|---|---|---|
| Success | yes | confirmation of irreversible actions (transcript saved, credit purchased) |
| Error | yes | input validation, request failures — must not rely on colour alone (SC 1.4.1) |
| Warning | optional | argue *yes* for "you're about to use credits" copy |
| Info | optional — argue *no* | use the neutral foreground; "info" is just text |

Recommendation: ship **success / error / warning** only. Drop "info" — it's almost always replaceable with neutral foreground and an icon, eliminating one full token group across two themes. Each semantic colour ships as `solid` (background fill) and `subtle` (low-saturation surface variant for badges/banners) and `foreground` (the text colour to use *on* the solid). Three semantic hues × three variants × two themes = 18 tokens, all of which must pass 4.5:1 against their paired text/surface in both themes.

## 3.6 Architecture for Tailwind v4 + CSS variables

Tailwind v4's `@theme` directive (per tailwindcss.com docs and frontendtools.tech) is a CSS-native replacement for `tailwind.config.js extend`. The recommended architecture:

```css
/* tokens.css — single source of truth */
@theme {
 /* Light defaults */
 --color-bg: oklch(98% 0.005 80);
 --color-fg: oklch(20% 0.01 80);
 --color-muted: oklch(60% 0.005 80);
 --color-accent: oklch(70% 0.12 75); /* warm amber, low chroma */
 --color-accent-fg: oklch(15% 0.02 80);
 --color-border: oklch(90% 0.005 80);
 --color-success: oklch(65% 0.14 145);
 --color-warning: oklch(75% 0.14 75);
 --color-error: oklch(60% 0.18 25);
 --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
 --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}

@media (prefers-color-scheme: dark) {
 :root {
 --color-bg: oklch(15% 0.005 80);
 --color-fg: oklch(96% 0.005 80);
 /* ... dark equivalents, all chosen so contrast pairs match light's pairs */
 }
}

[data-theme="light"] { /* same as :root defaults */ }
[data-theme="dark"] { /* same as @media block */ }
```

OKLCH is non-negotiable. Stripe published "Designing accessible color systems" (stripe.com/blog/accessible-color-systems) explaining why HSL fails (lightness is mathematical, not perceptual) and why Lab/LCH/OKLCH wins. Linear's redesign team independently arrived at LCH for exactly the same reason (linear.app/now/how-we-redesigned-the-linear-ui). Tailwind v4 supports OKLCH natively.

WCAG 2.2 minimums to bake into the token system:
- Body text: 4.5:1 (SC 1.4.3 AA).
- Large text (≥18 pt or ≥14 pt bold): 3:1.
- Non-text UI (borders, focus rings, icons): 3:1 (SC 1.4.11 AA).
- Both themes must pass; both states (default + hover + focus + disabled-but-meaningful) must pass.

Aim for 7:1 on body text (AAA) where it doesn't compromise the design — this is a real *Itqan* commitment, not a number.

## 3.7 Test against the 7 principles

| Principle | Reasoning |
|---|---|
| Honest Materiality | OKLCH neutrals + one low-saturation accent = no faked depth, no decorative gradients without function |
| Itqan in the Invisible | Both themes equally engineered; semantic colours all 4.5:1+ in both |
| Functional Beauty | Accent has a job (primary action, focus, credit-coin); neutrals carry hierarchy via contrast not hue |
| Quiet Quality | Single accent, low chroma — the transcript dominates, not the chrome |
| Inclusive by Default | OKLCH chosen for perceptual evenness; semantic colours never the only signal (always paired with icon + text) |
| Coherence | Token names describe role (`--color-accent`, not `--color-amber-500`); same names across themes |
| No Waste | ~18 colour tokens vs Stripe's 73; every token has a use, no "decorative" colours |

## 3.8 RECOMMENDATION FOR INDXR — Color philosophy

**Ranked options:**

1. **🥇 Near-monochrome warm-neutral system + one calm low-saturation amber/ochre accent + minimal 3-colour semantic set, all in OKLCH** — RECOMMENDED
 - Communicates: focused, restrained, professional, quietly warm. Honors the honeycomb logo at the *temperature* level without making the system "about" honey.
 - Approx scope: ~10 neutrals (5 light, 5 dark per theme, named by role: bg, surface, surface-elevated, border, muted, fg-muted, fg, fg-strong), 1 accent + accent-fg, 3 × 3 semantic = 18 tokens × 2 themes = 36 values. Manageable.
 - Defer exact hex/OKLCH values to Claude Design's pass.

2. **🥈 Pure neutral monochrome, no accent (Linear's earlier 2024 mode, Vercel Geist style)** — most restrained
 - Saves the accent decision entirely. Risk: feels generic / institutional. Pick if you want maximum neutrality and trust Claude Design to introduce the accent only where genuinely functional.

3. **🥉 Cool-leaning neutrals + indigo accent (full Linear analogue)** — strong design heritage
 - Cleanly executed, but the cool/warm tension with the warm logo is unjustified by function. Reject unless you intend to recolour the logo to match.

**What this enables for Batch 2:** the OKLCH token sheet, the contrast-validation matrix (16 pairs to check), the elevation system (how surfaces stack — 0 / 1 / 2 / 3 with progressively lighter or darker shifts), and the semantic state matrix.

---

# 4. Typographic scale

## 4.1 Scale ratios — wat doen anderen

| Ratio | Name | Where it shows up | Character |
|---|---|---|---|
| 1.067 | Minor Second | rare in UI | almost imperceptible jump |
| 1.125 | Major Second | Stripe Dashboard, Tailwind UI body sizes | very tight, dense UI |
| **1.200** | **Minor Third** | **Inter rsms.me, Linear, GitHub Primer body** | **Calm, ideal for content-dense reading** |
| 1.250 | Major Third | Tailwind default `text-*` increments (sm→base→lg≈1.143→1.143), Tailwind UI marketing | Slightly more dramatic |
| 1.333 | Perfect Fourth | Material Design 3 type system | Editorial / hero-led |
| 1.414 | Augmented Fourth | print-leaning systems | Aggressive |
| 1.500 | Perfect Fifth | hero-led marketing pages | Loud |
| 1.618 | Golden Ratio | "modular scale" originals (Tim Brown) | Beautiful in print, hard to ride in dense UIs |

For a content-dense product where the same scale needs to serve transcripts (long-form prose), dashboards (dense data), and a marketing page (one or two large headers), the 1.200 Minor Third is the most-validated choice. Stripe's design-foundations.com extraction confirms a similar philosophy (body sizes 14/16/18/22 px, headings 26/32/48/56 px — closer to 1.2–1.3).

## 4.2 Base size

**16 px** is correct. It is the browser default; user-agent overrides for accessibility (zoom, reader-mode preferences) are calibrated against 16 px. Going below this for body text is hostile to *Inclusive by Default*.

Use `rem` (relative to root 16 px) everywhere except where pixel snapping matters (1 px borders, 2 px focus rings).

## 4.3 De stappen

A 1.200 scale anchored at 16 px gives a clean ladder. Round to 1-px increments at small sizes, 2-px at large:

| Token | Size | rem | Use |
|---|---|---|---|
| `text-xs` | 12 | 0.75 | timestamps, small captions, code chips |
| `text-sm` | 14 | 0.875 | secondary text, table cells, form labels |
| `text-base` | 16 | 1 | body, default UI |
| `text-lg` | 19 | 1.1875 | quote / lead paragraph |
| `text-xl` | 23 | 1.4375 | h3 |
| `text-2xl` | 28 | 1.75 | h2 |
| `text-3xl` | 33 | 2.0625 | h1 |
| `text-4xl` | 40 | 2.5 | display (marketing only) |

That is 7 active sizes (xs through 3xl) and 1 reserved for marketing. Subframe and Tailwind UI both recommend ~6–8 sizes; using all 13 of Tailwind's defaults is a documented anti-pattern (subframe.com/blog).

Note: Tailwind v4's default `text-*` ramp is similar but slightly different. Override in `@theme` if you want to enforce the ladder above; otherwise live with Tailwind's defaults — they are also defensible.

## 4.4 Fluid? clamp() vs static breakpoints

**Recommendation: static for body, fluid only for display-grade headings (≥`text-2xl`).** Body text behaves better at fixed sizes — predictable rendering, matches user reader-mode expectations, and `text-base` is the contract with the user's font-size preference. Fluid hero headings via `clamp(1.75rem, 1.25rem + 2vw, 2.5rem)` is appropriate only on marketing pages where the layout demands it.

This is *No Waste*: don't add `clamp()` where a single rem suffices.

## 4.5 Line-height system

WCAG 2.2 SC 1.4.12 (Text Spacing) requires that content remain functional when users override line-height to ≥1.5 (relative to font size). Build *toward* that as the default, not the override.

| Size | line-height | Why |
|---|---|---|
| Display (32+) | 1.1 | Headings need negative space below, not within |
| h1 / h2 / h3 (19–28) | 1.2 | Tight enough to read as a single block, loose enough to breathe |
| Body (16) | 1.55 | Sweet spot; passes WCAG; matches Inter's intended metric |
| Body-long-form (16, prose) | 1.65 | Transcript reading → slightly looser |
| Small (14) | 1.5 | UI |
| XS (12) | 1.5 | meta |
| Mono (14, code) | 1.6 | Vertical breathing for stacked timestamps |

Tailwind v4 supports inline shorthand `text-base/[1.55]`. Fine to use it; better to bind line-height to the size token in `@theme` so it's never decoupled from the size — see frontendtools.tech for the v4 pattern.

## 4.6 Weight palette

How many weights do you actually need? Linear uses three (400, 500, 600+800 occasionally); Stripe uses three (300, 500, 620 per their Söhne setup); Geist's docs show a similar 3-weight system across its style ladder.

**Recommendation: three weights. 400 (Regular), 500 (Medium), 600 (Semibold).**

- 400 for body, secondary text, captions.
- 500 for emphasis, button labels, table headers, form labels.
- 600 for headings.

No 700 (Bold), no 800/900. If you reach for Bold during design, ask whether 600 + a different size step would communicate the same hierarchy. (This is where *No Waste* shows up most concretely.) Italics — ship them only where the editor needs them (Tiptap StarterKit). Inter's italics are excellent; you don't need a separate italic font.

## 4.7 Vertical rhythm — 4 px or 8 px?

**4-px base unit, 8-px alignment for major spacing.** The 4 px base is universal in modern systems (Stripe extraction confirms a 4 px grid; Tailwind defaults to 4 px increments). Align section spacing to 8 px multiples for visual rhythm at the macro scale. This composes cleanly with the line-height numbers above (1.55 × 16 = 24.8, rounding to 24 = 8 × 3 = 6 × 4).

This vertical rhythm is also why a **square / 4-px grid wins over a hexagonal grid** at the system level — see §5.

## 4.8 Test against the 7 principles

| Principle | Reasoning |
|---|---|
| Honest Materiality | scale ratios are mathematical, not aesthetic claims |
| Itqan in the Invisible | every size has a documented use; no "this just looks nice" sizes |
| Functional Beauty | 1.200 ratio is the most-validated for content-dense reading |
| Quiet Quality | 3 weights, not 9 — restraint at the typographic level |
| Inclusive by Default | 16 px base, 1.55 line-height, all rem units, supports user font-size override |
| Coherence | 7 sizes, 3 weights, 1 ratio — single source |
| No Waste | every token has an active use; no italics outside the editor; no Black/Heavy weights |

## 4.9 RECOMMENDATION FOR INDXR — Type scale

**Ranked options:**

1. **🥇 1.200 (Minor Third), 16 px base, 7 sizes (xs–3xl), 3 weights (400/500/600), per-size line-heights as table above, 4-px vertical rhythm** — RECOMMENDED
 - Anchored in real practice (Inter, Linear, Stripe-adjacent), defensible against every principle, easy to implement in Tailwind v4 `@theme`.

2. **🥈 1.250 Major Third — slightly more dramatic** — viable if marketing pages demand more presence
 - Same 16 px base, same weights, different multiplier. Heading ladder becomes 16 → 20 → 25 → 31 → 39. Heads feel more present; body feels identical. Pick if marketing-page user-research shows current hierarchy is too quiet.

3. **🥉 Tailwind v4 defaults unchanged** — fastest to ship
 - Tailwind's default `text-*` ramp is between 1.125 and 1.25 ratios depending on step. Defensible if speed matters more than a custom-tuned ladder. The migration cost from "defaults" to a tuned 1.200 is small later.

**What this enables for Batch 2:** the spacing scale (4-px multiples named `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`, `20`, `24` rather than every multiple), the component-level density tokens, and the prose/article CSS for transcript view (`@tailwindcss/typography` invert classes for both themes).

---

# 5. Hexagon / geometric theme exploration

## 5.1 De drie levels — concrete onderscheid

The brief frames three levels (A minimal / B subtle structural / C visual motif). Let's examine each against actual implementations.

### Level A — Minimal: hexagon only where it has function
- **Logo:** keep the existing 7-hexagon honey-comb mark. (One mark, one place.)
- **Credit icon:** "credit coin" rendered as a single hexagon (visual coherence with the brand without decorating other surfaces).
- **Everywhere else:** square cards, square avatars, rectangular buttons, 4-px corner radius (or 8 px), normal grid system. No hexagonal dividers, no hexagonal section backgrounds, no honeycomb-pattern marketing illustrations.
- **Examples in the wild:**
 - Sigma Computing (logo is a sigma symbol; product UI is rectangular).
 - Linear (logo is geometric; product UI is rectangular). Their identity comes from *colour* and *motion* not *shape repetition*.
 - Stripe (the wordmark mark is wordmark; the geometric illustrations on marketing pages are bespoke per page, not mark-derived).
- **Implementation in tokens:** zero. The hexagon shape never enters the component system.
- **Pros against principles:**
 - *Honest Materiality* ✓✓ — the hexagon is in the logo because that is what the logo is. It is not in the dividers because dividers don't need hexagons.
 - *Itqan in the Invisible* ✓ — empty states use the same wordmark/logomark as everywhere else; no hexagons forced into emptiness.
 - *Functional Beauty* ✓ — hexagon survives in roles where it functions (mark, credit metaphor); absent where it would just be decoration.
 - *Quiet Quality* ✓✓ — interface doesn't shout "hexagons!"
 - *Inclusive by Default* ✓ — hexagonal hit-targets are awkward at 44×44 (corners cause focus-ring issues). Avoiding them is an accessibility win.
 - *Coherence* ✓ — square grid, square spacing, square components.
 - *No Waste* ✓✓ — zero hexagonal infrastructure.

### Level B — Subtle structural
- Hexagonal *rhythm* influences spacing or icon design. Possible expressions:
 - Icon set has slightly steeper corner angles than 90° to echo hexagon edges — but in practice this looks like "octagonal Material Design" and is hard to distinguish from accident.
 - 30°/60° angles preferred over 45° in any line/divider work.
 - Page grids align to 6-column or 12-column (hexagons tile in 6) — but 6/12 is the default web grid anyway, so the "honour" is invisible.
- **Examples:** few good ones. Honeycomb (Atlassian's Honeycomb metrics tool, when it existed) hinted at 6-fold grids; today's Atlassian Design System is square-grid. There's a reason: subtle structural geometry only reads if you pair it with overt geometric reinforcement somewhere — which immediately becomes Level C.
- **Pros against principles:**
 - *Honest Materiality* ⚠️ — the hexagonal structure has to *do something*; if it doesn't, you're paying a complexity cost for an invisible homage.
 - *Coherence* ⚠️ — hexagonal grids don't compose with 4-px / 8-px vertical rhythm cleanly. 60° angles produce non-integer pixel measurements (a hexagon with 24 px width has 20.78 px vertical from flat-to-flat). You either round and lose precision, or accept fractional pixels and lose snap-to-grid.
 - *No Waste* ✗ — adds infrastructure (custom grid math, custom icon-corner standard) for an effect users will never name.

### Level C — Visual motif
- Hexagons recur as badges, dividers, accents, illustrations, page section backgrounds, loading states.
- **Examples:**
 - HEX (the hexagons brand consultancy).
 - Honeycomb.io (observability platform — committed to hexagons, badges, illustrations, loading states; they pull it off because the metaphor *is* the product positioning, "find your honeycomb of signals").
 - Dell EMC's older brand (Hexagon-heavy, consciously industrial).
- **Pros against principles:**
 - *Honest Materiality* ✗ — every additional hexagonal surface is decorative unless it carries information; most won't.
 - *Quiet Quality* ✗✗ — the interface loudly *is* about the metaphor.
 - *Inclusive by Default* ⚠️ — hexagonal badges with text inside have less reading width than rectangles.
 - *No Waste* ✗ — a lot of paying for a metaphor.

## 5.2 Alternatieve geometrie — wat zou je in plaats hiervan doen?

**Islamic geometric patterns (girih, zellij, eight-pointed stars).** Khidr's background makes these culturally meaningful. The brief is explicit: don't force this. The *honest* way to engage with the tradition without forcing it is **not** to put girih patterns in the empty states. It is to inherit the *underlying principles* — proportion, restraint, rhythm built from a small number of tiles — into the type scale, the spacing system, and the colour philosophy. Which is exactly what §3 and §4 already recommend. The Islamic geometric inheritance is *invisible* in the rendered UI but *visible* in how the system is constructed — proportion as ihsan. (This is the same way Mike Abbink describes IBM Plex's design heritage: invisible cultural inheritance, visible quality.)

**Square / golden-rectangle / 4-px grid.** This is the mainstream choice and the one your stack (Tailwind v4, shadcn/ui) optimises for. *Coherence* and *No Waste* both vote for it.

**Triangular or octagonal tessellations.** No reason to choose them; no audience benefit.

## 5.3 De bestaande logo

The 7-hexagon honey-comb mark is good and worth keeping. Seven elements (one center + six surrounds) carry a quiet meaning (completeness, family, the seven principles you've articulated). It does not need to be redesigned for this batch. It does need:

- **Both light and dark theme variants** (a single SVG with `currentColor` or two SVGs swapped via `prefers-color-scheme` per the GitHub blog `<picture>` technique).
- **Wordmark variant** for tight horizontal layouts.
- **Favicon optimisation** at 16×16 and 32×32 — at very small sizes, 7 hexagons may collapse visually; consider a 1-hexagon favicon while keeping the 7-hexagon for app icon and brand surfaces.

## 5.4 RECOMMENDATION FOR INDXR — Hexagon level

**Ranked options:**

1. **🥇 Level A — Minimal: logo + credit-coin only, square grid everywhere else** — RECOMMENDED
 - Hexagon survives where it has a function. The grid system, the components, the icons, the dividers, the cards are all rectangular and 4-px aligned. Marketing illustrations, when needed, are bespoke per page (Stripe-style), not honeycomb-derived.
 - **Reasoning per principle:** all seven principles vote in favour; *No Waste* and *Coherence* vote loudly.

2. **🥈 Level A+ — Minimal plus carefully selected accents**
 - Same as A, but allow hexagonal *loading state* (a single rotating hexagon as the loader, replacing generic spinner) and hexagonal *empty-state illustration* on the home/empty-archive page only. This adds two surfaces. The loading-state argument: the loader is necessary anyway; making it a hexagon costs zero extra surfaces and reinforces the brand at the precise moment the user has nothing else to look at — *Itqan in the Invisible.*

3. **🥉 Level B — Subtle structural** — reject for now
 - No clear win against principles, real cost against *Coherence* (hexagonal grid math vs 4-px rhythm). Reconsider only if a future redesign explicitly chooses hexagonal rhythm as a design statement.

4. **❌ Level C — Visual motif** — reject
 - Trapping the brand in a metaphor. Honeycomb.io can do this because their metaphor *is* the product. INDXR's product is transcripts; a hexagon-heavy UI miscommunicates.

**What this enables for Batch 2:** the icon-set sourcing (Lucide is square / 24-px-grid native — picks itself), the empty-state illustration system (one or two bespoke SVGs, not a hexagonal pattern library), the loader component (single subtle hexagon if you take Level A+, otherwise generic shadcn/ui spinner).

---

# 6. Cross-cutting — system coherence

## 6.1 Hoe versterken deze keuzes elkaar

- **Inter + JetBrains Mono** has tabular figures and a tall x-height; the **1.200 type scale at 16 px** matches Inter's intended metrics; the **OKLCH neutral-plus-warm-accent palette** has Inter's letterforms doing the visual work, not colour, so you can keep the palette restrained; the **`system` theme default** assumes both themes are equally engineered, which is consistent with *Itqan in the Invisible*; the **square 4-px grid (Level A hexagon)** matches the type scale's vertical rhythm cleanly. Each decision lowers the cost of the next one.

- **The shape of "ihsan as quality standard" runs through all five.** Inter is chosen for invisibility (Quiet Quality); the type scale rejects extra weights (No Waste); the palette rejects extra hues (No Waste); the theme default rejects identity-led claims (Honest Materiality); the hexagon level rejects metaphor inflation (Coherence). Five different "rejects" — the principle of *terughoudendheid* is the through-line.

## 6.2 Spanningen en hoe ze op te lossen

- **Tension 1: Inter is generic; the brand needs distinctiveness.** Resolution: distinctiveness is a Batch-3 problem, expressed through the *logo, voice, motion, the credit-coin metaphor, and the editor's craft*, not through font choice. *Quiet Quality* explicitly refuses to differentiate via type. If after launch the brand feels too generic, a custom display font for marketing-only headings (Mona Sans width axis, or a commissioned wordmark display) is the cheapest answer — but only after the product earns the right to that distinction.

- **Tension 2: Multi-script (IBM Plex) vs ecosystem coherence (Inter + Vercel/Next.js culture).** Resolution: ship Inter at launch with a documented Noto Sans Arabic / Noto Sans CJK fallback strategy. If 12-month telemetry shows >20 % of transcripts are non-Latin, migrate to IBM Plex Sans + IBM Plex Mono. The migration cost in Tailwind v4 is one CSS-variable change plus subset reconfiguration — not painful.

- **Tension 3: `system` default vs current `dark` default.** Resolution: ship the migration in Batch 2 as part of the token-architecture rewrite, not as a stand-alone change. Both themes get audited together against WCAG 2.2 AA contrast pairs.

- **Tension 4: Honingtoon accent vs cool/Linear-heritage SaaS aesthetics.** Resolution: low-saturation amber (chroma <0.15 in OKLCH) is closer to a warm neutral than an accent; it disappears when not actively in use (button, focus, credit-coin) and the rest of the system reads neutral. This is not "warm vs cool"; this is "warm in three places, neutral everywhere else."

## 6.3 Wat dit batch 2 mogelijk maakt

The next research batch can take the following as decided (modulo your final yes/no on each):

1. **Token architecture:** OKLCH-based `--color-*`, `--font-*`, `--text-*`, `--leading-*`, `--space-*`, `--radius-*` in `@theme`, with `:root` light defaults, `@media (prefers-color-scheme: dark)` darks, and `[data-theme]` overrides.
2. **Spacing scale:** 4-px base, 8-px alignment, named scale `0/1/2/3/4/6/8/12/16/24`.
3. **Mobile patterns:** identical theme system, identical type scale (no fluid for body, fluid only for marketing display), 44×44 minimum touch target (Inclusive by Default), bottom-sheet preferred over modal for transcript actions on mobile.
4. **Empty/loading/error states:** loader = single subtle hexagon (if Level A+), otherwise shadcn/ui's `Spinner`; empty states = one bespoke SVG illustration per major surface, never a honeycomb pattern; error pages = same type scale, semantic-error colour only on the error surface, retry/return CTA in primary accent. Each state designed *first*, not last (Itqan in the Invisible is non-negotiable here).
5. **Component primitives:** shadcn/ui's 27 components are kept; corner-radius standard is 6 px (slightly more humane than 4 px, cleanly inside the rhythm); button heights are 32 / 36 / 44 px (the 44 px is the minimum touch target, not optional).

---

# 7. Beslismatrix — voor Khidr

If you accept all five high-conviction recommendations above, the migration cost from current state is:

| Decision | Migration cost | Risk if delayed |
|---|---|---|
| Inter + JetBrains Mono (replacing Geist) | 1 file change in font loading + bundle re-test | Multi-script transcripts will look fragmented |
| `system` default theme | Token system rewrite (Batch 2 anyway) | First-impression conversion of journalists/students lower than necessary |
| OKLCH near-monochrome + warm accent | Colour token rewrite (Batch 2 anyway) | Brand colour drifts ad-hoc as you add features |
| 1.200 type scale | Tailwind `@theme` config | Hierarchy feels arbitrary at scale |
| Level A hexagon | Zero — keep current logo, do nothing | Pressure builds to "use the brand more" → Level C drift |

The four batch-2-aligned decisions cost effectively the same as a token-system rewrite that is happening anyway. The font swap is a one-day change. The hexagon decision costs nothing.

If you accept *none* of the recommendations, the design system still works, but it inherits the current state's contradictions: dark default that excludes daytime journalists; Geist Sans that excludes Arabic/CJK transcripts; an undefined accent that will be defined ad-hoc per feature; a hexagon that's currently honoured only in the logo but has no documented policy, which is the exact condition under which Level C drift happens.

The cheapest, most principled path is: accept all five, do the work in Batch 2, and treat this document as the contract. Every later design decision can cite a section.

---

*Onderschrift: this document is opinionated but not closed. Each section's RECOMMENDATION block is structured so that the runner-up choice is also defensible if your context (budget, audience, launch timing) shifts. Dat is de bedoeling.*
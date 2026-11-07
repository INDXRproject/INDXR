import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { FreeToolEmbed } from "@/components/marketing/FreeToolEmbed"
import { IndexSection, INK, WRAP, MONO, H2 } from "@/components/marketing/IndexSection"
import { JsonLd } from "@/components/seo/JsonLd"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { CREDIT_COSTS, FREE_TIER, PACKAGES, pricePerMinute } from "@indxr/shared/lib/pricing"
import { MAX_TRANSCRIPTION_HOURS } from "@indxr/shared/lib/limits"
import { EXPORT_FORMAT_COUNT } from "@indxr/shared/lib/exportFormats"

export const metadata: Metadata = {
  title: "INDXR.AI — All your sources. One searchable archive.",
  description:
    "Lectures, podcasts, YouTube videos and your own recordings, as clean transcripts with speakers and timestamps. Each keeps its source and a citation, in one archive you can search word for word. Pay per minute, no subscription.",
  alternates: { canonical: "/" },
}

// Homepage structured data. Two distinct @types (Organization + WebSite), never two of
// the same type on this page. WebSite replaced SoftwareApplication on 2026-11-03: Google's Software App
// rich result requires aggregateRating/review, which INDXR does not have on-site (Ahrefs: validation
// error). WebSite carries the same name + description, so the ADR-102 brand disambiguation holds. Both carry name "INDXR.AI" and a transcription-first description so
// Google's AI Overview stops conflating the brand with the unrelated open-source project
// github.com/bahdotsh/indxr. See ADR-102.
const homeSchemas: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "INDXR.AI",
    url: "https://indxr.ai",
    logo: "https://indxr.ai/apple-touch-icon.png",
    description:
      "INDXR.AI turns lectures, podcasts, YouTube videos and your own recordings into accurate, speaker-labelled transcripts, kept with their source in one searchable archive.",
    email: "support@indxr.ai",
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "support@indxr.ai" },
    sameAs: ["https://alternativeto.net/software/indxr-ai/about/"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "INDXR.AI",
    url: "https://indxr.ai",
    description:
      "A searchable archive of transcripts from lectures, podcasts, YouTube and your own recordings — each with its source and a citation. Credits, no subscription — they never expire.",
    publisher: { "@type": "Organization", name: "INDXR.AI", url: "https://indxr.ai" },
  },
]

// Every number on this page renders from a constant:
const welcomeCredits = FREE_TIER.WELCOME_CREDITS
const welcomeMinutes = FREE_TIER.WELCOME_CREDITS / CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const maxHours = MAX_TRANSCRIPTION_HOURS
const aiPerMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const summaryPer10 = CREDIT_COSTS.AI_SUMMARY_PER_10MIN
const ragPer10 = CREDIT_COSTS.RAG_JSON_PER_10MIN
const cheapestPerMin = Math.min(...PACKAGES.map((p) => pricePerMinute(p)))
const cheapestPack = Math.min(...PACKAGES.map((p) => p.priceEur))
const eur = (n: number) => `€${n.toFixed(n < 1 ? 2 : 0)}`

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Home, stijl B — creative pass (2026-11-07). The page reads like a well-made transcript: every
// section carries an index mark in the margin (§01…), the hero *is* a transcript sheet, the
// before/after is an annotated diff, the library is a search with a hit, exports show real
// snippets, and the price is a receipt. All example text is the 1962 Rice University address
// (public domain). The sheet uses paragraph marks (¶), not timestamps; the SRT/MD/JSON snippets are format samples.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const BTN_PRIMARY = `inline-flex h-14 w-full cursor-pointer items-center justify-center border-2 ${INK} bg-[var(--accent)] px-6 text-base font-bold text-[var(--fg-on-accent)] transition-colors hover:bg-[var(--accent-hover)] sm:w-auto`
const BTN_SECONDARY = `inline-flex h-14 w-full cursor-pointer items-center justify-center border-2 ${INK} bg-[var(--bg)] px-6 text-base font-bold text-[var(--fg-strong)] transition-colors hover:bg-[var(--bg-subtle)] sm:w-auto`

const SHEET = [
  { p: 1, who: "John F. Kennedy", text: "We set sail on this new sea because there is new knowledge to be gained, and new rights to be won." },
  { p: 2, who: "John F. Kennedy", text: "But why, some say, the Moon? Why choose this as our goal?" },
  { p: 3, who: "John F. Kennedy", text: "We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard." },
]

/** The hero visual: a transcript sheet as the app renders it — title bar, tabs, ¶ marks, speaker,
 *  one highlighted search hit. Static HTML, no screenshot, so it never goes stale. */
function TranscriptSheet() {
  return (
    <div className={`border-2 ${INK} bg-[var(--bg)] shadow-[8px_8px_0_0_var(--fg-strong)]`}>
      <div className={`flex items-center justify-between gap-3 border-b-2 ${INK} bg-[var(--fg-strong)] px-4 py-2.5 text-[var(--bg)]`}>
        <span className="truncate text-sm font-bold">Address at Rice University</span>
        <span className="shrink-0 font-mono text-[11px] opacity-80">1962 · public domain</span>
      </div>
      <div className={`flex border-b-2 ${INK} font-mono text-[11px] uppercase tracking-[0.06em]`}>
        <span className={`border-r-2 ${INK} bg-[var(--accent)] px-3 py-2 font-bold text-[var(--fg-on-accent)]`}>Transcript</span>
        <span className={`border-r-2 ${INK} px-3 py-2 text-[var(--fg-subtle)]`}>Summary</span>
        <span className="px-3 py-2 text-[var(--fg-subtle)]">Export</span>
        <span className="ml-auto hidden items-center gap-2 px-3 py-2 text-[var(--fg-subtle)] sm:flex">
          <span className={`border ${INK} px-1.5 py-0.5 normal-case tracking-normal text-[var(--fg-strong)]`}>moon</span>
          2 hits
        </span>
      </div>
      <ol className="divide-y divide-[var(--border)]">
        {SHEET.map((l) => (
          <li key={l.p} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 px-4 py-4">
            <span className="pt-0.5 font-mono text-xs text-[var(--fg-muted)]">¶{l.p}</span>
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--fg)]">{l.who}</p>
              <p className="text-[15px] leading-relaxed text-[var(--fg-strong)] sm:text-base">
                {l.text.split(/(Moon)/).map((part, i) =>
                  part === "Moon" ? (
                    <mark key={i} className="bg-[var(--accent)] px-0.5 text-[var(--fg-on-accent)]">
                      Moon
                    </mark>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {/* The source travels with the text — the archive keeps where every transcript came from. */}
      <div className={`flex items-center justify-between gap-3 border-t-2 ${INK} px-4 py-2.5 font-mono text-[11px]`}>
        <span className="truncate text-[var(--fg)]">
          <span className="font-bold uppercase text-[var(--fg-strong)]">Source</span> · John F. Kennedy · Rice University, 12 Sep 1962
        </span>
        <span className={`shrink-0 border-2 ${INK} px-2 py-0.5 font-bold text-[var(--fg-strong)]`}>Copy citation</span>
      </div>
    </div>
  )
}

const SOURCES = ["Lectures", "Podcasts", "YouTube videos", "Whole playlists", "Interviews", "Talks", "Your own recordings", "MP3 · MP4 · WAV · M4A · MOV"]

const PIPELINE = [
  { k: "In", t: "A source", b: `A YouTube link, a playlist, or your own file up to ${maxHours} hours.` },
  { k: "Out", t: "A transcript", b: "Paragraphs, punctuation, speakers and timestamps. Captions are free; AI when there are none." },
  { k: "Kept", t: "An archive", b: "Filed with its source — channel, link, length — in collections, searchable down to the word." },
  { k: "Used", t: "A quote, a note", b: `A ready citation, or ${EXPORT_FORMAT_COUNT} export formats: notes, subtitles, spreadsheets, RAG.` },
]

const CARDS = [
  { call: "COURSE · 01", t: "A course you want to read", b: "Drop in a playlist and get every lecture as text, each with a chapter summary to skim before you reread." },
  { call: "RESEARCH · 02", t: "Interviews and sources", b: "Speakers separated and renamed to who they are. Every quote one click from the second it was said, with a citation to paste." },
  { call: "PODCAST · 03", t: "Podcasts and talks worth keeping", b: "The episode you half-remember is a search away: find the sentence, jump to the minute it was said." },
  { call: "BUILD · 04", t: "Text you build on", b: "Chunked JSON with timestamps and deep links, ready for a vector database." },
]

const EXPORTS: Array<{ f: string; note: string; sample: string }> = [
  { f: "Markdown", note: "Obsidian · Notion", sample: "---\ntitle: Address at Rice University\nsource: youtube\n---\n## The new sea\nWe set sail on this new sea…" },
  { f: "SRT", note: "Subtitles", sample: "12\n00:08:41,200 --> 00:08:44,900\nWe choose to go to the Moon\nin this decade" },
  { f: "RAG JSON", note: "LangChain · LlamaIndex", sample: '{\n  "chunk_id": 14,\n  "text": "We choose to go…",\n  "speaker": "John F. Kennedy"\n}' },
]

export default async function LandingPage() {
  // Auth-aware copy: a logged-in visitor already has an account, so the welcome-credit promise
  // would be wrong for them; only those sentences differ.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const loggedIn = !!user

  return (
    <>
      <JsonLd schemas={homeSchemas} />

      {/* Hero — headline left, the product itself (a transcript sheet) right. */}
      <section className="w-full bg-[var(--bg)] pt-[96px] lg:pt-[112px]">
        <div className={`${WRAP} grid grid-cols-1 items-center gap-12 pb-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pb-20`}>
          <div>
            <p className={`${MONO} mb-6 text-[var(--fg)]`}>Podcasts · lectures · interviews · videos · your own files</p>
            <h1 className="text-[2.6rem] font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-6xl lg:text-[4.25rem]">
              All your sources. One searchable archive.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--fg)] sm:text-xl">
              Paste a YouTube link or a whole playlist, or upload your own recordings. Each becomes a clean
              transcript — speakers, punctuation, timestamps — filed with its source in one archive you can search
              word for word, quote and cite.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row">
              <Link href="#try" className={BTN_PRIMARY}>
                Try it now, no account <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className={`${BTN_SECONDARY} -mt-[2px] sm:mt-0 sm:-ml-[2px]`}>
                See pricing
              </Link>
            </div>
            <p className="mt-5 font-mono text-sm text-[var(--fg-subtle)]">
              Captions free · AI from {eur(cheapestPerMin)}/min · no subscription
            </p>
          </div>
          <TranscriptSheet />
        </div>
        {/* Source ticker — everything that goes in, set as a mono rule. */}
        <div className={`border-y-2 ${INK} bg-[var(--bg-subtle)]`}>
          <div className={`${WRAP} flex flex-wrap gap-x-6 gap-y-2 py-4 font-mono text-xs uppercase tracking-[0.08em] text-[var(--fg)]`}>
            <span className="font-bold text-[var(--fg-strong)]">Goes in →</span>
            {SOURCES.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
      </section>

      {/* §01 — the proof, as an annotated diff */}
      <IndexSection n="01" label="The difference">
        <h2 className={`${H2} mb-10 max-w-3xl`}>Captions give you words. You need sentences.</h2>
        <div className={`grid border-2 ${INK} md:grid-cols-2`}>
          <div className={`border-b-2 ${INK} bg-[var(--bg-subtle)] p-6 md:border-b-0 md:border-r-2 sm:p-8`}>
            <p className={`${MONO} mb-5 text-[var(--fg-muted)]`}>− YouTube captions</p>
            <p className="font-mono text-base leading-[1.9] text-[var(--fg-muted)] line-through decoration-[var(--fg-muted)]/30 sm:text-lg">
              we choose to go to the
              <br />
              moon in this decade and do
              <br />
              the other things not because
              <br />
              they are easy but because
              <br />
              they are hard
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <p className={`${MONO} mb-5 text-[var(--fg)]`}>+ INDXR</p>
            <p className="mb-3 font-mono text-sm text-[var(--fg)]">
              <span className={`mr-2 border-2 ${INK} bg-[var(--accent)] px-1.5 py-0.5 text-[var(--fg-on-accent)]`}>Speaker</span>
              John F. Kennedy
            </p>
            <p className="text-2xl font-medium leading-snug tracking-[-0.01em] text-[var(--fg-strong)] sm:text-3xl">
              We choose to go to the Moon in this decade and do the other things, not because they are easy, but
              because they are hard.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.06em]">
              {["+ punctuation", "+ capitals", "+ speaker", "+ timestamp", "+ paragraphs"].map((t) => (
                <span key={t} className={`border-2 ${INK} px-2 py-1 text-[var(--fg-strong)]`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </IndexSection>

      {/* §02 — the live tool */}
      <IndexSection n="02" label="Try it" id="try">
        <h2 className={`${H2} mb-4`}>Your own file or link.</h2>
        <p className="mb-10 max-w-2xl text-lg text-[var(--fg-subtle)]">
          {loggedIn ? (
            <>Upload an audio or video file, or paste a link, and see the transcript for yourself. Playlists and file uploads open in the app.</>
          ) : (
            <>
              No account, no card. Upload an audio or video file, or paste a link. A free account comes with{" "}
              {welcomeCredits} credits, enough for {welcomeMinutes} minutes of AI transcription.
            </>
          )}
        </p>
        <FreeToolEmbed />
      </IndexSection>

      {/* §03 — the pipeline */}
      <IndexSection n="03" label="How it works">
        <h2 className={`${H2} mb-10 max-w-3xl`}>One source in. Something you can use out.</h2>
        <ol className={`grid border-2 ${INK} sm:grid-cols-2 lg:grid-cols-4`}>
          {PIPELINE.map((s, i) => (
            <li
              key={s.k}
              className={`relative p-6 ${i < PIPELINE.length - 1 ? `border-b-2 ${INK} lg:border-b-0 lg:border-r-2` : ""} ${i === 1 ? "sm:border-r-0 lg:border-r-2" : ""} ${i === 0 ? "sm:border-r-2" : ""} ${i === 2 ? "sm:border-r-2 sm:border-b-0" : ""} ${i === PIPELINE.length - 1 ? "bg-[var(--accent)]" : ""}`}
            >
              <p className={`${MONO} ${i === PIPELINE.length - 1 ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-subtle)]"}`}>
                {String(i + 1).padStart(2, "0")} · {s.k}
              </p>
              <p className={`mt-6 text-2xl font-bold ${i === PIPELINE.length - 1 ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-strong)]"}`}>{s.t}</p>
              <p className={`mt-2 leading-relaxed ${i === PIPELINE.length - 1 ? "text-[var(--fg-on-accent)]" : "text-[var(--fg-subtle)]"}`}>{s.b}</p>
              {i < PIPELINE.length - 1 && (
                <span aria-hidden="true" className="absolute -right-[13px] top-6 z-10 hidden h-6 w-6 items-center justify-center border-2 border-[var(--fg-strong)] bg-[var(--bg)] text-xs font-bold text-[var(--fg-strong)] lg:flex">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </IndexSection>

      {/* §04 — the library, as a search with a hit */}
      <IndexSection n="04" label="Your library" tone="ink">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold leading-[0.98] tracking-[-0.04em] sm:text-6xl">Find the sentence. In any source.</h2>
            <p className="mt-6 text-lg leading-relaxed opacity-80">
              Everything you transcribe stays, with where it came from: channel, link, length, and a citation you
              can copy. Grouped per course or project, searchable in the text itself, exportable a whole collection
              at once. The lecture you heard in March is still there in September.
            </p>
          </div>
          <div className="border-2 border-[var(--bg)] bg-[var(--bg)] text-[var(--fg-strong)]">
            <div className="flex border-b-2 border-[var(--fg-strong)]">
              <span className="border-r-2 border-[var(--fg-strong)] px-4 py-3 text-sm font-bold">Search</span>
              <span className="flex-1 px-4 py-3 font-mono text-sm">new sea</span>
              <span className="hidden px-4 py-3 font-mono text-[11px] text-[var(--fg-muted)] sm:block">titles + transcript text</span>
            </div>
            {[
              { c: "Speeches", t: "Address at Rice University", hit: "We set sail on this ", mark: "new sea", rest: " because there is new knowledge…" },
              { c: "Speeches", t: "Inaugural Address, 1961", hit: "…let us begin anew…", mark: "", rest: "" },
            ].map((r, i) => (
              <div key={r.t} className={`px-4 py-4 ${i === 0 ? "border-b-2 border-[var(--fg-strong)]" : "opacity-50"}`}>
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--fg-muted)]">{r.c}</p>
                <p className="mt-1 font-bold">{r.t}</p>
                <p className="mt-1 text-sm text-[var(--fg-subtle)]">
                  {r.hit}
                  {r.mark && <mark className="bg-[var(--accent)] px-0.5 text-[var(--fg-on-accent)]">{r.mark}</mark>}
                  {r.rest}
                </p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 border-t-2 border-[var(--fg-strong)] px-4 py-3 font-mono text-[11px] uppercase">
              <span className="border-2 border-[var(--fg-strong)] bg-[var(--accent)] px-2 py-0.5 text-[var(--fg-on-accent)]">Speeches</span>
              <span className="border-2 border-[var(--fg-strong)] px-2 py-0.5">Thesis interviews</span>
              <span className="border-2 border-[var(--fg-strong)] px-2 py-0.5">History 101</span>
            </div>
          </div>
        </div>
      </IndexSection>

      {/* §05 — who brings what: catalogue cards */}
      <IndexSection n="05" label="Who it is for">
        <h2 className={`${H2} mb-10`}>What people bring to it.</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {CARDS.map((c) => (
            <div key={c.call} className={`border-2 ${INK} bg-[var(--bg)] p-6 transition-transform hover:-translate-y-0.5`}>
              <div className={`mb-5 flex items-center justify-between border-b-2 ${INK} pb-3`}>
                <span className={`${MONO} text-[var(--fg)]`}>{c.call}</span>
                <span className="font-mono text-[11px] text-[var(--fg-muted)]">INDXR</span>
              </div>
              <h3 className="text-2xl font-bold tracking-[-0.02em] text-[var(--fg-strong)]">{c.t}</h3>
              <p className="mt-2 leading-relaxed text-[var(--fg-subtle)]">{c.b}</p>
            </div>
          ))}
        </div>
      </IndexSection>

      {/* §06 — exports, shown as the files themselves */}
      <IndexSection n="06" label="Exports">
        <h2 className={`${H2} mb-4`}>Take it anywhere.</h2>
        <p className="mb-10 max-w-2xl text-lg text-[var(--fg-subtle)]">
          {EXPORT_FORMAT_COUNT} formats, every one included: plain text, Markdown with front matter, CSV, JSON,
          SRT, VTT, and chunked RAG JSON.
        </p>
        <div className="grid gap-5 lg:grid-cols-3">
          {EXPORTS.map((e) => (
            <figure key={e.f} className={`flex flex-col border-2 ${INK} bg-[var(--bg)]`}>
              <figcaption className={`flex items-baseline justify-between border-b-2 ${INK} px-4 py-2.5`}>
                <span className="font-bold text-[var(--fg-strong)]">{e.f}</span>
                <span className="font-mono text-[11px] text-[var(--fg-muted)]">{e.note}</span>
              </figcaption>
              <pre className="flex-1 overflow-x-auto bg-[var(--bg-subtle)] p-4 font-mono text-[12px] leading-relaxed text-[var(--fg)]">{e.sample}</pre>
            </figure>
          ))}
        </div>
      </IndexSection>

      {/* §07 — the price, as a receipt */}
      <IndexSection n="07" label="Pricing">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-5xl font-bold leading-[0.94] tracking-[-0.045em] text-[var(--fg-strong)] sm:text-7xl">
              Pay for minutes. Not months.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--fg-subtle)]">
              You buy credits, spend them when you need them, and they never expire.{" "}
              {loggedIn ? null : <>A free account starts with {welcomeCredits} credits.</>}
            </p>
          </div>
          <div className={`relative border-2 ${INK} bg-[var(--bg)] font-mono text-sm shadow-[8px_8px_0_0_var(--fg-strong)]`}>
            <div className={`border-b-2 border-dashed ${INK} px-5 py-3 text-center text-[11px] uppercase tracking-[0.1em] text-[var(--fg)]`}>
              INDXR.AI · receipt
            </div>
            <dl className="px-5 py-4">
              {[
                ["YouTube with captions", "free"],
                ["AI transcription", `${aiPerMin} cr / min`],
                ["Chapter summary", `${summaryPer10} cr / 10 min`],
                ["RAG JSON", `${ragPer10} cr / 10 min`],
                ["All other exports", "incl."],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2 py-1.5">
                  <dt className="text-[var(--fg)]">{k}</dt>
                  <span aria-hidden="true" className="flex-1 border-b border-dotted border-[var(--fg-muted)]" />
                  <dd className="font-bold text-[var(--fg-strong)]">{v}</dd>
                </div>
              ))}
            </dl>
            <div className={`border-t-2 ${INK} px-5 py-4`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="uppercase tracking-[0.08em]">From</span>
                <span className="text-3xl font-bold text-[var(--fg-strong)]">{eur(cheapestPerMin)}/min</span>
              </div>
              <p className="mt-1 text-right text-[var(--fg)]">credit packs from {eur(cheapestPack)}</p>
            </div>
            <div className={`border-t-2 border-dashed ${INK} px-5 py-3 text-center text-[11px] uppercase tracking-[0.1em] text-[var(--fg)]`}>
              Subscription: none · credits never expire
            </div>
          </div>
        </div>
        <p className="mt-10 text-sm text-[var(--fg-muted)]">
          Audio is deleted as soon as transcription finishes, everything runs and is stored in the EU, and payment
          is handled by Stripe. More on{" "}
          <Link href="/articles/video-to-text" className="underline hover:text-[var(--fg)]">converting video to text</Link>,{" "}
          <Link href="/articles/audio-to-text" className="underline hover:text-[var(--fg)]">audio to text</Link>, and{" "}
          <Link href="/articles/srt-generator" className="underline hover:text-[var(--fg)]">SRT subtitle generation</Link>.
        </p>
      </IndexSection>

      {/* Closing band */}
      <section className={`w-full border-t-2 ${INK} bg-[var(--accent)]`}>
        <div className={`${WRAP} flex flex-col items-start justify-between gap-8 py-16 lg:flex-row lg:items-center lg:py-20`}>
          <p className="max-w-3xl text-4xl font-bold leading-[0.98] tracking-[-0.04em] text-[var(--fg-on-accent)] sm:text-6xl">
            Start with one lecture.
          </p>
          <div className="flex w-full flex-col sm:w-auto sm:flex-row">
            <Link
              href="#try"
              className={`inline-flex h-14 items-center justify-center border-2 ${INK} bg-[var(--fg-strong)] px-6 font-bold text-[var(--bg)] hover:opacity-90`}
            >
              Try it now <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/signup"
              className={`-mt-[2px] inline-flex h-14 items-center justify-center border-2 ${INK} bg-[var(--bg)] px-6 font-bold text-[var(--fg-strong)] hover:bg-[var(--bg-subtle)] sm:mt-0 sm:-ml-[2px]`}
            >
              Create a free account
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { ArticleTemplate } from "@/components/content/templates/ArticleTemplate"
import { AUTHORS } from "@/lib/authors"
import { pageOg } from "@/lib/pageOg"
import { FREE_TIER } from "@indxr/shared/lib/pricing"

// New 2026-11-09. APA rules checked that day against apastyle.apa.org (YouTube references; quotations
// without page numbers → time stamp; sentence case in reference lists; transcripts of audiovisual works).
// INDXR's citation is described exactly as buildCitation in apps/app/src/components/library/SourceCard.tsx
// (and its port _build_citation in backend/mcp_server.py) outputs it: channel as author ("Unknown
// channel" fallback), "(YYYY, Month D)" or "(n.d.)", the title VERBATIM (no sentence-casing — proper
// nouns would break under an automatic lowercase pass), "[Video]. YouTube.", and a
// https://youtu.be/<id> link; uploads → "<title> [Audio recording]. (<date>)." Since 2026-11-09 the
// Copy citation button also writes a text/html variant (buildCitationHtml) with the title in <em>, so
// pasting into a rich-text document italicises it automatically — sentence case is still a manual fix.
// The Justice example follows docs/guides/library.

const SLUG = "cite-youtube-video-apa"

const title = "How to cite a YouTube video in APA 7"
const metaDescription =
  "The APA 7 format for a YouTube video, the rules for author, date and title, worked examples, and how to cite a direct quote with its timestamp."

export const metadata: Metadata = {
  alternates: { canonical: `/articles/${SLUG}` },
  title: "How to Cite a YouTube Video in APA 7 (With Timestamps) | INDXR.AI",
  description: metaDescription,
  ...pageOg(`/articles/${SLUG}`, { type: "article" }),
}

const REF = "my-4 border-l-2 border-[var(--fg-strong)] pl-4 font-mono text-sm text-[var(--fg)]"

const faqs = [
  {
    q: "Who is the author of a YouTube video in APA?",
    a: "The account that uploaded the video, written as the channel name appears. If the person speaking is someone else, name them in your sentence and still cite the video under the channel.",
  },
  {
    q: "What if the video has no date?",
    a: "Use n.d. for no date, in both the reference and the in-text citation: (Channel Name, n.d.).",
  },
  {
    q: "How do I cite a specific moment in the video?",
    a: "For a direct quote, give the time stamp where the quotation begins in place of a page number, for example (Harvard University, 2009, 0:04).",
  },
  {
    q: "Should I shorten the URL?",
    a: "APA asks for the URL of the video. A youtu.be short link and a full youtube.com/watch link both lead to the same video; use one consistently, and check your institution's preference.",
  },
  {
    q: "Is the citation INDXR gives me ready to paste?",
    a: "Nearly. It has the right parts in the right order, and pasting into a rich-text document (Word, Google Docs, Notion) italicises the title automatically. It still copies the title exactly as YouTube shows it — INDXR doesn't rewrite it, since an automatic lowercase pass breaks proper nouns — so change it to sentence case yourself in your document.",
  },
]

const sources = [
  { label: "APA Style — YouTube video references", url: "https://apastyle.apa.org/style-grammar-guidelines/references/examples/youtube-references" },
  { label: "APA Style — Direct quotation of material without page numbers", url: "https://apastyle.apa.org/style-grammar-guidelines/citations/quotations/no-page-numbers" },
  { label: "APA Style — Sentence case", url: "https://apastyle.apa.org/style-grammar-guidelines/capitalization/sentence-case" },
  { label: "APA Style — Transcript of an audiovisual work references", url: "https://apastyle.apa.org/style-grammar-guidelines/references/examples/transcript-audiovisual-work-references" },
]

export default function CiteYouTubeVideoApaPage() {
  return (
    <ArticleTemplate
      category="Workflows"
      slug={SLUG}
      title={title}
      metaDescription={metaDescription}
      publishedAt="2026-11-09"
      updatedAt="2026-11-09"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        A YouTube video is a perfectly citable source, and APA 7 has a clear format for it. This page gives
        the format, the four rules people most often get wrong, worked examples, and how to cite a direct
        quote by its timestamp. The rules here are taken from the{" "}
        <a href="https://apastyle.apa.org/style-grammar-guidelines/references/examples/youtube-references" target="_blank" rel="noopener noreferrer">
          APA Style website
        </a>
        , checked in November 2026.
      </p>

      <h2>The format</h2>

      <p className={REF}>
        Channel Name. (Year, Month Day). <em>Title of video</em> [Video]. YouTube. URL
      </p>

      <p>Five parts, in this order:</p>

      <ul>
        <li><strong>Author:</strong> the name of the account that uploaded the video.</li>
        <li><strong>Date:</strong> the upload date, year first, then month and day.</li>
        <li><strong>Title:</strong> in italics and in sentence case, followed by the description [Video] in square brackets.</li>
        <li><strong>Site name:</strong> YouTube.</li>
        <li><strong>URL:</strong> the link to the video.</li>
      </ul>

      <h2>The rules people get wrong</h2>

      <h3>The channel is the author</h3>

      <p>
        APA says to use the name of the account that uploaded the video as the author. A lecture by a
        professor on a university&apos;s channel is cited under the university. You still name the speaker:
        APA&apos;s advice for words spoken by people in a video is to name or describe them in your sentence,
        then give the parenthetical citation for the video.
      </p>

      <h3>The title goes in sentence case</h3>

      <p>
        Many YouTube titles are in title case or capitals. APA uses{" "}
        <a href="https://apastyle.apa.org/style-grammar-guidelines/capitalization/sentence-case" target="_blank" rel="noopener noreferrer">
          sentence case
        </a>{" "}
        for the titles of works in a reference list, even when the original used title case. Capitalise the
        first word, the first word after a colon, and proper nouns; lower-case the rest.
      </p>

      <h3>The title is italic</h3>

      <p>
        The video is a stand-alone work, so its title is italicised, like a book. The description [Video] is
        not.
      </p>

      <h3>[Video] goes after the title</h3>

      <p>
        The description in square brackets tells the reader what kind of source this is. For a channel
        rather than a single video, APA uses [YouTube channel] instead.
      </p>

      <h2>Examples</h2>

      <p>APA&apos;s own example, from its YouTube references page:</p>

      <p className={REF}>
        Harvard University. (2019, August 28). <em>Soft robotic gripper for jellyfish</em> [Video]. YouTube.
        https://www.youtube.com/watch?v=guRoWTYfxMs
      </p>

      <p>The first lecture of Michael Sandel&apos;s Justice course, uploaded by Harvard University:</p>

      <p className={REF}>
        Harvard University. (2009, September 4). <em>Justice: What&apos;s the right thing to do? Episode 01</em>{" "}
        [Video]. YouTube. https://youtu.be/kBdfcR-8hEY
      </p>

      <p>
        Sentence case in practice. A later lecture in the same course appears on YouTube as{" "}
        <em>Justice: What&apos;s The Right Thing To Do? Episode 03: &quot;FREE TO CHOOSE&quot;</em>. In the
        reference list that becomes <em>Justice: What&apos;s the right thing to do? Episode 03: &quot;Free to
        choose&quot;</em>: the first word, the first word after each colon and the first word after the
        question mark keep their capital, and the rest go lower case.
      </p>

      <p>With no upload date available, use n.d.:</p>

      <p className={REF}>
        Channel Name. (n.d.). <em>Title of video</em> [Video]. YouTube. URL
      </p>

      <h2>In-text citations</h2>

      <p>
        In the text, give the author and year, either in parentheses or as part of the sentence:
      </p>

      <ul>
        <li>Parenthetical: (Harvard University, 2009)</li>
        <li>Narrative: Harvard University (2009)</li>
      </ul>

      <h3>Quoting with a timestamp</h3>

      <p>
        A video has no page numbers. For a direct quotation from an audiovisual work, APA says to{" "}
        <a href="https://apastyle.apa.org/style-grammar-guidelines/citations/quotations/no-page-numbers" target="_blank" rel="noopener noreferrer">
          provide a time stamp for the beginning of the quotation
        </a>{" "}
        in place of a page number. APA&apos;s own example is (Cuddy, 2012, 2:12). Applied to the Justice
        lecture:
      </p>

      <blockquote>
        <p>
          Sandel opens the course by announcing that &ldquo;this is a course about justice and we begin with a
          story&rdquo; (Harvard University, 2009, 0:04).
        </p>
      </blockquote>

      <p>
        The time stamp is what lets a reader, or you a month later, find the line. It is worth noting for
        every quote as you take it, rather than scrubbing back through an hour of video at the end.
      </p>

      <h3>Citing the transcript instead of the video</h3>

      <p>
        If what you actually read was a published transcript, APA cites it like the original work with a
        bracketed description such as [Speech transcript], and the transcript&apos;s URL. If you watched the
        video and used a transcript only to find the words, cite the video.
      </p>

      <h2>How INDXR builds the citation for you</h2>

      <p>
        Every YouTube transcript in your <Link href="/docs/guides/library">INDXR library</Link> shows a ready
        APA 7 reference with a copy button. This is exactly what it puts together:
      </p>

      <ul>
        <li><strong>Author:</strong> the channel name. If the channel is unknown, it says &ldquo;Unknown channel&rdquo;, which you should replace.</li>
        <li>
          <strong>Date:</strong> the upload date, looked up on YouTube the first time you open the transcript,
          written as (2009, September 4). When YouTube has none, it writes (n.d.).
        </li>
        <li><strong>Title:</strong> the title exactly as YouTube shows it, followed by [Video].</li>
        <li><strong>Site and link:</strong> YouTube, then a short youtu.be link to the video.</li>
      </ul>

      <p>
        Two things you finish by hand. The title is copied verbatim, so a title-case or all-caps title needs
        changing to sentence case. And the citation is copied as plain text, which cannot carry italics, so
        italicise the title in your document.
      </p>

      <p>
        For a recording you uploaded yourself, there is no channel or upload date to read, so the reference
        reads <code>Title [Audio recording]. (n.d.).</code> Add the speaker or author and the recording date
        before you use it.
      </p>

      <p>
        The same citation comes through when you connect your library to Claude or ChatGPT: the assistant can
        look up each source and add its reference to notes or a draft. See{" "}
        <Link href="/articles/claude-chatgpt-own-sources">using Claude or ChatGPT with your own sources</Link>.
        The quotes it gives you carry timestamps, which is the part APA asks for in the text.
      </p>

      <h2>A quick checklist</h2>

      <ul>
        <li>Author is the uploading channel, spelled as it appears.</li>
        <li>Date is the upload date, or n.d.</li>
        <li>Title in sentence case and italics, then [Video].</li>
        <li>YouTube, then the URL.</li>
        <li>Each direct quote has a time stamp in the in-text citation.</li>
      </ul>

      <p>
        A free INDXR account includes {FREE_TIER.WELCOME_CREDITS} credits, and pulling a video&apos;s YouTube
        captions into your library is free, citation included.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link href="/docs/guides/library" className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline">
          How the library keeps sources →
        </Link>
      </div>
    </ArticleTemplate>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { ArticleTemplate } from "@/components/content/templates/ArticleTemplate"
import { AUTHORS } from "@/lib/authors"
import { pageOg } from "@/lib/pageOg"
import { CREDIT_COSTS, FREE_TIER } from "@indxr/shared/lib/pricing"

// New 2026-11-09 (positioning 9-11: "use Claude/ChatGPT with your own sources"). Connector facts mirror
// backend/mcp_server.py (list_collections, search_library, get_transcript, get_source, get_summary;
// read-only) and the setup guide at /docs/guides/ai-assistants. The JFK example is illustrative: the
// quoted wording is from the JFK Library's transcript of the 1962 Rice University address (public domain);
// no INDXR output is reproduced.

const SLUG = "claude-chatgpt-own-sources"
const perMin = CREDIT_COSTS.AI_TRANSCRIPTION_PER_MIN
const welcome = FREE_TIER.WELCOME_CREDITS

const title = "Use Claude or ChatGPT with your own sources"
const metaDescription =
  "Claude and ChatGPT know a lot, but not your lectures and interviews. Add your own transcripts, organised and cited, and use them alongside everything else."

export const metadata: Metadata = {
  alternates: { canonical: `/articles/${SLUG}` },
  title: "Use Claude or ChatGPT With Your Own Sources | INDXR.AI",
  description: metaDescription,
  ...pageOg(`/articles/${SLUG}`, { type: "article" }),
}

const faqs = [
  {
    q: "Does this work on the free Claude plan?",
    a: "Yes. Custom connectors work on every Claude plan; the Free plan allows one. Once you add it on claude.ai or in Claude Desktop, it also works in the Claude mobile apps.",
  },
  {
    q: "Which ChatGPT plans can connect?",
    a: "ChatGPT connects to your own servers through developer mode, which is available on paid plans (Plus, Pro, Business, Enterprise, Edu) and on the web only. Developer mode is still a beta at OpenAI, so its menus move now and then.",
  },
  {
    q: "Can the assistant change or delete anything in my library?",
    a: "No. The connector is read-only. It can list, search and read, and it cannot add, edit or delete transcripts, spend credits, or see your account or payments.",
  },
  {
    q: "Does asking questions cost credits?",
    a: "No. The connector is free on every INDXR account. It can read a summary you already made, but it never creates one, so it never spends credits. Your Claude or ChatGPT plan applies on their side as usual.",
  },
  {
    q: "What does Claude or ChatGPT keep of my transcripts?",
    a: "Only what it read during the chat: the search results and transcript blocks it fetched to answer you. That is kept by the provider under its own terms. Your audio is never involved, because INDXR deletes it after transcription.",
  },
]

const sources = [
  { label: "Model Context Protocol", url: "https://modelcontextprotocol.io" },
  {
    label: "John F. Kennedy Presidential Library — Address at Rice University on the Nation's Space Effort, September 12, 1962",
    url: "https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/rice-university-19620912",
  },
]

export default function ClaudeChatGptOwnSourcesPage() {
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
        Claude and ChatGPT know a great deal and can search the web. What they do not have is your material:
        the lecture series you are working through, the interviews behind your piece, the talks you are drawing
        on for a book. Ask about those and the model guesses, and a guessed quote looks exactly like a real one.
      </p>

      <p>
        For anyone who studies, researches or writes, the best setup is both: the model&apos;s knowledge and the
        web, plus your own sources, organised and cited, for the parts that matter. This article explains what
        changes when the assistant can read your sources, how to combine them with everything else or keep it to
        them, and how to set that up with INDXR.
      </p>

      <h2>What the assistant cannot see</h2>

      <p>
        A language model knows what it learned in training and what it can find on the web. For famous
        material that is often enough. A specific lecture, a niche podcast or an interview you recorded yourself
        is usually in neither, so the model has little to go on, and it fills the gap with something that sounds
        right.
      </p>

      <p>
        Quotes are where this hurts most. A paraphrase that is slightly off is a nuisance. A quotation that
        was never said, attributed to a real person, is a mistake you can publish or hand in. The model does
        not mark the difference for you.
      </p>

      <h2>The fix: add your sources</h2>

      <p>
        The fix is old advice: when a claim matters, go to the source. For an assistant, that means it can open
        the transcript and point to a place in it, while still using everything else it brings: background,
        context, the wider literature, a web search.
      </p>

      <p>
        You decide the mix per question. &ldquo;Using my Early Middle Ages collection and what you know about the
        period&hellip;&rdquo; combines the two. &ldquo;Answer only from my Kagan lectures&rdquo; keeps it to your sources.
      </p>

      <p>
        Pasting a transcript into the chat works for one video. It stops working when the material is a
        course of twenty lectures or a year of interviews, and it loses where each passage came from. What
        you want is a library the assistant can search, read in pieces, and cite.
      </p>

      <h2>How INDXR&apos;s connector works</h2>

      <p>
        INDXR keeps every transcript you make in a library: YouTube videos and playlists, and your own
        uploaded recordings. Each transcript keeps its source and a ready APA citation, and a playlist is
        filed as its own collection. The connector lets
        Claude, Claude Code or ChatGPT read that library through the Model Context Protocol, an open standard
        for connecting assistants to outside tools. The assistant can:
      </p>

      <ul>
        <li><strong>List your collections</strong>, with how many transcripts each holds.</li>
        <li>
          <strong>Search the library</strong>: titles, channels and the transcript text itself. Each hit
          comes with a short excerpt, its timestamp and a link to that moment in the video.
        </li>
        <li>
          <strong>Read a transcript in blocks of minutes</strong>, with timestamps and speaker names. If you
          corrected a transcript, it reads your corrected version.
        </li>
        <li>
          <strong>Look up the source</strong>: channel, link, length, language, publication date and an APA 7
          citation.
        </li>
        <li><strong>Read a summary</strong> you already made in INDXR.</li>
      </ul>

      <p>
        That is all it can do. It cannot add, edit or delete anything, spend credits, or see your account.
        It sees only what it asks for to answer you.
      </p>

      <h2>Setting it up</h2>

      <p>
        In Claude, you add INDXR as a custom connector once, sign in to INDXR and allow read access, then turn
        it on in a chat. Claude Code takes one command and a sign-in. ChatGPT needs developer mode, on a paid
        plan, on the web. Each takes a few minutes; the exact steps and the connector URL are in the{" "}
        <Link href="/docs/guides/ai-assistants">Claude and ChatGPT guide</Link>.
      </p>

      <h2>Three prompts that use it well</h2>

      <p>
        The pattern is the same in each: name the collection or the source, and ask for quotes with
        timestamps. That makes the assistant search and read your sources for the specifics, on top of what it
        already knows.
      </p>

      <h3>Study</h3>

      <blockquote>
        <p>
          &ldquo;Turn lectures 6 to 10 of my Early Middle Ages collection into study notes. One section per
          lecture, key arguments as bullets, and the APA reference plus timestamps under each section.&rdquo;
        </p>
      </blockquote>

      <p>
        The assistant lists the collection, reads each lecture in blocks, and writes the notes. Because each
        section carries timestamps, you can jump to the moment a point was made when you revise. There is
        more on this in <Link href="/articles/youtube-to-notes">study notes from a lecture playlist</Link>.
      </p>

      <h3>Research</h3>

      <blockquote>
        <p>
          &ldquo;Which of my sources discuss consent? For each, quote the passage with its timestamp and give
          the APA reference.&rdquo;
        </p>
      </blockquote>

      <p>
        Here the assistant searches across the whole library, not one video, and comes back with a list of
        sources and passages. It is a starting point for a literature review, not the review itself: read the
        passages it found in context before you rely on them.
      </p>

      <h3>Writing</h3>

      <blockquote>
        <p>
          &ldquo;Draft three paragraphs on why the Moon programme was framed as a challenge, using only my
          Kennedy transcript. Quote him with the timestamp for each quote.&rdquo;
        </p>
      </blockquote>

      <p>
        Say you transcribed the 1962 Rice University address, which is in the public domain. An answer built
        from the transcript might include a line like this, illustrative only:
      </p>

      <blockquote>
        <p>
          Kennedy framed the goal as a test rather than a convenience: &ldquo;We choose to go to the moon in
          this decade and do the other things, not because they are easy, but because they are hard.&rdquo;
          (Rice University address, at the timestamp the transcript gives, with a link to that moment.)
        </p>
      </blockquote>

      <p>
        The point is not that the quote is famous. It is that the quote now comes with a place in the
        recording you can open, so checking it takes one click instead of a search through the whole speech.
      </p>

      <h2>Check the answer anyway</h2>

      <p>
        Reading from your sources makes an assistant far more trustworthy, not infallible. It can still pick a
        passage that does not quite support the point, merge two speakers, or summarise loosely. The
        timestamps are there so you can catch that quickly. A good habit: before a quote goes into anything
        you publish or submit, open it at the timestamp and hear it once.
      </p>

      <p>
        For the reference itself, the citation the connector returns follows APA 7. Two details, title
        capitalisation and italics, need a quick touch by hand; see{" "}
        <Link href="/articles/cite-youtube-video-apa">how to cite a YouTube video in APA</Link>.
      </p>

      <h2>What it costs</h2>

      <p>
        The connector is free on every INDXR account. What costs credits is making the transcripts: YouTube
        captions are free for a single video, and AI transcription, for videos without captions and for your
        own recordings, is {perMin} credit per minute. A free account includes {welcome} credits. There is no
        subscription, and credits never expire.
      </p>

      <h2>Start with one source</h2>

      <p>
        Make a free account, transcribe one lecture or interview you know well, connect Claude or ChatGPT,
        and ask it something you already know the answer to. If it finds the right passage and the right
        minute, you will know what it can do with the rest of your sources.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link href="/docs/guides/ai-assistants" className="text-sm font-medium text-[var(--link)] underline-offset-2 hover:underline">
          How to connect Claude or ChatGPT →
        </Link>
      </div>
    </ArticleTemplate>
  )
}

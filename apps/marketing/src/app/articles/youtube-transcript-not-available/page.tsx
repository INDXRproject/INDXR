import type { Metadata } from "next"
import Link from "next/link"
import { ArticleTemplate } from "@/components/content/templates/ArticleTemplate"
import { DocsFigure } from "@/components/docs/DocsFigure"
import { AUTHORS } from "@/lib/authors"
import { editorialOg } from "@/lib/editorialMeta"
import { creditCostEur, getAnchorPackage, anchorPerCreditText, FREE_TIER } from "@indxr/shared/lib/pricing"
import { transcriptionModelName, TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"

export const metadata: Metadata = {
  alternates: { canonical: "/articles/youtube-transcript-not-available" },
  title: "YouTube Transcript Not Available? Here's Why and How to Fix It | INDXR.AI",
  description:
    "YouTube transcript missing or not showing? Tell an interface glitch from a video that has no captions, and get the text anyway when there's nothing to show.",
  ...editorialOg("youtube-transcript-not-available"),
}

const faqs = [
  {
    q: "How do I get a transcript of a YouTube video?",
    a: "Paste the video's link into INDXR. If the video already has captions, you get the transcript straight back as text to read, copy or download, free and with no account. If it has no captions, you transcribe the audio instead and still get a clean, punctuated transcript. There is nothing to install.",
  },
  {
    q: "Why is the \"Show transcript\" button greyed out or missing?",
    a: "It's almost always an interface issue, not a missing transcript. A browser extension is the most common cause: ad blockers and privacy extensions stop the transcript panel from rendering even though the captions exist. Open the video in an incognito window, and if the transcript appears, an extension on your normal profile is the culprit. The YouTube mobile app also hides transcripts that the mobile browser shows.",
  },
  {
    q: "Can a creator turn captions off for their video?",
    a: "Yes. Channel owners can disable automatic captions or delete a caption track in YouTube Studio, and when they do, no transcript button appears for anyone. No browser fix brings it back, because the caption data no longer exists on YouTube's side. Transcribing the audio directly is then the only route to the text.",
  },
  {
    q: "How long does YouTube take to generate automatic captions?",
    a: "Usually minutes, but up to a day for long videos or complex audio, which YouTube processes more slowly. For the first day after upload, a missing transcript is the expected state rather than a fault. If a video is several days old and still shows nothing, the captions most likely failed or were disabled.",
  },
  {
    q: "Can I get a transcript from a private YouTube video?",
    a: "Not through the URL, because a private video is only viewable by accounts the owner invited, and no tool can reach it. If you own the video, download its audio from YouTube Studio and upload the file to INDXR's Upload tab, which transcribes from the file without needing the video to be public.",
  },
  {
    q: "Can I get a transcript from a YouTube Short?",
    a: "Yes, Shorts use the same caption mechanism as regular videos, though caption availability varies and some Shorts skip the captioning pipeline. When a Short has no captions, AI transcription still works as long as there is speech in it.",
  },
]

const sources = [
  {
    label: "YouTube Help — automatic captions",
    url: "https://support.google.com/youtube/answer/6373554",
  },
  {
    label: "YouTube Help — supported caption languages",
    url: "https://support.google.com/youtube/answer/7296221",
  },
  {
    label: "YouTube Help — age-restricted content",
    url: "https://support.google.com/youtube/answer/2802167",
  },
  {
    label: "Sonix — human transcription pricing",
    url: "https://sonix.ai/how-much-does-transcription-cost",
  },
]

export default function YouTubeTranscriptNotAvailablePage() {
  return (
    <ArticleTemplate
      category="Troubleshooting"
      slug="youtube-transcript-not-available"
      title="YouTube transcript not available? Why it happens, and how to get the text anyway"
      metaDescription="YouTube transcript missing or not showing? Tell an interface glitch from a video that has no captions, and get the text anyway when there's nothing to show."
      publishedAt="2026-04-16"
      updatedAt="2026-08-14"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        A YouTube transcript is missing for one of two reasons: either the transcript exists and
        YouTube isn&apos;t showing it to you, or the video has no captions for anything to show. Which
        fix applies depends entirely on which of those you&apos;re in, and you can tell them apart in
        about ten seconds.
      </p>

      <p>
        If you&apos;re on the YouTube page and the &quot;Show transcript&quot; option is missing or greyed
        out on a video where people are clearly talking, it&apos;s almost always an interface problem, and
        the text is probably already there. If a transcript tool or browser extension handed you
        &quot;no transcript available,&quot; take it literally: the video has no caption track, and no
        amount of refreshing will change that. The second case is the one this page mostly solves, and
        it&apos;s further down.
      </p>

      <h2>How to get a transcript of a YouTube video</h2>

      <p>
        The direct answer, before the troubleshooting below: paste the video&apos;s link into a tool that
        reads its captions, and you get the transcript back as text you can read, copy, search or
        download. INDXR does this in the browser, with no extension, and no account when the video
        already has captions. If the video has no captions, you transcribe its audio instead and still
        get the script of the video as clean, readable text. The rest of this page is for when that
        transcript is missing or hidden.
      </p>

      <h2>Fixes that cost nothing</h2>

      <p>
        If the transcript exists but you can&apos;t see it, one of these usually explains why. None needs
        a paid tool, and most take under a minute.
      </p>

      <h3>You&apos;re looking in the wrong place</h3>

      <p>
        The YouTube mobile app often doesn&apos;t show a transcript at all, even when one exists. The
        mobile browser does. If you&apos;re on a phone, open the video in your browser instead of the app,
        tap the title, and look for &quot;Show transcript&quot; under the description.
      </p>

      <h3>A browser extension is hiding the panel</h3>

      <p>
        Ad blockers and privacy extensions frequently stop the transcript panel from rendering, so the
        caption data is there but the button never appears. Open the same video in an incognito window,
        where extensions are off by default. If the transcript shows up there, an extension on your
        normal profile is the cause, so disable them one by one to find it.
      </p>

      <h3>The video is too new</h3>

      <p>
        YouTube generates automatic captions after a video goes live, not at the moment of upload. For
        most videos that&apos;s a few minutes; for long or complex audio it can take up to a day, and{" "}
        <a href="https://support.google.com/youtube/answer/6373554" target="_blank" rel="noopener noreferrer">
          YouTube Help
        </a>{" "}
        notes that captions can simply be unavailable while complex audio is still processing. So for
        the first day after upload, a missing transcript is the expected state, not a fault. Check back
        later before assuming anything is wrong.
      </p>

      <h3>It&apos;s a live stream or a fresh replay</h3>

      <p>
        Live automatic captions only work in English, so a non-English stream has none while it&apos;s
        running. And once any stream ends, the live captions are dropped and YouTube processes a new
        caption track for the replay, which can take hours. That gap is why a stream you just watched
        often shows no transcript for a while afterward.
      </p>

      <h3>The transcript is there, just in another language</h3>

      <p>
        Sometimes the transcript exists, but not in the language you expected. YouTube builds automatic
        captions in the video&apos;s default language, so a video set to another language won&apos;t have
        an English track to show. If that&apos;s what you&apos;re hitting,{" "}
        <Link href="/articles/youtube-transcript-non-english">getting the transcript in the original language</Link>{" "}
        is its own short topic.
      </p>

      <h2>When it&apos;s an access problem</h2>

      <p>
        Some videos have captions but sit behind a wall, and here the honest answer splits in two: for
        one kind, signing in fixes it; for the others, nothing does.
      </p>

      <h3>Age-restricted videos</h3>

      <p>
        Age restriction is about verifying your age, not paying for access, so signing in with an
        age-verified account usually does let you through (
        <a href="https://support.google.com/youtube/answer/2802167" target="_blank" rel="noopener noreferrer">
          YouTube Help
        </a>
        ). If you can watch the video while signed in, you can get its transcript: download the audio
        while logged in, then upload the file to INDXR&apos;s{" "}
        <Link href="/articles/audio-to-text">Upload tab</Link>, which transcribes from the file directly
        without needing YouTube&apos;s login. INDXR detects age-restricted videos up front and shows a
        clear message rather than failing silently, and no credits are charged when it does.
      </p>

      <h3>Members-only and private videos</h3>

      <p>
        For members-only and private videos, nothing helps through the URL, and no tool changes that:
        you either have access to the content or you don&apos;t. If you&apos;re a member, or you own the
        video and can watch it, the same route works, download the audio while signed in and upload the
        file. If you can&apos;t watch it, there&apos;s no legitimate way to transcribe it, and any tool
        that claims otherwise is either overstating what it does or working around YouTube&apos;s
        authentication in ways its terms don&apos;t allow.
      </p>

      <h2>When there are no captions at all</h2>

      <p>
        This is the case most people who land here actually have: the video has no caption track, and
        none is coming. Refreshing, clearing the cache, and switching browsers won&apos;t help, because
        there&apos;s nothing on YouTube&apos;s servers to show. It happens far more often than
        YouTube&apos;s interface suggests, and two of the reasons come straight from YouTube&apos;s own
        documentation yet rarely get mentioned anywhere else.
      </p>

      <p>
        The first is language. YouTube only generates automatic captions in a video&apos;s set default
        language, and its speech recognition covers a fixed list of 73 languages (
        <a href="https://support.google.com/youtube/answer/6373554" target="_blank" rel="noopener noreferrer">
          YouTube Help
        </a>
        ; the full list is in YouTube&apos;s{" "}
        <a href="https://support.google.com/youtube/answer/7296221" target="_blank" rel="noopener noreferrer">
          transcription glossary
        </a>
        ). If a creator sets the wrong default language, or the spoken language isn&apos;t on that list,
        YouTube produces no captions at all, no matter how clear the audio is.
      </p>

      <p>
        The second is overlapping speech. YouTube states plainly that automatic captions won&apos;t be
        created when there are &quot;multiple speakers whose speech overlaps or multiple languages at the
        same time.&quot; A lively panel discussion or a bilingual interview can come back with nothing,
        even though every word is perfectly audible.
      </p>

      <p>
        When there genuinely are no captions, the way to get the text is to transcribe the audio
        directly, and that&apos;s what INDXR does. Paste the same URL, and instead of pulling captions
        that don&apos;t exist, it downloads the audio and runs it through {transcriptionModelName()},
        which detects the language automatically across up to {TRANSCRIPTION_MODEL.totalLanguages} languages and returns clean sentences
        with punctuation and timestamps.
      </p>

      <DocsFigure
        src="/docs/screenshots/method-choice.png"
        alt="INDXR's transcription method chooser after a YouTube URL is pasted: a YouTube captions option marked free, next to an AI transcription option marked one credit per minute."
        caption="After you paste a URL, INDXR offers both routes: free YouTube captions, or AI transcription at one credit per minute. When a video has no captions, AI transcription is the one that still works."
      />

      <p>
        The result reads like a document, not the raw, punctuation-free stream YouTube&apos;s
        auto-captions produce when they do exist, with each speaker&apos;s turn labelled and every
        paragraph timestamped.
      </p>

      <DocsFigure
        src="/docs/screenshots/transcript-speakers.png"
        alt="A finished INDXR transcript where each paragraph opens with a timestamp and a bold speaker name, followed by their words in full sentences."
        caption="What a finished AI transcript looks like: full sentences, punctuation, speaker labels, and a timestamp on every paragraph you can click to jump to."
      />

      <p>
        AI transcription costs one credit per minute, and at {getAnchorPackage().name} pricing
        that&apos;s {anchorPerCreditText()}, so a 45-minute video is 45 credits, about {creditCostEur(45)}.
        For comparison, professional human transcription runs $1 to $3 per audio minute (
        <a href="https://sonix.ai/how-much-does-transcription-cost" target="_blank" rel="noopener noreferrer">
          industry pricing
        </a>
        ) and takes days. AI transcription won&apos;t match a careful human on the hardest audio, but for
        a video that simply never got captions, it turns nothing into a usable transcript in minutes.
      </p>

      <h2>Try it on a video that has no transcript</h2>

      <p>
        The quickest way to know whether this solves your problem is to run the video through it. A free
        account includes {FREE_TIER.WELCOME_CREDITS} credits, enough to transcribe{" "}
        {FREE_TIER.WELCOME_CREDITS} minutes of audio, with no subscription and no card. If the result
        isn&apos;t good enough, you&apos;ve lost nothing. If it is, the credits you buy afterwards never
        expire, so they&apos;re there the next time a video turns up without a transcript.
      </p>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/signup">
          <button className="h-12 cursor-pointer rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-semibold text-[var(--fg-on-accent)] transition-all hover:bg-[var(--accent-hover)]">
            Create a free account
          </button>
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          See pricing →
        </Link>
      </div>
    </ArticleTemplate>
  )
}

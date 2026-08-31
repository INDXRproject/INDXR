import type { Metadata } from "next"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import {
  UPLOAD_FORMAT_COUNT_WORD,
  UPLOAD_AUDIO_LABELS,
  UPLOAD_VIDEO_LABELS,
  UPLOAD_MAX_FILE_MB,
} from "@indxr/shared/lib/uploadFormats"
import { TRANSCRIPTION_MODEL } from "@indxr/shared/lib/models"
import { FREE_TIER } from "@indxr/shared/lib/pricing"
import { AUTHORS } from "@/lib/authors"

const metaDescription =
  "M4A, WAV, OGG, OPUS, FLAC, MP4, MKV, MOV and seven more upload directly, with no converting step. " +
  "What each format is, where it comes from, and what happens to it."

// OG image: this page has no bespoke editorial render and no fitting screenshot, so no og:image is set
// (rather than point at a 404 — /editorial/supported-formats-og.jpg does not exist yet). The article
// hero is the auto-generated ArticleHero SVG banner, which needs no file. See the task report.
export const metadata: Metadata = {
  alternates: { canonical: "/articles/supported-formats" },
  title: "Supported formats — transcribe M4A, WAV, OGG, OPUS and more | INDXR.AI",
  description: metaDescription,
  openGraph: { type: "article" },
}

// Sources rendered by the template (the five external references, each verified 200).
const sources = [
  { label: "RFC 6716 — Definition of the Opus Audio Codec", url: "https://datatracker.ietf.org/doc/html/rfc6716" },
  { label: "Xiph.Org — FLAC", url: "https://xiph.org/flac/" },
  { label: "Matroska — the MKV container", url: "https://www.matroska.org/" },
  { label: "The WebM Project", url: "https://www.webmproject.org/" },
  { label: "AssemblyAI supported languages", url: "https://www.assemblyai.com/docs/getting-started/supported-languages" },
]

export default function SupportedFormatsPage() {
  return (
    <ToolPageTemplate
      category="Reference"
      slug="supported-formats"
      title="Every format INDXR transcribes, and where each one comes from"
      metaDescription={metaDescription}
      publishedAt="2026-08-31"
      updatedAt="2026-08-31"
      author={AUTHORS["indxr-editorial"]}
      faqs={[]}
      sources={sources}
    >
      <p>
        A file you want the words out of arrives in whatever format the thing that made it decided on. An
        iPhone gives you M4A. WhatsApp gives you OPUS. A download gives you MKV. A recorder set to high
        quality gives you WAV or FLAC. None of that is a choice you made, and none of it should be a step
        you have to undo before you can read what was said.
      </p>
      <p>
        INDXR accepts {UPLOAD_FORMAT_COUNT_WORD} formats, audio and video together, and you upload the file
        exactly as it reached you. There is no conversion step, no &ldquo;export as MP3 first&rdquo;, and no
        question about which container you have. It costs one credit per minute of audio, and a free account
        includes {FREE_TIER.WELCOME_CREDITS} credits, so a real recording can go through before you spend
        anything.
      </p>

      <h2>The full list</h2>
      <table>
        <tbody>
          <tr>
            <td>Audio</td>
            <td>{UPLOAD_AUDIO_LABELS.join(", ")}</td>
          </tr>
          <tr>
            <td>Video</td>
            <td>{UPLOAD_VIDEO_LABELS.join(", ")}</td>
          </tr>
          <tr>
            <td>Maximum file size</td>
            <td>{UPLOAD_MAX_FILE_MB}MB</td>
          </tr>
          <tr>
            <td>Maximum length</td>
            <td>10 hours per file</td>
          </tr>
          <tr>
            <td>Languages</td>
            <td>{TRANSCRIPTION_MODEL.totalLanguages}, detected automatically</td>
          </tr>
        </tbody>
      </table>
      <p>
        Video files are handled the same way audio files are: the audio track is taken out and the picture
        is discarded. Nothing about the image is read, so a screen recording gives you what was said about
        the screen, not an account of what was shown on it.
      </p>

      <h2>Audio formats</h2>

      <h3>M4A — the iPhone voice memo</h3>
      <p>
        M4A is MPEG-4 audio: the same container family as MP4, holding audio alone. It is what the Voice
        Memos app on an iPhone produces, and what iTunes and Apple Music have used for years.
      </p>
      <p>
        It is also the format people most often get stuck on. A file that plays perfectly on the phone that
        recorded it gets rejected by a converter that only knows MP3, and the obvious next move — find
        something that turns M4A into MP3 — adds a step, a quality loss and a second piece of software to a
        job that was one step to begin with.
      </p>
      <p>
        Upload the M4A. A forty-minute memo costs forty credits and comes back punctuated, split by speaker
        and timestamped.
      </p>

      <h3>MP3 — the one everything can read</h3>
      <p>
        MPEG-1 Audio Layer III, and still the format most things fall back to. Podcast downloads, older
        recorders, anything exported &ldquo;for compatibility&rdquo;. Nothing to say about it except that it
        works, which is the point.
      </p>

      <h3>WAV — uncompressed, and usually large</h3>
      <p>
        WAV holds audio without compression, which is why a field recorder or an interview rig set to
        archival quality writes WAV and why the files are big. An hour of stereo WAV at CD quality runs to
        roughly 600MB, which is over the {UPLOAD_MAX_FILE_MB}MB limit.
      </p>
      <p>
        If a WAV file is too large, the fix is not to convert it to MP3 and lose the quality you recorded it
        at. Split it at a pause between sentences and upload the parts. You pay per minute of audio either
        way, so splitting costs nothing extra.
      </p>

      <h3>OPUS — the WhatsApp voice note</h3>
      <p>
        OPUS is a codec designed for speech over the internet, standardised by the IETF in 2012. WhatsApp
        uses it for voice messages, Discord uses it for calls, and a browser recording a microphone will
        often produce it.
      </p>
      <p>
        Export the voice message from the chat and upload the file as it comes. It arrives with a{" "}
        <code>.opus</code> extension and goes through as it is.
      </p>
      <p>
        Voice notes are short and the credit cost follows: a three-minute message costs three credits, which
        is about eight cents at Plus pricing.
      </p>

      <h3>OGG — the container OPUS usually travels in</h3>
      <p>
        OGG is an open container from the Xiph.Org Foundation, and the thing inside it is usually Vorbis or
        Opus. Where a <code>.opus</code> file is Opus audio labelled as such, a <code>.ogg</code> file is
        Opus or Vorbis audio in a container that could hold either.
      </p>
      <p>
        Both upload. You do not need to know which one you have, or to check what is inside the container
        before sending it.
      </p>

      <h3>FLAC — lossless, for recordings that matter</h3>
      <p>
        FLAC compresses audio without discarding anything, which is why it is used for archival recordings,
        music masters and anything someone expects to still be working from in ten years. Files are smaller
        than WAV and larger than MP3.
      </p>
      <p>
        There is no accuracy gain from uploading FLAC rather than a good MP3 of the same recording — speech
        recognition does not hear the difference. Upload the FLAC because it is the file you have, not
        because it will read better.
      </p>

      <h3>AAC — the successor MP3 never quite replaced</h3>
      <p>
        Advanced Audio Coding is what sits inside most M4A and MP4 files, and it also exists as a bare stream
        with an <code>.aac</code> extension: broadcast captures, some Android recorders, files pulled out of
        a video container. Both the wrapped and the bare version upload.
      </p>

      <h3>MPGA — MPEG audio under another name</h3>
      <p>
        MPGA is MPEG audio, in practice usually the same thing as MP3 with a different extension attached by
        whatever produced it. It goes through the same way.
      </p>

      <h2>Video formats</h2>

      <h3>MP4 — the default for everything</h3>
      <p>
        MPEG-4 Part 14, the container most cameras, phones and editors write by default. The audio track
        inside is usually AAC. Upload the MP4 and the audio is taken out for you.
      </p>

      <h3>MOV — what an iPhone films</h3>
      <p>
        MOV is Apple&rsquo;s QuickTime container and it is what an iPhone camera records. It behaves like MP4
        in almost every respect, and the reason it exists as a separate line in the list is that plenty of
        tools accept one and not the other.
      </p>

      <h3>MKV — what downloads arrive as</h3>
      <p>
        Matroska is an open container that can hold nearly any combination of video, audio and subtitle
        tracks, which is why archives, rips and anything that needed more than one audio language ends up as
        MKV.
      </p>
      <p>
        It is also the format most transcription tools refuse, because handling it properly means dealing
        with a container that makes very few assumptions. Upload the MKV.
      </p>

      <h3>WEBM — the browser&rsquo;s recording format</h3>
      <p>
        WEBM is the open container the WebM Project built around VP8 and VP9 video, and it is what a browser
        writes when a page records your screen or your camera. Loom-style tools, in-browser recorders and a
        good deal of what comes off the web is WEBM.
      </p>

      <h3>AVI — the old one that will not go away</h3>
      <p>
        Audio Video Interleave dates to 1992 and still turns up: old camcorder footage, screen captures from
        software that has not been updated in a decade, files that have been sitting on a drive since before
        phones had cameras. It uploads.
      </p>

      <h3>MPEG and FLV — the archive cases</h3>
      <p>
        MPEG-1 and MPEG-2 video, and Flash Video. Neither is something anyone produces on purpose now, and
        both are what you find when you go back through old material. They are in the list because a format
        nobody makes any more is exactly the kind of file that has no easy path anywhere else.
      </p>

      <h2>What you do not have to do first</h2>
      <p>
        <strong>Convert it.</strong> There is no format in the list that needs turning into another format in
        the list. Uploading an M4A is not worse than uploading an MP3 of the same recording, and converting
        between them costs you time and a little quality for no gain.
      </p>
      <p>
        <strong>Extract the audio from the video.</strong> The audio track is taken out for you. You do not
        run the file through anything to separate them.
      </p>
      <p>
        <strong>Check what is inside the container.</strong> MKV, OGG and MP4 can each hold several different
        codecs. Which one yours holds is not a question you need to answer.
      </p>
      <p>
        <strong>Compress it to fit.</strong> The only reason to touch a file before uploading is if it is
        over {UPLOAD_MAX_FILE_MB}MB or longer than ten hours, and the answer to both is to split it at a
        pause rather than to compress it.
      </p>

      <h2>The two limits</h2>
      <p>
        <strong>{UPLOAD_MAX_FILE_MB}MB per file.</strong> This binds in practice only on uncompressed audio
        and long high-resolution video. An hour of MP3 is around 60MB; an hour of stereo WAV is around 600MB.
      </p>
      <p>
        <strong>Ten hours per file.</strong> Long enough for almost anything. A recording that runs longer
        gets split, and because you pay per minute rather than per file, splitting changes nothing about the
        cost.
      </p>

      <h2>What comes back</h2>
      <p>
        The same three things regardless of what you uploaded, because by the time transcription starts the
        format has stopped mattering:
      </p>
      <p>
        <strong>The text</strong>, punctuated into real sentences, separated by speaker, and timestamped so
        you can jump back to the moment something was said. Exports as plain text, Markdown, CSV or JSON.
      </p>
      <p>
        <strong>The subtitles</strong>, as SRT and VTT, rebuilt to broadcast conventions rather than left as
        raw fragments: lines capped at 42 characters across at most two lines, cues breaking on sentence
        boundaries, speaker names carried through.
      </p>
      <p>
        <strong>The machine-readable version</strong>, a chunked JSON with metadata and timestamps shaped for
        a vector database. This is the only export that costs anything on top: 1 credit per ten minutes.
      </p>

      <h2>What it costs</h2>
      <p>
        One credit per minute of audio, rounded up, measured from the length detected after upload rather
        than the file size. A 200MB WAV of a thirty-minute meeting costs the same thirty credits as a 30MB
        MP3 of the same meeting.
      </p>
      <table>
        <thead>
          <tr>
            <th>Length</th>
            <th>Credits</th>
            <th>Cost at Plus pricing</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>3 minutes</td>
            <td>3 credits</td>
            <td>€0.08</td>
          </tr>
          <tr>
            <td>30 minutes</td>
            <td>30 credits</td>
            <td>€0.75</td>
          </tr>
          <tr>
            <td>1 hour</td>
            <td>60 credits</td>
            <td>€1.50</td>
          </tr>
          <tr>
            <td>2 hours</td>
            <td>120 credits</td>
            <td>€3.00</td>
          </tr>
        </tbody>
      </table>
      <p>
        Plus is €25 for 1,000 credits. There is no subscription, and credits never expire.
      </p>

      <h2>Frequently asked questions</h2>

      <h3>Do I need to convert my M4A to MP3 first?</h3>
      <p>
        No. M4A uploads as it is, and converting it to MP3 first would cost you a step and a little audio
        quality without making the transcript any better. Drop the file in as it came off the phone.
      </p>

      <h3>Can I transcribe a WhatsApp voice message?</h3>
      <p>
        Yes. WhatsApp exports voice messages as OPUS, which is one of the {UPLOAD_FORMAT_COUNT_WORD} supported
        formats. Export the message from the chat and upload the file without renaming or converting it.
      </p>

      <h3>What if my file is bigger than {UPLOAD_MAX_FILE_MB}MB?</h3>
      <p>
        Split it at a pause between sentences and upload the parts separately. Because you pay per minute of
        audio rather than per file, splitting costs you nothing extra. This comes up most with uncompressed
        WAV, where an hour of stereo runs to roughly 600MB.
      </p>

      <h3>Does the format affect how accurate the transcript is?</h3>
      <p>
        Not meaningfully. Recording quality matters — a clear microphone in a quiet room beats a phone across
        a table — but a lossless FLAC and a decent MP3 of the same recording transcribe to much the same
        text.
      </p>

      <h3>Which format should I upload if I have a choice?</h3>
      <p>
        Whichever one you already have. If you are choosing what to record in, anything at or above 128 kbps
        in a common format is well past the point where the model stops noticing.
      </p>

      <h3>What happens to my file after it is transcribed?</h3>
      <p>
        It is deleted as soon as transcription finishes, and only the text stays in your library. Everything
        is processed inside the EU, the transcription provider is opted out of training on your data, and its
        own retention is set to one day, the shortest it offers.
      </p>
    </ToolPageTemplate>
  )
}

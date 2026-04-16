import type { Metadata } from "next"
import Link from "next/link"
import { ToolPageTemplate } from "@/components/content/templates/ToolPageTemplate"
import { AUTHORS } from "@/lib/authors"

export const metadata: Metadata = {
  title: "Audio File to Text — Upload MP3, MP4, WAV & More | INDXR.AI",
  description:
    "Upload any audio or video file and get a full transcript. Supports MP3, MP4, WAV, M4A, OGG, FLAC, WEBM up to 500MB. 1 credit per minute, powered by AssemblyAI Universal-3 Pro.",
}

const faqs = [
  {
    q: "Is there a file size limit?",
    a: "500MB maximum per upload. This covers approximately 8+ hours of audio at typical recording bitrates. For larger files, split them first using a tool like FFmpeg or Audacity.",
  },
  {
    q: "Does it work for video files as well as audio?",
    a: "Yes. MP4 and WEBM video files are supported — INDXR.AI extracts the audio track automatically. You don't need to extract audio yourself before uploading.",
  },
  {
    q: "How accurate is the transcription?",
    a: "AssemblyAI Universal-3 Pro achieves 94–96%+ accuracy on clean recordings. For challenging audio — heavy accents, significant background noise, overlapping speakers — accuracy varies but typically outperforms YouTube's auto-captions under the same conditions.",
  },
  {
    q: "Can I transcribe in languages other than English?",
    a: "Yes. 99+ languages are supported with automatic detection. The transcript will be in the language spoken in the audio.",
  },
  {
    q: "Does the file get stored on INDXR.AI's servers?",
    a: "The audio file is processed and then discarded. Only the resulting transcript text is stored in your library. INDXR.AI does not retain uploaded audio files after transcription is complete.",
  },
  {
    q: "What's the difference between audio upload and YouTube AI Transcription?",
    a: "The transcription pipeline is identical — both use AssemblyAI Universal-3 Pro and cost 1 credit per minute. The difference is the source: YouTube AI Transcription downloads the audio from a YouTube URL automatically, while audio upload lets you bring your own file from any source.",
  },
]

const sources = [
  {
    label: "AssemblyAI Universal-3 Pro — Model benchmarks",
    url: "https://www.assemblyai.com/blog/universal-3",
  },
]

export default function AudioToTextPage() {
  return (
    <ToolPageTemplate
      title="Audio File to Text — Upload Any Audio, Get a Transcript"
      metaDescription="Upload any audio or video file and get a full transcript. Supports MP3, MP4, WAV, M4A, OGG, FLAC, WEBM up to 500MB. 1 credit per minute, powered by AssemblyAI Universal-3 Pro."
      publishedAt="2026-04-16"
      updatedAt="2026-04-16"
      author={AUTHORS["indxr-editorial"]}
      faqs={faqs}
      sources={sources}
    >
      <p>
        Not all audio lives on YouTube. Podcast episodes, recorded meetings, lecture recordings, interview
        files, local video downloads — these don&apos;t have a URL to paste. INDXR.AI&apos;s Audio Upload tab accepts
        any audio or video file and runs it through the same AI transcription pipeline used for YouTube
        videos.
      </p>

      <p>The result is a full text transcript, stored in your library, exportable in every format INDXR.AI supports.</p>

      <h2>Supported Formats and Limits</h2>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>MP3</code></td><td>Most common audio format, fully supported</td></tr>
          <tr><td><code>MP4</code></td><td>Video file — audio track extracted automatically</td></tr>
          <tr><td><code>WAV</code></td><td>Uncompressed audio, typically larger files</td></tr>
          <tr><td><code>M4A</code></td><td>Apple audio format, common from iOS recordings</td></tr>
          <tr><td><code>OGG</code></td><td>Open format, common from browser and web recordings</td></tr>
          <tr><td><code>FLAC</code></td><td>Lossless audio, larger files</td></tr>
          <tr><td><code>WEBM</code></td><td>Web video format, common from browser recordings</td></tr>
        </tbody>
      </table>

      <p>
        Maximum file size: <strong>500MB</strong>. Most web upload tools cap at 50–100MB. INDXR.AI&apos;s
        upload pipeline handles larger files without that constraint — we&apos;ve tested uploads of over 200MB
        and 210+ minutes of audio without issues.
      </p>

      <p>
        If you need to split very large files, FFmpeg handles this cleanly:{" "}
        <code>ffmpeg -i large_file.mp3 -t 3600 part1.mp3 -ss 3600 part2.mp3</code> splits a file at the
        1-hour mark.
      </p>

      <h2>How the Transcription Works</h2>

      <p>
        Once uploaded, the file is processed through AssemblyAI Universal-3 Pro — the same model used for
        YouTube AI Transcription. The model handles a wide range of audio conditions:
      </p>

      <p>
        <strong>Languages:</strong> 99+ languages with automatic detection. You don&apos;t need to specify the
        language; the model identifies it from the audio.
      </p>

      <p>
        <strong>Audio quality:</strong> The model is trained on real-world audio including phone
        recordings, conference recordings with background noise, and studio-quality content. YouTube&apos;s
        auto-captions achieve 60–80% accuracy on challenging audio — AssemblyAI Universal-3 Pro
        consistently reaches 94–96%+ on clean recordings.
      </p>

      <p>
        <strong>Punctuation:</strong> Unlike auto-captions, AssemblyAI output includes proper punctuation
        and sentence boundaries. This matters for readability, for SRT/VTT timing quality, and for
        downstream uses like RAG export where sentence detection affects chunk quality.
      </p>

      <p>
        <strong>Processing time:</strong> Approximately 1 minute of processing time per 10 minutes of
        audio for most files. You receive a live elapsed timer during processing, and the job continues on
        the server even if your connection drops briefly.
      </p>

      <h2>Credit Cost</h2>

      <p>
        Audio Upload transcription costs <strong>1 credit per minute of audio</strong>, with a minimum of
        1 credit. The credit is charged based on the actual audio duration detected after upload, not the
        file size.
      </p>

      <table>
        <thead>
          <tr>
            <th>Audio length</th>
            <th>Credits</th>
            <th>Cost at Basic (€6.99/500cr)</th>
            <th>Cost at Plus (€13.99/1,200cr)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Under 1 minute</td><td>1 credit</td><td>€0.01</td><td>€0.01</td></tr>
          <tr><td>10 minutes</td><td>10 credits</td><td>€0.14</td><td>€0.12</td></tr>
          <tr><td>30 minutes</td><td>30 credits</td><td>€0.42</td><td>€0.35</td></tr>
          <tr><td>1 hour</td><td>60 credits</td><td>€0.84</td><td>€0.70</td></tr>
          <tr><td>2 hours</td><td>120 credits</td><td>€1.68</td><td>€1.40</td></tr>
        </tbody>
      </table>

      <h2>What You Get After Transcription</h2>

      <p>
        The transcript appears in your library alongside any YouTube transcripts you&apos;ve extracted. From
        there:
      </p>

      <p>
        <strong>Export in any format:</strong> TXT plain, TXT with timestamps, Markdown with YAML
        frontmatter, SRT, VTT, CSV, JSON, or RAG-optimized JSON. SRT and VTT output is resegmented to
        3–7 second blocks at 42 characters per line — the professional subtitle standard.
      </p>

      <p>
        <strong>Edit in the rich-text editor:</strong> Correct errors, add formatting, and annotate the
        transcript. Edits are saved separately from the original, so you can always revert.
      </p>

      <p>
        <strong>Generate an AI summary:</strong> An AI-generated summary with key points and action items
        is available for any transcript in your library, at 3 credits.
      </p>

      <p>
        <strong>Export as RAG JSON:</strong> For podcasts, lectures, or interviews you want to make
        searchable via a vector database — enable RAG JSON export to get chunked, metadata-rich output
        ready for LangChain, LlamaIndex, or direct vector database ingestion. See{" "}
        <Link href="/youtube-transcript-for-rag">YouTube Transcripts for RAG Pipelines</Link> for the
        full pipeline.
      </p>

      <h2>Common Use Cases</h2>

      <p>
        <strong>Podcast transcription:</strong> Upload an episode MP3 directly. Export as Markdown for
        show notes, TXT for a newsletter, or RAG JSON to build a searchable podcast archive.
      </p>

      <p>
        <strong>Recorded lecture notes:</strong> A 90-minute lecture recording becomes a searchable,
        editable transcript. Export as Markdown for an Obsidian note, or as CSV for analysis alongside
        other course materials.
      </p>

      <p>
        <strong>Interview transcription:</strong> Upload a recorded interview. The transcript is accurate
        enough to quote from directly — useful for journalists, researchers, and user researchers.
      </p>

      <p>
        <strong>Downloaded YouTube videos:</strong> If you&apos;ve downloaded a YouTube video that has no
        captions, extract the audio and upload it to get a transcript the same way as a live YouTube URL.
      </p>

      <p>
        For YouTube videos (where you have a URL rather than a downloaded file), use the{" "}
        <Link href="/youtube-transcript-generator">YouTube Transcript Generator</Link> instead — it
        handles auto-caption extraction for free and AI transcription when captions aren&apos;t available. For
        credit packages, see the <Link href="/pricing">pricing page</Link>.
      </p>
    </ToolPageTemplate>
  )
}

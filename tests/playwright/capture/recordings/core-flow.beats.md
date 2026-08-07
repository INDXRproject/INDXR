# core-flow.webm — beat sheet (for the montage)

**Source:** `tests/playwright/capture/core-flow-video.spec.ts` (deterministic, stubbed backend — no credits spent).
**Format:** WebM (VP8), 1280×720, ~26.4 s, light theme. Regenerate with the one command in
`docs/wiki/content/screenshot-machine.md` » Video-opnamestandaard.
**What it shows:** the core flow — a YouTube link lands in the field → AI transcription is chosen →
extraction runs through its phases → the transcript appears. Fixture `kBdfcR-8hEY`
("Justice… — Episode 01", Harvard, 54:56 → 55 credits). No youtube.com page is ever shown (ADR-088).
Timestamps are approximate (±0.5 s).

| Time | Beat | On screen |
|------|------|-----------|
| 0:00–0:03 | **Idle** | Empty Transcribe page, cursor resting near the header. Reads clean. |
| 0:03–0:08 | **Link lands** | The `watch?v=kBdfcR-8hEY` URL is typed into the field, character by character. |
| 0:08–0:09 | **Method chosen** | "AI transcription" selected; the card highlights (indigo). |
| 0:09–0:11 | **Start** | "Extract" → button reads "Checking…" while metadata loads. |
| 0:11–0:14 | **Cost is honest** | Cost card: fixture title · 54:56 · AI transcription · **Total 55 credits** · "445 left after this". Held so the number reads. |
| 0:14 | **Confirm** | "Extract — 55 credits" clicked → "Extracting…". |
| 0:15–0:17 | **Downloading** | "Downloading audio · Fetching audio from YouTube", determinate bar 0.6 → 5.7 MB, 4-segment phase strip, elapsed 0:01→0:03. |
| 0:17–0:21 | **Transcribing** | "Transcribing · AI is processing the audio" (indeterminate). |
| 0:21–0:22 | **Saving** | "Saving to your library". |
| 0:22–0:26 | **Result** | "Transcript ready — 55 min · 3 lines · 55 credits · Completed in 0:09", Copy / Export / View in Library, Reader Mode, and the real transcript text (the trolley-car opening). Held to the end. |

## Montage notes
- **Keep:** empty→typed (0–8), method + cost card (8–14), the phase progression (15–22), the result reveal (22–26).
- **Safe to speed/trim:** the typing (0:03–0:08) and the indeterminate "Transcribing" stretch (0:17–0:21) carry no new information — compress them.
- **The money beat is the reveal (0:22–0:26)** — a real transcript with real timestamps. Give it room.
- The transcript is short (3 verbatim fixture captions) — frame the top of the result card, not a long scroll.

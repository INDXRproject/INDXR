# Marketing screenshots

All images: 1600×1000 (16:10) + a `-ph` variant at 1270×760 (Product Hunt's gallery size).
Light mode, deviceScaleFactor 2 for a crisp retina export.

## For external platforms (AlternativeTo, Product Hunt)

Use these — they show the real product with a varied demo transcript, the AI summary, the
export menu, and pricing:

- `app-transcript.png` / `app-transcript-ph.png` — transcript view with speaker labels and
  timestamps (2-speaker interview demo, `e2e-1@indxr.ai`'s library)
- `app-summary.png` / `app-summary-ph.png` — AI summary of the same transcript
- `app-export.png` / `app-export-ph.png` — export menu open (TXT, Markdown, SRT, VTT, CSV, JSON)
- `pricing.png` / `pricing-ph.png` — indxr.ai/pricing, all four packages

## Internal use only — do not post externally

These show the quick-checkout balie at the most expensive route (€2.00 minimum) with a
synthesized single-voice preview — kept for internal reference, not for public listings:

- `balie-upload.png` / `balie-upload-ph.png`
- `balie-prijs.png` / `balie-prijs-ph.png`
- `balie-voorproefje.png` / `balie-voorproefje-ph.png`

## How the demo transcript was made

The account's "Customer interview — remote work habits" transcript is a synthesized two-voice
dialogue (gTTS, two different English accents for speaker A/B), run through the real AI
transcription + summary pipeline against production — not a copied or scraped recording.
AssemblyAI's diarization merged both voices into one speaker; the `speaker` field in that one
transcript row was corrected afterward (by timestamp, matched against the known script) so the
screenshots show two distinct speakers. No other transcript content or any credit/payment
behavior was touched.

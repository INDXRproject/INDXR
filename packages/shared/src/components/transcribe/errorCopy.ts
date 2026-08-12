import posthog from "posthog-js"

import type { ErrorCardAction } from "./ErrorCard"

/**
 * Central copy map for the transcribe flow (ADR-080), keyed on the backend error
 * code. The backend speaks three overlapping vocabularies for the same failures:
 *   · sync HTTP `code`         (whisper/playlist endpoints — backend/main.py)
 *   · async job `error_type`   (backend/transcription_pipeline.py:_classify_download_error, worker.py)
 *   · /api/extract `error_type` (a second inline classifier — backend/main.py:560-586)
 * so the well-known user-facing codes below appear across more than one channel and
 * are matched the same way. Every code the backend defines should point back here
 * (see the comments added at those definition sites).
 *
 * Any code NOT in this map still gets the same card — neutral copy, the code visible,
 * and a contact action — and is logged so it can be added later (the brief said
 * "Sentry"; frontend Sentry isn't wired, so this uses PostHog, which is).
 *
 * This is copy only. It never changes control flow — callers keep their existing
 * early returns and throws and just render <ErrorCard {...resolveErrorCopy(code, ctx)} />.
 */

export type ErrorCtx = {
  requiredCredits?: number | null
  availableCredits?: number | null
  // Read from transcription_jobs.credits_refunded, not asserted. When present and > 0, a "N credits
  // refunded" line is shown; when absent/0, the card says nothing about credits (silence beats a
  // wrong claim — ADR-080). System-behaviour assumptions are not reliable enough here.
  creditsRefunded?: number | null
  maxHours?: number | null
  maxVideos?: number | null
  aiCost?: number | null
  fallbackMessage?: string | null
  onRetryUrl?: () => void
  onUseAi?: () => void
  onSwitchToAudio?: () => void
  billingHref?: string
  libraryHref?: string
  accountHref?: string
  loginHref?: string
  contactHref?: string
}

export type ResolvedError = {
  title: string
  body: string
  actions: ErrorCardAction[]
  code: string | null
  // Data-driven credit line (from creditsRefunded), or null to say nothing about credits.
  creditsNote: string | null
}

type Entry = {
  title: string
  body: (c: ErrorCtx) => string
  actions?: (c: ErrorCtx) => ErrorCardAction[]
}

const retryUrl = (c: ErrorCtx): ErrorCardAction[] =>
  c.onRetryUrl ? [{ label: "Try another URL", onClick: c.onRetryUrl, variant: "secondary" }] : []

const buyCredits = (c: ErrorCtx): ErrorCardAction[] =>
  c.billingHref ? [{ label: "Buy credits", href: c.billingHref }] : []

// Try again + Audio Upload — Audio Upload is the real way in when YouTube fetching fails,
// so it is offered here (contact support is not the escape for these).
const retryOrAudio = (c: ErrorCtx): ErrorCardAction[] => {
  const out: ErrorCardAction[] = []
  if (c.onRetryUrl) out.push({ label: "Try again", onClick: c.onRetryUrl })
  if (c.onSwitchToAudio) out.push({ label: "Use Audio Upload", onClick: c.onSwitchToAudio, variant: out.length ? "secondary" : "primary" })
  return out
}

// The download-failure family (timeout / partial_write / proxy_error / ytdlp_parse /
// extraction_error): fetching the audio from YouTube failed for a connection reason — not the
// video. Nothing is charged (a reservation, if any, is refunded on failure — ADR-050).
const audioFetchFailed = (title: string): Entry => ({
  title,
  // No credit claim in the body — the credit outcome is rendered from creditsRefunded (see below).
  body: () =>
    "We couldn't fetch this video's audio — a temporary connection problem on our side, not the video itself. Try again, or use Audio Upload.",
  actions: retryOrAudio,
})

const COPY: Record<string, Entry> = {
  no_captions: {
    title: "This video has no captions",
    body: () =>
      "YouTube has no caption track for this video. AI transcription can still generate one from the audio. No credits were used.",
    actions: (c) => [
      ...(c.onUseAi
        ? [{ label: c.aiCost ? `Use AI transcription — ${c.aiCost} credits` : "Use AI transcription", onClick: c.onUseAi } as ErrorCardAction]
        : []),
      ...retryUrl(c),
    ],
  },
  members_only: {
    title: "This video is members-only",
    body: () =>
      "It needs a channel membership that YouTube won't let us access. No credits were used.",
    actions: (c) => retryUrl(c),
  },
  age_restricted: {
    title: "This video is age-restricted",
    body: () =>
      "YouTube blocks transcription of age-gated videos. You can download the audio yourself and upload it instead. No credits were used.",
    actions: (c) => [
      ...(c.onSwitchToAudio ? [{ label: "Upload audio instead", onClick: c.onSwitchToAudio } as ErrorCardAction] : []),
      ...retryUrl(c),
    ],
  },
  youtube_restricted: {
    title: "This video isn't available",
    body: () => "It's private, removed, or blocked in this region. No credits were used.",
    actions: (c) => retryUrl(c),
  },
  bot_detection: {
    title: "YouTube rate-limited this request",
    body: () =>
      "Each attempt goes out over a different connection, and trying again usually gets through. No credits were used.",
    actions: (c) => (c.onRetryUrl ? [{ label: "Try again", onClick: c.onRetryUrl }] : []),
  },
  // timeout and connection_error are distinct backend failures (split in the download pipeline this
  // afternoon): a slow download that ran out of time vs. a dropped connection. Kept separate so the
  // copy names the real cause. The refund line is NOT in the body — it's rendered data-driven from
  // creditsRefunded (see audioFetchFailed note above), so asserting it here would double it.
  timeout: {
    title: "The download took too long",
    body: () =>
      "We couldn't download this video's audio in time — usually a slow connection to YouTube for a longer video. Please try again; it often works on a second attempt, or use Audio Upload.",
    actions: retryOrAudio,
  },
  connection_error: {
    title: "The connection to YouTube dropped",
    body: () =>
      "The connection to YouTube dropped before we could fetch the audio. Please try again, or use Audio Upload.",
    actions: retryOrAudio,
  },
  server_error: audioFetchFailed("YouTube is temporarily unavailable"),
  partial_write: audioFetchFailed("The audio download was interrupted"),
  proxy_error: audioFetchFailed("We couldn't reach this video's audio"),
  ytdlp_parse: audioFetchFailed("We couldn't read this video's audio"),
  extraction_error: audioFetchFailed("We couldn't fetch this video's audio"),
  no_speech: {
    title: "No speech detected",
    body: () =>
      "This audio is music or silence, so there's nothing to transcribe. The credits were refunded to your balance.",
    actions: (c) => retryUrl(c),
  },
  no_speech_detected: {
    title: "No speech detected",
    body: () =>
      "This audio is music or silence, so there's nothing to transcribe. The credits were refunded to your balance.",
    actions: (c) => retryUrl(c),
  },
  insufficient_credits: {
    title: "Not enough credits",
    body: (c) =>
      c.requiredCredits != null && c.availableCredits != null
        ? `This needs ${c.requiredCredits} credit${c.requiredCredits === 1 ? "" : "s"} and you have ${c.availableCredits}. No credits were used.`
        : c.availableCredits != null
          ? `You have ${c.availableCredits} credit${c.availableCredits === 1 ? "" : "s"}, which isn't enough for this. No credits were used.`
          : "You don't have enough credits for this. No credits were used.",
    actions: (c) => buyCredits(c),
  },
  storage_full: {
    title: "Your library is full",
    body: () =>
      "This transcript wasn't saved because your library is at its limit. No credits were used. Free up space or buy more on your account.",
    actions: (c) => [
      ...(c.libraryHref ? [{ label: "Manage library", href: c.libraryHref, variant: "secondary" } as ErrorCardAction] : []),
      ...(c.accountHref ? [{ label: "Buy space", href: c.accountHref } as ErrorCardAction] : []),
    ],
  },
  // "Too long" arrives on TWO channels with two slugs — the async job error_type "duration_error"
  // (transcription_pipeline.py) AND the sync HTTP code "duration_exceeds_max" (main.py:925). Only
  // the sync one was mapped before, so the async path fell through to the neutral fallback. Both are
  // real, live codes the backend sends; both point at the same copy. (Backend slugs are the source
  // of truth — neither is renamed.)
  duration_error: {
    title: "This audio is too long",
    body: (c) =>
      `AI transcription supports up to ${c.maxHours ?? 10} hours per file. Split it into shorter parts. No credits were used.`,
  },
  duration_exceeds_max: {
    title: "This audio is too long",
    body: (c) =>
      `AI transcription supports up to ${c.maxHours ?? 10} hours per file. Split it into shorter parts. No credits were used.`,
  },
  file_too_large: {
    title: "This file is too large",
    body: () => "Uploads are capped at 500 MB. No credits were used.",
  },
  too_many_jobs: {
    title: "Too many jobs at once",
    body: () =>
      "You already have transcriptions running. Wait for one to finish and try again. No credits were used.",
  },
  too_many_videos: {
    title: "This playlist is too large",
    body: (c) =>
      `Playlists are capped at ${c.maxVideos ?? 500} videos. Select fewer and try again. No credits were used.`,
  },
  suspended: {
    title: "Your account is paused",
    body: () => "Transcription is disabled while your account is paused. No credits were used.",
    actions: (c) => (c.contactHref ? [{ label: "Contact support", href: c.contactHref }] : []),
  },
  unauthorized: {
    title: "You're signed out",
    body: () => "Sign in again to continue. No credits were used.",
    actions: (c) => (c.loginHref ? [{ label: "Log in", href: c.loginHref }] : []),
  },
  channel_url: {
    title: "That's a channel, not a video",
    body: () => "Paste a link to a single video or a playlist. No credits were used.",
    actions: (c) => retryUrl(c),
  },
  unsupported_file: {
    title: "Unsupported file type",
    body: (c) =>
      c.fallbackMessage?.trim() ||
      "Upload a common audio or video file — MP3, MP4, MOV, MKV, WAV, M4A and more. No credits were used.",
  },
  no_audio: {
    title: "No audio in this file",
    body: (c) =>
      c.fallbackMessage?.trim() ||
      "This file doesn't contain any audio we can transcribe. Upload an audio or video file that has an audio track. No credits were used.",
  },

  // ── Our-side failures ──────────────────────────────────────────────────────────
  // These are our problems, not the user's video. Where a reservation was made and refunded, the
  // amount is rendered data-driven from creditsRefunded (creditsNote) — the body never asserts a
  // second "refunded" line (that would double it). Different cause → different title/body, same
  // reassurance: it wasn't your video, try again.
  api_error: {
    title: "Our transcription provider had a problem",
    body: () =>
      "The AI transcription service failed on our side — not your video. Please try again in a moment.",
    actions: retryOrAudio,
  },
  compression_error: {
    title: "We couldn't prepare this audio",
    body: () =>
      "Something went wrong preparing the audio on our side — not your video. Please try again.",
    actions: retryOrAudio,
  },
  worker_crashed: {
    title: "This job was dropped on our side",
    body: () =>
      "A processing worker went down before your transcript finished — not your video. Please try again.",
    actions: retryOrAudio,
  },
  stuck_pending: {
    title: "This job stalled on our side",
    body: () =>
      "Your transcription didn't start in time on our side — not your video. Please try again.",
    actions: retryOrAudio,
  },
  // credit_deduction_failed touches money and gets its own explicit sentence: the deduction failed,
  // so nothing ran and nothing was charged (silence about money is not an option here). Nothing was
  // taken, so there is no refund amount to render — the body states it in full.
  credit_deduction_failed: {
    title: "The credit step didn't go through",
    body: () =>
      "We couldn't complete the credit transaction, so this didn't run and you weren't charged. Please try again.",
    actions: retryOrAudio,
  },
  // credit_check_error / validation_error / internal_error: generic our-side failures that happen
  // before any charge. One shared line, the code stays visible on the card for support.
  credit_check_error: {
    title: "Something went wrong on our side",
    body: () =>
      "We couldn't complete this because of a problem on our end — not your video. No credits were used. Please try again.",
    actions: retryOrAudio,
  },
  validation_error: {
    title: "Something went wrong on our side",
    body: () =>
      "We couldn't complete this because of a problem on our end — not your video. No credits were used. Please try again.",
    actions: retryOrAudio,
  },
  internal_error: {
    title: "Something went wrong on our side",
    body: () =>
      "We couldn't complete this because of a problem on our end — not your video. No credits were used. Please try again.",
    actions: retryOrAudio,
  },
  // watchdog_permanent_failure: the job was interrupted and auto-recovery failed, so the watchdog
  // gave up. The refund is GUARANTEED before this code is ever set: worker.py:800-838 books the
  // refund FIRST and only then claims status=error — a failed refund leaves the job 'interrupted'
  // for the next cycle, so the user never sees this code with credits still held. The body says so.
  watchdog_permanent_failure: {
    title: "We gave up on this job — and refunded it",
    body: () =>
      "This transcription was interrupted, and our automatic recovery couldn't finish it, so we stopped retrying. The credits you reserved for it have been returned. Start it again whenever you're ready.",
    actions: retryOrAudio,
  },
  // invalid_request: a malformed/missing-field request (backend/main.py:850-886) — rejected before
  // anything ran or was charged. Rare in normal use; retry is the fix.
  invalid_request: {
    title: "That request didn't come through",
    body: () =>
      "Something was missing or malformed in the request, so nothing was processed and no credits were used. Please try again.",
    actions: retryOrAudio,
  },
}

/**
 * Resolve copy for a backend error code. Unknown codes get a neutral card with the
 * code shown and a contact action, and are logged so they can be added to the map.
 */
export function resolveErrorCopy(code: string | null | undefined, ctx: ErrorCtx = {}): ResolvedError {
  const key = (code ?? "").trim()
  const entry = key ? COPY[key] : undefined

  // Credit line, read from data — never asserted. Only shown when a refund is actually reported.
  const creditsNote =
    ctx.creditsRefunded != null && ctx.creditsRefunded > 0
      ? `${ctx.creditsRefunded} credit${ctx.creditsRefunded === 1 ? "" : "s"} refunded to your balance`
      : null

  if (entry) {
    return {
      title: entry.title,
      body: entry.body(ctx),
      actions: entry.actions ? entry.actions(ctx) : [],
      code: key || null,
      creditsNote,
    }
  }

  // Unknown / infra code → neutral, honest fallback. Never a dead end, never raw red text.
  try {
    posthog.capture("transcribe_error_unknown_code", { code: key || "(none)" })
  } catch {
    // posthog may be uninitialised (e.g. SSR) — non-fatal.
  }
  if (key) console.warn(`[transcribe] unmapped error code: ${key}`)

  // Never surface the raw backend/provider string as the body — an unmapped code could carry a
  // yt-dlp stack trace with a "report an issue" URL. The body is always our own safe copy; the
  // code (when present) is shown small so support can still identify it.
  const actions: ErrorCardAction[] = [...retryOrAudio(ctx)]
  if (!actions.length && ctx.contactHref) actions.push({ label: "Contact support", href: ctx.contactHref })

  return {
    title: "Something went wrong",
    body: "We couldn't finish this. Try again, or use Audio Upload.",
    actions,
    code: key || null,
    creditsNote,
  }
}

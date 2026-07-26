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
      "YouTube asked us to confirm we're not a bot — this is temporary. Try again in a moment. No credits were used.",
    actions: (c) => (c.onRetryUrl ? [{ label: "Try again", onClick: c.onRetryUrl }] : []),
  },
  timeout: {
    title: "The connection dropped",
    body: () =>
      "A temporary network issue interrupted this. Any reserved credits were refunded. Try again.",
    actions: (c) => (c.onRetryUrl ? [{ label: "Try again", onClick: c.onRetryUrl }] : []),
  },
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
      "Upload an MP3, WAV, M4A or another common audio file. No credits were used.",
  },
}

/**
 * Resolve copy for a backend error code. Unknown codes get a neutral card with the
 * code shown and a contact action, and are logged so they can be added to the map.
 */
export function resolveErrorCopy(code: string | null | undefined, ctx: ErrorCtx = {}): ResolvedError {
  const key = (code ?? "").trim()
  const entry = key ? COPY[key] : undefined

  if (entry) {
    return {
      title: entry.title,
      body: entry.body(ctx),
      actions: entry.actions ? entry.actions(ctx) : [],
      code: key || null,
    }
  }

  // Unknown / infra code → neutral, honest fallback. Never a dead end, never raw red text.
  try {
    posthog.capture("transcribe_error_unknown_code", { code: key || "(none)" })
  } catch {
    // posthog may be uninitialised (e.g. SSR) — non-fatal.
  }
  if (key) console.warn(`[transcribe] unmapped error code: ${key}`)

  const actions: ErrorCardAction[] = []
  if (ctx.onRetryUrl) actions.push({ label: "Try again", onClick: ctx.onRetryUrl })
  if (ctx.contactHref) actions.push({ label: "Contact support", href: ctx.contactHref, variant: actions.length ? "secondary" : "primary" })

  return {
    title: "Something went wrong",
    body:
      ctx.fallbackMessage?.trim() ||
      "We couldn't finish this. If any credits were reserved for it, they've been returned to your balance.",
    actions,
    code: key || null,
  }
}

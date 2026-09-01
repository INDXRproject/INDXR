"use client"

import { useRef } from "react"
import posthog from "posthog-js"
import { Button } from "../ui/button"
import { loginWithGoogleAction } from "../../actions/auth-actions"
import { PH_DID_PARAM } from "../../lib/posthog-identity"

/** Official multi-colour Google "G" mark (Google brand guidelines). Explicit fills so it stays
 *  full-colour on any button variant/theme. */
function GoogleG() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * Shared "Continue with Google" button — the real Google mark + brand-standard label, wired to the
 * Google OAuth server action. Single source so signup and login stay identical (login used to render a
 * generic Lucide Chrome icon + "Google", which read as unfinished).
 */
export function GoogleSignInButton({ next }: { next?: string | null }) {
  const didRef = useRef<HTMLInputElement>(null)
  return (
    <form action={loginWithGoogleAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {/* The anonymous PostHog distinct_id, read at click time and carried through the OAuth roundtrip
          so the pre-signup identity can be aliased into the user on return (persistence:'memory' resets
          it on the hard reload to Google). See lib/posthog-identity. */}
      <input ref={didRef} type="hidden" name={PH_DID_PARAM} />
      <Button
        variant="outline"
        type="submit"
        className="w-full h-11 gap-3 font-medium"
        onClick={() => {
          if (didRef.current) didRef.current.value = posthog.get_distinct_id?.() ?? ""
        }}
      >
        <GoogleG />
        Continue with Google
      </Button>
    </form>
  )
}

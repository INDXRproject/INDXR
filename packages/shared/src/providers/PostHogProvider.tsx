'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      // EU instance (https://eu.i.posthog.com) — data blijft in de EU. Gezet via env.
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'identified_only',
      // Cookieless: in-memory persistence zet géén cookie/localStorage device-id →
      // geen herkenning over sessies heen. Privacy-by-design (roadmap 1.32).
      persistence: 'memory',
      capture_pageview: false,
      // Geen session replay — records DOM/inputs, botst met cookieless/privacy.
      disable_session_recording: true,
      // IP nooit opslaan: expliciet $ip=null → PostHog-ingestion slaat geen IP op en
      // doet geen GeoIP. In-code (robuuster dan de org-level toggle).
      before_send: (event) => {
        if (event && event.properties) {
          event.properties.$ip = null
        }
        return event
      },
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}

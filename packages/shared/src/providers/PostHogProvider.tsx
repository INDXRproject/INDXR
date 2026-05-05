'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'identified_only', // or 'always' if you want anonymous users too
      capture_pageview: false, // We manually handle pageviews if using Next.js router events, but for App Router default is okay-ish. actually manual is better for SPA.
      // For App Router, we usually let posthog auto-capture or use a pageview component.
      // Let's stick to default auto capture for simplicity unless we need precise route change tracking.
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}

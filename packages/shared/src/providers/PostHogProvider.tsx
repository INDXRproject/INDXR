'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      // First-party reverse proxy: events gaan via ons eigen domein (/ingest → EU, zie
      // beide next.config.ts). Adblockers herkennen dit niet als tracker → datavolledigheid.
      // De EU-fallback-env voedt de rewrite-TARGET in next.config, niet dit pad.
      api_host: '/ingest',
      // ui_host = de echte EU-UI, zodat dashboard/toolbar-links kloppen (het proxy-pad is geen UI).
      ui_host: 'https://eu.posthog.com',
      // Do-Not-Track / GPC respecteren: wie tracking bewust weigert wordt niet gemeten.
      respect_dnt: true,
      person_profiles: 'identified_only',
      // Cookieless: in-memory persistence zet géén cookie/localStorage device-id →
      // geen herkenning over sessies heen. Privacy-by-design (roadmap 1.32).
      persistence: 'memory',
      // Pageviews AAN (2026-09-01): losstaand event, raakt de cookieless keuze niet (persistence blijft
      // 'memory' — geen persistent device-id). Ingelogde gebruikers: identify stitcht de events; anonieme
      // bezoekers: aggregaten zonder persoon (person_profiles:'identified_only'). Zonder dit was de stap
      // "app geopend / transcribe-pagina bezocht" volledig onzichtbaar in de activatiefunnel.
      capture_pageview: true,
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

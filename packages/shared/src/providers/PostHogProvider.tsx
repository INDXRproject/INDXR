'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { readStoredChoice } from '../lib/consent'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // FIX B: default cookieless ('memory'), but if the user has ALREADY explicitly consented
    // (analytics_storage granted — stored in the cross-subdomain `indxr_consent` cookie, so it's
    // readable here on both indxr.ai and app.indxr.ai) start persistent immediately. Runtime
    // grant/withdraw is handled by ConsentProvider via set_config. See monitoring.md / ADR-103.
    const consented = readStoredChoice()?.analytics_storage === 'granted'
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
      // Cookieless by default: in-memory persistence zet géén cookie/localStorage device-id →
      // geen herkenning over sessies heen. Privacy-by-design (roadmap 1.32). Ná expliciete consent
      // (FIX B) → 'localStorage+cookie' zodat de distinct_id sessies én de indxr.ai↔app.indxr.ai-hop
      // overleeft; de cookie op `.indxr.ai` (cross_subdomain_cookie) is wat de subdomeinen deelt
      // (localStorage doet dat NIET). Zonder consent blijft het 'memory'.
      persistence: consented ? 'localStorage+cookie' : 'memory',
      cross_subdomain_cookie: true,
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

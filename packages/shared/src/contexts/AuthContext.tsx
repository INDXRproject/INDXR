"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"
import { createClient } from "../utils/supabase/client"
import { User } from "@supabase/supabase-js"
import type { RagChunkSize } from "../lib/pricing"
import posthog from 'posthog-js'
import { PH_DID_PARAM, isValidDistinctId } from "../lib/posthog-identity"

export interface UserCredits {
  credits: number
  playlistQuotaUsed: number
  playlistQuotaRemaining: number
  quotaResetsAt: string
}

export interface UserProfile {
  username: string | null
  role: string | null
  avatar_color: string | null
  rag_export_confirmed: boolean
  rag_chunk_size: RagChunkSize
}

export interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  credits: number | null
  quota: UserCredits | null
  loading: boolean
  refreshCredits: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ... imports

export function AuthProvider({ 
  children, 
  initialUser = null 
}: { 
  children: ReactNode
  initialUser?: User | null 
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [quota, setQuota] = useState<UserCredits | null>(null)
  const [loading, setLoading] = useState(!initialUser) // If we have user, we are not loading auth (credits still async)
  const supabase = createClient()

  // FIX A — bridge the pre-signup anonymous PostHog id across the OAuth / email-verification hard reload.
  // Read the URL param ONCE at first render (lazy useRef initialiser runs before any effect, so nothing
  // — not even a pageview/replaceState — can strip it first) and validate it. On return the user is
  // always identified; after identify(userId) we alias this id in so the pre-signup pageviews merge into
  // the user. Then we strip the param and null the ref so it fires exactly once. See lib/posthog-identity.
  const bridgeDidRef = useRef<string | null>(
    typeof window !== 'undefined'
      ? (() => {
          const v = new URLSearchParams(window.location.search).get(PH_DID_PARAM)
          return isValidDistinctId(v) ? v : null
        })()
      : null
  )

  const fetchCredits = useCallback(async (userId: string) => {
      // ... existing fetchCredits logic ...
      try {
        const { data, error } = await supabase.rpc('get_user_credits', { p_user_id: userId })
        if (error) { console.error('Error fetching credits:', error); return }
        
        if (data && data.length > 0) {
            const creditData = data[0]
            setCredits(creditData.credits)
            setQuota({
                credits: creditData.credits,
                playlistQuotaUsed: creditData.playlist_quota_used,
                playlistQuotaRemaining: creditData.playlist_quota_remaining,
                quotaResetsAt: creditData.quota_resets_at
            })
        }
      } catch (e) {
          console.error(e)
      }
      
      try {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        if (profileData) {
            setProfile(profileData)
        }
      } catch (e) {
          console.error('Error fetching profile:', e)
      }
  }, [supabase])

  const refreshCredits = useCallback(async () => {
    if (user) {
      await fetchCredits(user.id)
    }
  }, [user, fetchCredits])

  // Sync server-side user state with client state when router refreshes
  useEffect(() => {
     if (initialUser) {
         setUser(initialUser)
         setLoading(false)
         fetchCredits(initialUser.id)
     }
  }, [initialUser, fetchCredits])

  useEffect(() => {
    // 1. Initial check - Skip if we have initialUser, but verify if we don't?
    // Actually, on mount of a client component, the initialUser prop is authoritative from the server render.
    // So we primarily rely on subscription for updates (logout/login elsewhere).
    
    async function initAuth() {
        if (!initialUser) {
             try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) throw error
                setUser(session?.user ?? null)
                if (session?.user) fetchCredits(session.user.id)
            } catch (e) {
                console.error('Auth Init Error:', e)
            } finally {
                setLoading(false)
            }
        }
    }
    
    initAuth()

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null
      // Only update state if it actually changed to avoid re-renders
      setUser(prev => prev?.id === newUser?.id ? prev : newUser)
      
      if (session?.user) {
        // Identify in PostHog — alleen het pseudonieme user.id; geen e-mail/PII in het profiel.
        // FIX C: device timezone as a person property (real device tz, unlike IP-derived $geoip_time_zone).
        // Reuses this existing identify call — no new capture/event.
        posthog.identify(session.user.id, {
            source: session.user.app_metadata.provider, // 'google', 'email', etc. (geen PII)
            created_at: session.user.created_at,
            device_timezone: typeof Intl !== 'undefined'
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : undefined,
        });

        // FIX A: alias the bridged pre-signup id into this now-identified user. Runs AFTER identify (so the
        // current distinct_id is already userId), once (ref nulled below). Guard: skip if it equals the
        // current id (no-op / self), and isValidDistinctId already rejected non-UUIDs — together these stop
        // two strangers on a shared device or a copied link from being merged.
        const bridgeDid = bridgeDidRef.current
        if (bridgeDid) {
          if (bridgeDid !== posthog.get_distinct_id?.()) {
            posthog.alias(bridgeDid)
          }
          bridgeDidRef.current = null
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            if (url.searchParams.has(PH_DID_PARAM)) {
              url.searchParams.delete(PH_DID_PARAM)
              window.history.replaceState(window.history.state, '', url.toString())
            }
          }
        }

        fetchCredits(session.user.id)
      } else {
        setCredits(null)
        setQuota(null)
        setProfile(null)

        // Clear the PostHog identity ONLY on an actual sign-out — never for an anonymous visitor.
        // onAuthStateChange fires INITIAL_SESSION with session=null on EVERY anonymous page load, and
        // posthog.reset() re-mints the anonymous distinct_id. Running it here unconditionally threw away
        // the ad-landing-page id and generated a fresh one on each page (article, /login), orphaning every
        // pre-signup pageview and defeating the persistent-consent id — so the alias only ever reached one
        // hop back. Guarding on SIGNED_OUT keeps the id stable from landing → login, so the bridge (ADR-103)
        // aliases the true landing-page id. (Verified 2026-09-02: unguarded reset changed the id within
        // ~0.2s on the article page.)
        if (event === 'SIGNED_OUT') {
          posthog.reset();

          // On app host, redirect to marketing domain login after sign-out
          if (typeof window !== 'undefined') {
            const hostname = window.location.hostname
            if (hostname === 'app.indxr.ai' || hostname.startsWith('app.localhost')) {
              const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
              window.location.href = `${marketingUrl}/login`
            }
          }
        }
      }
      
      setLoading(false)
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchCredits, supabase.auth, initialUser])

  return (
    <AuthContext.Provider value={{ user, profile, credits, quota, loading, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

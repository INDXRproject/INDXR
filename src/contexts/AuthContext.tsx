"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"
import { User } from "@supabase/supabase-js"
import posthog from 'posthog-js'

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
      console.log('Auth state change:', event, session?.user?.id)
      
      const newUser = session?.user ?? null
      // Only update state if it actually changed to avoid re-renders
      setUser(prev => prev?.id === newUser?.id ? prev : newUser)
      
      if (session?.user) {
        // Identify in PostHog
        posthog.identify(session.user.id, {
            email: session.user.email,
            source: session.user.app_metadata.provider, // 'google', 'email', etc.
            created_at: session.user.created_at
        });
        fetchCredits(session.user.id)
      } else {
        // Reset PostHog
        posthog.reset();
        setCredits(null)
        setQuota(null)
        setProfile(null)
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

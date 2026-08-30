'use server'

import { createClient } from '../utils/supabase/server'
import { limiters, getClientIp } from '../lib/ratelimit'
import { headers, cookies } from 'next/headers'
import { isDisposableEmail } from '../utils/disposable-email'
import { redirect } from 'next/navigation'
import { safeAppRedirect } from '../lib/safe-redirect'

// Read the first-touch acquisition cookie (set client-side by AcquisitionCapture on the marketing
// landing) and shape it into signUp user_metadata → copied to profiles by the acquisition trigger.
async function readAcquisitionMetadata(): Promise<Record<string, string>> {
  try {
    const raw = (await cookies()).get('indxr_acq')?.value
    if (!raw) return {}
    const acq = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
    const out: Record<string, string> = {}
    // gclid/gbraid/wbraid/click_id_at pass through unrenamed (same names on profiles) — the acquisition
    // trigger copies them from raw_user_meta_data. Only ever persisted here, at real account creation.
    for (const key of ['signup_source', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer', 'landing_path',
      'gclid', 'gbraid', 'wbraid', 'click_id_at'] as const) {
      const v = acq[key]
      if (typeof v === 'string' && v) out[key === 'referrer' ? 'signup_referrer' : key === 'landing_path' ? 'signup_landing_path' : key] = v
    }
    return out
  } catch {
    return {}
  }
}

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rawRedirectTo = formData.get('redirectTo') as string

  // 1. Rate Limiting Check
  const headersList = await headers()
  // Mock request object for getClientIp helper
  const req = {
    headers: headersList
  } as unknown as Request

  const ip = getClientIp(req)
  const { success } = await limiters.login.limit(ip)

  if (!success) {
    return {
      error: 'Too many login attempts. Please try again in 15 minutes.'
    }
  }

  const supabase = await createClient()

  // 2. Auth Attempt
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // 3. Check Onboarding Status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (!profile || !profile.onboarding_completed) {
     // Thread het checkout-doel dóór de onboarding-gate: onboarding-completion
     // brengt de user daar naartoe i.p.v. hardcoded /dashboard. Ongeldig/ontbrekend
     // doel → gewone /onboarding (valt daarna terug op /dashboard).
     const safeNext = safeAppRedirect(rawRedirectTo)
     redirect(safeNext ? `/onboarding?next=${encodeURIComponent(safeNext)}` : '/onboarding')
  }

  // 4. Resolve and validate the post-login redirect target.
  // redirect() is called outside try/catch per Next.js requirement.
  // Absolute cross-origin redirects (app.indxr.ai) are supported since Next.js 14.
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let finalTarget = `${APP_URL}/dashboard`

  if (rawRedirectTo) {
    if (rawRedirectTo.startsWith('/')) {
      finalTarget = rawRedirectTo
    } else {
      try {
        const url = new URL(rawRedirectTo)
        if (
          url.hostname === 'app.indxr.ai' ||
          url.hostname === 'localhost' ||
          url.hostname.startsWith('app.localhost')
        ) {
          finalTarget = rawRedirectTo
        }
      } catch { /* invalid URL — use default */ }
    }
  }

  redirect(finalTarget)
}

export async function signupAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rawRedirectTo = formData.get('redirectTo') as string

  // 1. Rate Limiting Check
  const headersList = await headers()
  const req = {
    headers: headersList
  } as unknown as Request

  const ip = getClientIp(req)
  const { success } = await limiters.signup.limit(ip)

  if (!success) {
    return {
      error: 'Too many signup attempts. Please try again in an hour.'
    }
  }

  // 2. Disposable Email Check
  const isDisposable = await isDisposableEmail(email)
  if (isDisposable) {
    return {
      error: 'Disposable email addresses are not currently supported due to platform policy. Please use a permanent email address.'
    }
  }

  const supabase = await createClient()

  // 3. Signup Attempt — attach first-touch acquisition source into user_metadata so the
  // acquisition trigger can persist it onto profiles (utm/referrer/source per channel).
  const acquisition = await readAcquisitionMetadata()

  // Thread het checkout-doel via de e-mailverificatie-link → callback → onboarding.
  const safeNext = safeAppRedirect(rawRedirectTo)
  const callbackUrl = `${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: acquisition,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // With email confirmation on, Supabase does NOT error when you sign up with an email that already
  // has a confirmed account — to prevent email-enumeration it returns a fake success: a user object with
  // an EMPTY `identities` array, and it sends no email. Without this check the user is told to "check
  // your email" for a mail that never arrives, and no account is created. Surface it instead so they log
  // in. (A real new signup returns exactly one identity.) Trade-off: this does reveal that an email is
  // registered — the accepted, expected UX for a consumer signup; see LESSONS if we ever need to hide it.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: 'An account with this email already exists. Please log in instead.', code: 'account_exists' as const }
  }

  // 4. Success - Client handles redirect/message
  // We return a simple success flag so the client can show a toast/message
  return { success: true }
}

export async function loginWithGoogleAction(formData: FormData) {
  // 1. Rate Limiting Check
  const headersList = await headers()
  const req = {
    headers: headersList
  } as unknown as Request

  const ip = getClientIp(req)
  const { success } = await limiters.login.limit(ip)

  if (!success) {
    redirect('/login?error=Too many login attempts. Please try again in 15 minutes.')
  }

  const supabase = await createClient()

  // Thread het checkout-doel via de OAuth-callback → onboarding.
  const safeNext = safeAppRedirect(formData?.get('next') as string)
  const callbackUrl = `${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`

  // 2. Init OAuth
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data.url) {
    // Redirect to the OAuth provider
    redirect(data.url)
  }

  redirect('/login?error=Failed to initiate Google login')
}

export async function updateProfileAction(formData: FormData) {
  const username = formData.get('username') as string
  const role = formData.get('role') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validation
  if (username.length < 3 || username.length > 20) {
      return { error: 'Username must be between 3 and 20 characters' }
  }

  const usernameRegex = /^[a-zA-Z0-9]+(?:[_-][a-zA-Z0-9]+)*$/
  if (!usernameRegex.test(username)) {
      return { error: 'Username can only contain letters, numbers, underscores, and hyphens. No consecutive special characters.' }
  }

  // Update profile
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    username,
    role,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Profile update error:', error)
    if (error.code === '23505') { // Unique violation for username
       return { error: 'Username already taken. Please choose another.' }
    }
    // Return detailed error for debugging (remove in prod)
    return { error: `Failed to update profile: ${error.message} (${error.code})` }
  }

  // Auto-grant the one-time welcome credits + inbox message at onboarding completion
  // (replaces the old manual "Claim" card). The RPC is guarded by welcome_reward_claimed →
  // exactly once, safe on re-submit/re-login. Best-effort: onboarding must complete regardless.
  try {
    await supabase.rpc('claim_welcome_reward', { p_user_id: user.id })
  } catch (grantErr) {
    console.error('Welcome grant at onboarding failed (non-blocking):', grantErr)
  }

  return { success: true }
}

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get('email') as string

  // Rate Limit check (reuse login limiter or create new one)
  const headersList = await headers()
  const req = { headers: headersList } as unknown as Request
  const ip = getClientIp(req)
  const { success } = await limiters.login.limit(ip) // Reuse login limit for now to prevent spam

  if (!success) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const supabase = await createClient()

  const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
  const finalTarget = encodeURIComponent(`${APP_URL}/dashboard/settings?reset=true`)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${MARKETING_URL}/auth/callback?next=${finalTarget}`,
  })

  if (error) {
    // For security, don't reveal if email exists, but Supabase might behave differently.
    // Usually best to just say "If an account exists..."
    // But for dev debugging let's log it.
    console.error('Reset Password Error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function resendVerificationAction(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/auth/callback`
    }
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

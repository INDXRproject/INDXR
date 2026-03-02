'use server'

import { createClient } from '@/utils/supabase/server'
import { limiters, getClientIp } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { isDisposableEmail } from '@/utils/disposable-email'
import { redirect } from 'next/navigation'

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string || '/dashboard/transcribe'

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
     redirect('/onboarding')
  }

  // 4. Return success for client-side redirection
  return { success: true }
}

export async function signupAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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

  // 3. Signup Attempt
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // 4. Success - Client handles redirect/message
  // We return a simple success flag so the client can show a toast/message
  return { success: true }
}

export async function loginWithGoogleAction(_formData: FormData) {
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

  // 2. Init OAuth
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
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
  const avatar_color = formData.get('avatar_color') as string
  
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
    avatar_color,
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
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/settings?reset=true`,
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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
    }
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

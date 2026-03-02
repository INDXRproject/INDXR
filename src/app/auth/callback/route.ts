import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { isDisposableEmail } from '@/utils/disposable-email'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Security Check: Disposable Email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const isDisposable = await isDisposableEmail(user.email)
        if (isDisposable) {
          // Block access
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=Disposable emails are not allowed via OAuth`)
        }
      }

      // Check Onboarding Status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single()
      
      if (!profile || !profile.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      
      // If onboarding complete, go to dashboard
      return NextResponse.redirect(`${origin}/dashboard/transcribe`)
    }
  }

  // Fallback (e.g. no code)
  return NextResponse.redirect(`${origin}/dashboard/transcribe`)
}

import { createClient } from '@indxr/shared/utils/supabase/server'
import { NextResponse } from 'next/server'
import { isDisposableEmail } from '@indxr/shared/utils/disposable-email'

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Security Check: Disposable Email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const isDisposable = await isDisposableEmail(user.email)
        if (isDisposable) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${MARKETING_URL}/login?error=Disposable emails are not allowed via OAuth`)
        }
      }

      // Check Onboarding Status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single()

      if (!profile || !profile.onboarding_completed) {
        return NextResponse.redirect(`${MARKETING_URL}/onboarding`)
      }

      return NextResponse.redirect(`${APP_URL}/dashboard/transcribe`)
    }
  }

  // Fallback (e.g. no code)
  return NextResponse.redirect(`${APP_URL}/dashboard/transcribe`)
}

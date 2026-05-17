import { type NextRequest } from 'next/server'
import { updateSession } from '@indxr/shared/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response } = await updateSession(request)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

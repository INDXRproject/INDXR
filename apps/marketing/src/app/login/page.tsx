"use client"

import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { PasswordInput } from "@indxr/shared/components/ui/PasswordInput"
import { Label } from "@indxr/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { loginAction } from "@indxr/shared/actions/auth-actions"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { GoogleSignInButton } from "@indxr/shared/components/auth/GoogleSignInButton"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextParam = searchParams?.get('next')
  // Info message passed from signup ("check your email…") or password reset ("password updated…").
  const message = searchParams?.get('message')

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'

  function resolvePostLoginTarget(): string {
    if (nextParam) {
      try {
        const url = new URL(nextParam)
        const isLocalhost = url.hostname === 'localhost' || url.hostname.startsWith('app.localhost')
        if (url.hostname === 'app.indxr.ai' || isLocalhost) {
          return nextParam
        }
      } catch { /* invalid URL — fall through */ }
    }
    // On localhost (single-host dev), stay on same origin
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return '/dashboard'
    }
    return `${APP_URL}/dashboard`
  }
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      // Always pass resolved target — server action redirects directly,
      // avoiding the RSC stream abort caused by concurrent window.location.href.
      formData.append('redirectTo', resolvePostLoginTarget())

      // Call Server Action — redirects on success, returns { error } on failure.
      const result = await loginAction(null, formData)

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      }
    } catch (err) {
      // NEXT_REDIRECT is thrown by redirect() in the Server Action to stop server execution.
      // The 303 redirect is already handled by Next.js before this catch runs — swallow silently.
      if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) return
      console.error(err)
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell relative flex items-center justify-center min-h-screen bg-bg px-4 overflow-hidden">
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />
      <Card className="relative w-full max-w-sm border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 rounded-lg border border-success/20 bg-success-subtle p-3 text-sm font-medium text-success">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="ml-auto inline-block text-sm underline text-fg-muted hover:text-fg">
                  Forgot your password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div className="text-error text-sm font-medium bg-error-subtle border border-error/20 rounded-lg p-3">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Log In"}
            </Button>
          </form>
            
            {/* OAuth Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-fg-muted">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <GoogleSignInButton next={nextParam} />

        </CardContent>
        <CardFooter>
          <div className="mt-4 text-center text-sm text-fg-muted w-full">
            Don&apos;t have an account?{" "}
            <Link
              href={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : "/signup"}
              className="underline text-fg hover:text-accent"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

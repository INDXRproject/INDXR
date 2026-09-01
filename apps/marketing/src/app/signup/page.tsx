"use client"

import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { PasswordInput } from "@indxr/shared/components/ui/PasswordInput"
import { Label } from "@indxr/shared/components/ui/label"
import { Card, CardContent } from "@indxr/shared/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { validatePassword } from "@indxr/shared/utils/validation"
import { useRouter, useSearchParams } from "next/navigation"
import { signupAction } from "@indxr/shared/actions/auth-actions"
import { Alert, AlertDescription } from "@indxr/shared/components/ui/alert"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { GoogleSignInButton } from "@indxr/shared/components/auth/GoogleSignInButton"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams?.get('next')

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Compute validation directly from password state
  // const passwordValidation = validatePassword(password).requirements

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // const validation = validatePassword(password)
    
    // if (!validation.isValid) {
    //   return
    // }

    setIsSubmitting(true)
    setError(null)

    // Two password fields must match — catches a typo before we create the account (a mistyped
    // password would otherwise only surface later, at login).
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter them.")
      setIsSubmitting(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      // Thread het checkout-doel mee → belandt in de e-mailverificatie-link
      // (emailRedirectTo → /auth/callback?next=…) zodat de user na verificatie +
      // onboarding op billing landt i.p.v. /dashboard.
      if (nextParam) formData.append('redirectTo', nextParam)

      // Call Server Action
      const result = await signupAction(null, formData)

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else {
        const q = new URLSearchParams({ message: 'Check your email to verify your account, then log in here.' })
        if (nextParam) q.set('next', nextParam)
        router.push(`/login?${q.toString()}`)
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell relative min-h-screen flex items-center justify-center px-4 py-12 bg-bg overflow-hidden">
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />
      <Card className="relative w-full max-w-md p-8 border shadow-sm">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-4 hover:opacity-80 transition-opacity">
            <img src="/logo/indxr-horizontal-black-transparent.png" alt="INDXR.AI" className="dark:hidden h-8 w-auto" style={{ height: '32px', width: 'auto', minWidth: '100px' }} />
            <img src="/logo/indxr-horizontal-white-transparent.png" alt="INDXR.AI" className="hidden dark:block h-8 w-auto" style={{ height: '32px', width: 'auto', minWidth: '100px' }} />
          </Link>
          <h1 className="text-2xl font-semibold mb-2 text-fg">Create your account</h1>
          <p className="text-fg-muted">
            Start extracting transcripts in seconds
          </p>
        </div>
        
        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <GoogleSignInButton next={nextParam} />
        </div>
        
        {/* Divider */}
        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-bg text-fg-muted">
                Or continue with email
            </span>
            </div>
        </div>
        
        {/* Signup form */}
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
                id="email"
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-bg"
                required
            />
            </div>
            
            <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
                id="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-bg"
                required
                minLength={8}
            />
            <p className="text-xs text-fg-muted">
                Must be at least 8 characters
            </p>
            </div>

            <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
                id="confirmPassword"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 bg-bg"
                required
                minLength={8}
            />
            </div>
            
            {error && (
            <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            )}
            
            <Button 
            type="submit" 
            className="w-full h-11 text-base"
            disabled={isSubmitting}
            >
            {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
            
            <p className="text-xs text-center text-fg-muted mt-4">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-accent hover:underline">
                Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
            </Link>
            </p>
        </form>
        
        {/* Log in link */}
        <p className="text-center text-sm text-fg-muted mt-6">
            Already have an account?{" "}
            <Link href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"} className="text-accent hover:text-accent/90 font-medium hover:underline transition-all">
            Log in
            </Link>
        </p>
      </Card>
    </div>
  )
}

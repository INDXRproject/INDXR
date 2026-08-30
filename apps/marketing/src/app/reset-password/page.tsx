"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@indxr/shared/components/ui/button"
import { PasswordInput } from "@indxr/shared/components/ui/PasswordInput"
import { Label } from "@indxr/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { HexagonPattern } from "@indxr/shared/components/icons/HexagonPattern"
import { createClient } from "@indxr/shared/utils/supabase/client"

// Set-new-password page. The recovery link goes through /auth/callback?recovery=1, which exchanges the
// PKCE code and establishes a recovery session, then redirects here. So on arrival the user is already
// authenticated with that short-lived session and can call updateUser({ password }).
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking")

  // Guard: without a (recovery) session the link is invalid or expired — say so instead of failing
  // with a cryptic "Auth session missing" on submit.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ready" : "invalid")
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter them.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        setIsSubmitting(false)
        return
      }
      // Password set — end the recovery session and send them to log in fresh with the new password.
      await supabase.auth.signOut()
      router.push(`/login?message=${encodeURIComponent("Your password has been updated. Please log in.")}`)
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-bg px-4 overflow-hidden">
      <HexagonPattern className="opacity-[0.03] dark:opacity-[0.045]" />
      <Card className="relative w-full max-w-sm border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>
            {status === "invalid"
              ? "This reset link is invalid or has expired."
              : "Choose a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "invalid" ? (
            <div className="grid gap-4">
              <p className="text-sm text-fg-muted">
                Request a fresh reset link and try again.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">Request a new link</Button>
              </Link>
              <p className="text-center text-sm text-fg-muted">
                <Link href="/login" className="underline text-fg hover:text-accent">Back to login</Link>
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">New password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={status !== "ready"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={status !== "ready"}
                  />
                </div>
                {error && (
                  <div className="text-error text-sm font-medium bg-error-subtle border border-error/20 rounded-lg p-3">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting || status !== "ready"}>
                  {isSubmitting ? "Updating…" : "Update password"}
                </Button>
              </form>
              <p className="text-center text-sm text-fg-muted mt-4">
                <Link href="/login" className="underline text-fg hover:text-accent">Back to login</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

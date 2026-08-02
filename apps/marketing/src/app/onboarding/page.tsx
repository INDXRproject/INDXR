'use client'

import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { Label } from "@indxr/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@indxr/shared/components/ui/select"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@indxr/shared/hooks/useAuth"
import { updateProfileAction } from "@indxr/shared/actions/auth-actions"
import { appHref } from "@indxr/shared/lib/cross-host-links"
import { safeAppRedirect } from "@indxr/shared/lib/safe-redirect"
import { trackSignup } from "@indxr/shared/lib/gtag"
import { CheckCircle2, Circle } from "lucide-react"

export default function OnboardingPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [role, setRole] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill username from email
  useEffect(() => {
    if (user?.email && !username) {
      const prefix = user.email.split('@')[0]
      setUsername(prefix)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // Only needed when user loads

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('role', role)

      const result = await updateProfileAction(formData)

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else {
        // Honoreer het door de auth-flow gethread checkout-doel (bv. billing?checkout=plus);
        // ongeldig/ontbrekend → gewone dashboard-landing. Open-redirect-guard via safeAppRedirect.
        const target = safeAppRedirect(searchParams.get('next')) ?? appHref('/dashboard')
        // Google Ads signup-conversie (geen waarde). Vuurt alleen bij consent; de redirect
        // gebeurt in de callback (met timeout-fallback) zodat 'ie nooit wordt afgekapt.
        trackSignup(() => { window.location.href = target })
      }
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] px-4">
       <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

          {/* Left side: Welcome message */}
          <div className="space-y-6 hidden md:block">
            <div>
              <h1 className="text-4xl font-semibold text-[var(--fg)] mb-3">Welcome to INDXR</h1>
              {/* KHIDR: first-run wizard content komt hier */}
              <p className="text-[var(--fg-subtle)] text-lg leading-relaxed">
                Your account is ready. We&apos;ve added 25 welcome credits to get you started.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-[var(--success)] mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-[var(--fg)]">Account created</h3>
                  <p className="text-sm text-[var(--fg-muted)]">You&apos;re signed in and your 25 welcome credits are in your account.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mt-0.5 text-xs font-bold text-[var(--accent)] shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-[var(--fg)]">Complete your profile</h3>
                  <p className="text-sm text-[var(--fg-muted)]">A quick setup so we know how to help you best.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Circle className="h-6 w-6 text-[var(--fg-muted)] mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-[var(--fg-muted)]">Transcribe your first video</h3>
                  <p className="text-sm text-[var(--fg-muted)]">Paste any YouTube URL — caption extraction is always free.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Form */}
          <Card className="border border-[var(--border)] shadow-sm bg-[var(--surface)]">
            <CardHeader>
              <CardTitle className="text-[var(--fg)]">Welcome to INDXR</CardTitle>
              <CardDescription className="text-[var(--fg-muted)]">
                25 welcome credits are in your account — let&apos;s set up your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. creative_genius"
                  />
                  <p className="text-xs text-fg-muted">
                    3-20 chars, letters, numbers, underscores, or hyphens only.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Main Usage</Label>
                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="personal_projects">Personal Projects</SelectItem>
                      <SelectItem value="academic_researcher">Academic/Researcher</SelectItem>
                      <SelectItem value="content_creator">Content Creator</SelectItem>
                      <SelectItem value="marketing_business">Marketing/Business Professional</SelectItem>
                      <SelectItem value="developer_technical">Developer/Technical</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="text-error text-sm font-medium bg-error/10 border border-error/20 rounded-lg p-3">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Get Started →"}
                </Button>
              </form>
            </CardContent>
          </Card>
       </div>
    </div>
  )
}

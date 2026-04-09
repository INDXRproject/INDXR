'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { updateProfileAction } from "@/app/auth/actions"
import { toast } from "sonner"
import { CheckCircle2, Circle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [role, setRole] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('role', role)

      const result = await updateProfileAction(formData)

      if (result?.error) {
        toast.error(result.error)
        setIsSubmitting(false)
      } else {
        toast.success("Profile updated! Let's get started.")
        router.push('/dashboard/transcribe')
      }
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
       <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

          {/* Left Side: Checklist */}
          <div className="space-y-6 hidden md:block">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome to Indxr.AI</h1>
              <p className="text-muted-foreground text-lg">You&apos;re just a few steps away from unlocking video insights.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-success mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Create Account</h3>
                  <p className="text-muted-foreground text-sm">Secure your spot and verify your identity.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                 <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center mt-0.5 text-xs font-bold bg-primary/20 text-primary">
                   2
                 </div>
                <div>
                  <h3 className="font-semibold text-lg">Complete Profile</h3>
                  <p className="text-muted-foreground text-sm">Tell us a bit about yourself to personalize your experience.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Circle className="h-6 w-6 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg text-muted-foreground">First Extraction</h3>
                  <p className="text-muted-foreground text-sm">Transcribe your first YouTube video into structured data.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                Set up your workspace identity
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
                  <p className="text-xs text-muted-foreground">
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

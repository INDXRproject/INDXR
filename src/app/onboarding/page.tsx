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
    <div className="flex items-center justify-center min-h-screen bg-[#020617] relative overflow-hidden px-4">
       {/* Decorative background elements */}
       <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
       
       <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center relative z-10">
          
          {/* Left Side: Checklist */}
          <div className="space-y-6 text-white hidden md:block">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome to Indxr.AI</h1>
              <p className="text-zinc-400 text-lg">You&apos;re just a few steps away from unlocking video insights.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Create Account</h3>
                  <p className="text-zinc-400 text-sm">Secure your spot and verify your identity.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                 <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center mt-0.5 text-xs font-bold bg-primary/20 text-primary animate-pulse">
                   2
                 </div>
                <div>
                  <h3 className="font-semibold text-lg text-white">Complete Profile</h3>
                  <p className="text-zinc-300 text-sm">Tell us a bit about yourself to personalize your experience.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Circle className="h-6 w-6 text-zinc-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg text-zinc-500">First Extraction</h3>
                  <p className="text-zinc-600 text-sm">Transcribe your first YouTube video into structured data.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <Card className="bg-zinc-950/50 border-zinc-800/50 text-white backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription className="text-zinc-400">
                Set up your workspace identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-zinc-300">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-purple-500/20"
                    placeholder="e.g. creative_genius"
                  />
                  <p className="text-xs text-zinc-500">
                    3-20 chars, letters, numbers, underscores, or hyphens only.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-zinc-300">Main Usage</Label>
                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
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

                <Button type="submit" className="w-full mt-2 bg-white text-black hover:bg-zinc-200 font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Get Started →"}
                </Button>
              </form>
            </CardContent>
          </Card>
       </div>
    </div>
  )
}

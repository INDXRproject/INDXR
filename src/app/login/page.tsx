"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Chrome, Apple } from "lucide-react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { loginAction, loginWithGoogleAction } from "@/app/auth/actions"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = searchParams?.get('redirect')
  
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
      if (redirectTo) {
        formData.append('redirectTo', redirectTo)
      }

      // Call Server Action
      const result = await loginAction(null, formData)

      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        setIsSubmitting(false)
      } else {
        toast.success("Logged in successfully!")
        
        // CRITICAL: Refresh router to update Server Components with new session
        router.refresh()
        
        // Then navigate
        const target = redirectTo || '/dashboard/transcribe'
        router.push(target)
      }
    } catch (err) {
      // Check if it's a redirect error (NEXT_REDIRECT) - although we removed redirect from action,
      // good practice to keep it safe.
      if ((err as Error).message === 'NEXT_REDIRECT' || (err as any)?.digest?.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      console.error(err)
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-sm border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <Link href="/forgot-password" className="ml-auto inline-block text-sm underline text-muted-foreground hover:text-foreground">
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
              <div className="text-red-500 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3">
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
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <form action={loginWithGoogleAction}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                >
                  <Chrome className="mr-2 h-4 w-4" /> Google
                </Button>
              </form>
              <Button
                type="button"
                variant="outline"
                className="opacity-50 cursor-not-allowed"
                disabled
              >
                <Apple className="mr-2 h-4 w-4" /> Apple
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              OAuth providers coming soon
            </p>

        </CardContent>
        <CardFooter>
          <div className="mt-4 text-center text-sm text-muted-foreground w-full">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-foreground hover:text-primary">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

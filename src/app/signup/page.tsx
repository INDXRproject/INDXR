"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Logo } from "@/components/ui/logo" // Assuming this exists from Sprint 1
import { useState } from "react"
import { validatePassword } from "@/utils/validation"
import { useRouter } from "next/navigation"
import { signupAction, loginWithGoogleAction } from "@/app/auth/actions"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignupPage() {
  const router = useRouter()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      // Call Server Action
      const result = await signupAction(null, formData)

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
        toast.error(result.error)
      } else {
        // Success
        toast.success("Account created successfully! Please check your email to verify your account.")
        // Optionally redirect or show next steps
        router.push('/login?message=Check your email to verify your account')
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md p-8 border-border/50 bg-card/50 backdrop-blur-sm">
        
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <Logo className="size-10" />
            <span className="text-2xl font-semibold tracking-tight">INDXR.AI</span>
          </Link>
          <h1 className="text-2xl font-semibold mb-2 text-foreground">Create your account</h1>
          <p className="text-muted-foreground">
            Start extracting transcripts in seconds
          </p>
        </div>
        
        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <form action={loginWithGoogleAction}>
            <Button 
                variant="outline" 
                className="w-full h-11 gap-3 font-medium"
                type="submit"
            >
                <svg className="size-5" viewBox="0 0 24 24">
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                />
                </svg>
                Continue with Google
            </Button>
          </form>
        </div>
        
        {/* Divider */}
        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-muted-foreground">
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
                className="h-11 bg-background"
                required
            />
            </div>
            
            <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-background"
                required
                minLength={8}
            />
            <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
            </p>
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
            
            <p className="text-xs text-center text-muted-foreground mt-4">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
            </Link>
            </p>
        </form>
        
        {/* Log in link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/90 font-medium hover:underline transition-all">
            Log in
            </Link>
        </p>
      </Card>
    </div>
  )
}

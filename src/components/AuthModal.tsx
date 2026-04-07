"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { Label } from "@/components/ui/label"
import { Loader2, Chrome, Apple, Check, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { validatePassword } from "@/utils/validation"
import { useRouter } from "next/navigation"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const passwordValidation = validatePassword(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    // Validate password for signup
    if (mode === "signup" && !passwordValidation.isValid) {
      toast.error("Please meet all password requirements")
      return
    }

    setLoading(true)
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        toast.success("Account created successfully!")
        onSuccess()
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        toast.success("Logged in successfully!")
        onSuccess()
        router.refresh()
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${mode === "signup" ? "sign up" : "log in"}`
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login")
    setPassword("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-[var(--bg-surface)] border-[var(--border)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[var(--text-primary)]">
            {mode === "login" ? "Log In" : "Sign Up"}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            {mode === "login" 
              ? "Enter your credentials to access your account"
              : "Create an account to start extracting transcripts"
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="modal-email" className="text-[var(--text-secondary)]">
              Email Address
            </Label>
            <Input
              id="modal-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="modal-password" className="text-[var(--text-secondary)]">
              Password
            </Label>
            <PasswordInput
              id="modal-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
              required
            />
            
            {/* Password Requirements (Signup only) */}
            {mode === "signup" && password && (
              <div className="space-y-1 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidation.requirements.minLength ? (
                    <Check className="h-3 w-3 text-[var(--color-success)]" />
                  ) : (
                    <X className="h-3 w-3 text-[var(--text-muted)]" />
                  )}
                  <span className={passwordValidation.requirements.minLength ? "text-[var(--color-success)]" : "text-[var(--text-muted)]"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidation.requirements.hasUppercase ? (
                    <Check className="h-3 w-3 text-[var(--color-success)]" />
                  ) : (
                    <X className="h-3 w-3 text-[var(--text-muted)]" />
                  )}
                  <span className={passwordValidation.requirements.hasUppercase ? "text-[var(--color-success)]" : "text-[var(--text-muted)]"}>
                    At least 1 uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidation.requirements.hasNumber ? (
                    <Check className="h-3 w-3 text-[var(--color-success)]" />
                  ) : (
                    <X className="h-3 w-3 text-[var(--text-muted)]" />
                  )}
                  <span className={passwordValidation.requirements.hasNumber ? "text-[var(--color-success)]" : "text-[var(--text-muted)]"}>
                    At least 1 number
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-11" 
            disabled={loading || (mode === "signup" && !passwordValidation.isValid)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {loading ? (mode === "signup" ? "Creating account..." : "Logging in...") : (mode === "signup" ? "Sign Up" : "Log In")}
          </Button>

          {/* OAuth Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-surface)] px-2 text-[var(--text-muted)]">Or continue with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              type="button"
              variant="outline" 
              className="bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed" 
              disabled
            >
              <Chrome className="mr-2 h-4 w-4" /> Google
            </Button>
            <Button 
              type="button"
              variant="outline" 
              className="bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed" 
              disabled
            >
              <Apple className="mr-2 h-4 w-4" /> Apple
            </Button>
          </div>

          <p className="text-xs text-center text-[var(--text-muted)]">
            OAuth providers coming soon
          </p>

          {/* Mode Toggle */}
          <div className="text-center text-sm text-[var(--text-secondary)] pt-2">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="underline text-[var(--text-primary)] hover:text-[var(--text-secondary)]"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="underline text-[var(--text-primary)] hover:text-[var(--text-secondary)]"
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

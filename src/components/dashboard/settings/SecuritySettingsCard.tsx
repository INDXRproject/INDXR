"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { validatePassword } from "@/utils/validation"

export function SecuritySettingsCard() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match")
        return
    }

    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
        toast.error("Password does not meet requirements")
        return
    }

    setIsSubmitting(true)
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Password updated successfully")
            setNewPassword("")
            setConfirmPassword("")
        }
    } catch (e) {
        toast.error("Failed to update password")
    } finally {
        setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-[var(--surface)] border-[var(--border)]">
      <CardHeader>
        <CardTitle className="text-[var(--fg)]">Security</CardTitle>
        <CardDescription className="text-[var(--fg-subtle)]">Update your password to keep your account secure</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid gap-2">
                <Label className="text-[var(--fg)]">New Password</Label>
                <PasswordInput 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="!bg-[var(--surface-elevated)] !border-[var(--border)] !text-[var(--fg)] placeholder:text-[var(--fg-muted)]"
                    placeholder="•••••••"
                />
            </div>
            <div className="grid gap-2">
                <Label className="text-[var(--fg)]">Confirm New Password</Label>
                <PasswordInput 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="!bg-[var(--surface-elevated)] !border-[var(--border)] !text-[var(--fg)] placeholder:text-[var(--fg-muted)]"
                    placeholder="•••••••"
                />
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting || !newPassword} 
              className="w-full bg-[var(--accent)] text-fg hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-150 ease-out font-semibold"
            >
                {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
        </form>
      </CardContent>
    </Card>
  )
}

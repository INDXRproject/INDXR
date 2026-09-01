"use client"

import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { PasswordInput } from "@indxr/shared/components/ui/PasswordInput"
import { Label } from "@indxr/shared/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { useState } from "react"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { validatePassword } from "@indxr/shared/utils/validation"
import { mapPasswordError } from "@indxr/shared/lib/passwordErrors"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"

export function SecuritySettingsCard() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordFeedback(null)

    if (newPassword !== confirmPassword) {
        setPasswordFeedback({ type: 'error', message: 'Passwords do not match' })
        return
    }

    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
        setPasswordFeedback({ type: 'error', message: 'Password does not meet requirements' })
        return
    }

    setIsSubmitting(true)
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) {
            // Readable inline copy — same GoTrue rejection (incl. HIBP leaked-password) as signup/reset.
            setPasswordFeedback({ type: 'error', message: mapPasswordError(error) })
        } else {
            setPasswordFeedback({ type: 'success', message: 'Password updated successfully' })
            setNewPassword("")
            setConfirmPassword("")
        }
    } catch {
        setPasswordFeedback({ type: 'error', message: 'Failed to update password' })
    } finally {
        setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-fg">Security</CardTitle>
        <CardDescription className="text-fg-subtle">Update your password to keep your account secure</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid gap-2">
                <Label className="text-fg">New Password</Label>
                <PasswordInput 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="!bg-surface-elevated !border-border !text-fg placeholder:text-fg-muted"
                    placeholder="•••••••"
                />
            </div>
            <div className="grid gap-2">
                <Label className="text-fg">Confirm New Password</Label>
                <PasswordInput 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="!bg-surface-elevated !border-border !text-fg placeholder:text-fg-muted"
                    placeholder="•••••••"
                />
            </div>
            {passwordFeedback && (
                <FeedbackCard
                    variant={passwordFeedback.type}
                    message={passwordFeedback.message}
                    onDismiss={() => setPasswordFeedback(null)}
                />
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !newPassword}
              className="w-full bg-accent text-fg hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 ease-out font-semibold"
            >
                {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"
import { Input } from "@indxr/shared/components/ui/input"
import { Label } from "@indxr/shared/components/ui/label"
import { FeedbackCard } from "@indxr/shared/components/ui/FeedbackCard"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@indxr/shared/components/ui/alert-dialog"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)
    try {
      // Geen body — de route verwijdert uitsluitend de sessie-user (id uit de sessie, niet hier).
      const res = await fetch("/api/account/delete", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to delete account. Please try again.")
        setIsDeleting(false)
        setOpen(false)
        return
      }
      // Uitloggen en de app verlaten.
      await createClient().auth.signOut().catch(() => {})
      window.location.href = marketingHref("/login")
    } catch {
      setError("Failed to delete account. Please try again.")
      setIsDeleting(false)
      setOpen(false)
    }
  }

  return (
    <Card className="border-error/40 bg-error-subtle/20">
      <CardHeader>
        <CardTitle className="text-error">Delete account</CardTitle>
        <CardDescription className="text-fg-subtle">
          Permanently delete your account and everything in it — transcripts, credits, summaries, and
          history. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <FeedbackCard variant="error" message={error} onDismiss={() => setError(null)} />}
        <AlertDialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) setConfirmText("")
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete my account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and all associated data — transcripts, credits,
                summaries, and history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2 py-1">
              <Label htmlFor="confirm-delete" className="text-fg">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Deleting…" : "Delete account"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

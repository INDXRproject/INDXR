"use client"

import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SaveErrorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorMessage: string
  onRetry: () => void
}

export function SaveErrorModal({
  open,
  onOpenChange,
  errorMessage,
  onRetry
}: SaveErrorModalProps) {
  const handleRetry = () => {
    onOpenChange(false)
    onRetry()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-error/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-error-subtle rounded-lg">
              <AlertCircle className="h-6 w-6 text-error" />
            </div>
            <DialogTitle className="text-fg text-lg">Failed to Save Transcript</DialogTitle>
          </div>
          <DialogDescription className="text-fg-muted">
            Your transcript was generated successfully, but we couldn&apos;t save it to your library.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-error-subtle border border-error/20">
            <p className="text-sm text-error-fg font-mono wrap-break-word">
              {errorMessage}
            </p>
          </div>

          <p className="text-xs text-fg-muted mt-4">
            Don&apos;t worry - your transcript is still available on this page.
            Click retry to save it to your library without re-transcribing.
          </p>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            onClick={handleRetry}
            variant="destructive"
            className="flex-1"
          >
            Retry Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

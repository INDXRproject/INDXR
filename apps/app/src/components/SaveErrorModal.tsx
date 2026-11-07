"use client"

import { AlertCircle, X } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"
import { NOTICE_CODE, NOTICE_ICON } from "@indxr/shared/lib/notice"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@indxr/shared/components/ui/dialog"

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border-strong bg-bg">
              <AlertCircle className={`h-5 w-5 ${NOTICE_ICON.error}`} />
            </div>
            <DialogTitle className="text-fg-strong text-lg font-bold">Failed to Save Transcript</DialogTitle>
          </div>
          <DialogDescription className="text-fg">
            Your transcript was generated successfully, but we couldn&apos;t save it to your library.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="wrap-break-word">
            <span className={`${NOTICE_CODE} normal-case`}>{errorMessage}</span>
          </p>

          <p className="text-sm text-fg mt-4">
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

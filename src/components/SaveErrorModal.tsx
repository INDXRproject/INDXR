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
      <DialogContent className="sm:max-w-md bg-zinc-950 border-red-900/50">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-white text-lg">Failed to Save Transcript</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            Your transcript was generated successfully, but we couldn&apos;t save it to your library.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300 font-mono wrap-break-word">
              {errorMessage}
            </p>
          </div>
          
          <p className="text-xs text-zinc-500 mt-4">
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
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Retry Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

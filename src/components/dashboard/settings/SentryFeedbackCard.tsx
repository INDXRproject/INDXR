"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Props {
  userId: string
  email: string | undefined
}

export function SentryFeedbackCard({ userId, email }: Props) {
  useEffect(() => {
    Sentry.setUser({ id: userId, email })
  }, [userId, email])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a Problem</CardTitle>
        <CardDescription>
          Encountered a bug or unexpected behavior? Let us know.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={async () => {
            const feedback = Sentry.getFeedback()
            if (!feedback) return
            const form = await feedback.createForm()
            form.appendToDom()
            form.open()
          }}
        >
          Report a problem
        </Button>
      </CardContent>
    </Card>
  )
}

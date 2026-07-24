"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"

interface Props {
  userId: string
  email: string | undefined
}

// "Report a problem" now routes to the Support tab of Messages (a real support ticket with a
// reply thread), rather than opening a fire-and-forget Sentry feedback dialog. Sentry.setUser is
// kept so any errors this session are attributed to the user.
export function SentryFeedbackCard({ userId, email }: Props) {
  useEffect(() => {
    Sentry.setUser({ id: userId, email })
  }, [userId, email])

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-lg text-fg">Report a problem</CardTitle>
        <CardDescription className="text-fg-muted">
          Found a bug or something not working? Send it to support and we&apos;ll take a look.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/dashboard/messages?tab=support">Report a problem</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight } from "lucide-react"
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import posthog from 'posthog-js'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { refreshCredits } = useAuth()
  
  useEffect(() => {
    if (sessionId) {
      // Track purchase event (Client-side)
      posthog.capture('credits_purchased', {
          source: 'stripe_checkout_success',
          session_id: sessionId
      })

      // Optimistically refresh credits
      // In a real app, we might poll an endpoint to confirm the webhook processed
      // For now, we utilize the useAuth hook which fetches fresh data
      const timeout = setTimeout(() => {
          refreshCredits()
      }, 2000) // Give webhook a moment
      return () => clearTimeout(timeout)
    }
  }, [sessionId, refreshCredits])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md bg-surface border-border text-center">
        <CardHeader>
          <div className="mx-auto bg-success-subtle p-4 rounded-full mb-4">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <CardTitle className="text-2xl text-fg">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            Thank you for your purchase. Your credits have been added to your account.
          <div className="bg-bg p-4 rounded-lg border border-border">
            <p className="text-sm text-fg-muted mb-1">Transaction Reference</p>
            <p className="font-mono text-xs text-fg break-all">{sessionId || 'Processing...'}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
                <Button className="w-full h-12 bg-accent hover:bg-accent/90">
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
            <Link href="/dashboard/library">
                <Button variant="outline" className="w-full h-12">
                    View Library
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

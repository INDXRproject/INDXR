'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import Link from 'next/link'
import { useAuth } from '@indxr/shared/hooks/useAuth'
import { createClient } from '@indxr/shared/utils/supabase/client'
import { eurForCredits } from '@indxr/shared/lib/pricing'
import { trackPurchase } from '@indxr/shared/lib/gtag'
import posthog from 'posthog-js'

// Poll onze eigen credit_transactions (RLS: eigen rijen) op de aankoop-rij die de
// Stripe-webhook wegschrijft. Dat bevestigt dat de webhook verwerkte én levert het
// exacte bijgeschreven credit-aantal — geen verzonnen bedragen.
const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 10

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { credits, refreshCredits } = useAuth()

  const [status, setStatus] = useState<'processing' | 'confirmed' | 'pending'>('processing')
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null)

  const findPurchase = useCallback(async () => {
    if (!sessionId) return null
    const supabase = createClient()
    const { data } = await supabase
      .from('credit_transactions')
      .select('amount')
      .eq('type', 'credit')
      .filter('metadata->>stripe_session_id', 'eq', sessionId)
      .limit(1)
      .maybeSingle()
    return (data?.amount as number | undefined) ?? null
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setStatus('pending')
      return
    }

    posthog.capture('credits_purchased', {
      source: 'stripe_checkout_success',
      session_id: sessionId,
    })

    let cancelled = false
    let attempts = 0

    const poll = async () => {
      attempts += 1
      const amount = await findPurchase()
      if (cancelled) return

      if (amount != null) {
        setCreditsAdded(amount)
        setStatus('confirmed')
        refreshCredits() // haal het gezaghebbende nieuwe saldo op
        // Google Ads purchase-conversie — één keer per Stripe-sessie (guard tegen
        // dubbeltellen bij refresh; transaction_id dedupt bovendien Google-side).
        // Value = BRUTO EUR-lijstprijs uit pricing.ts (ADR-087). Vuurt alleen als de
        // tag geladen is (= consent gegeven); anders no-op.
        if (sessionId) {
          const guardKey = `gads_purchase_${sessionId}`
          if (!localStorage.getItem(guardKey)) {
            trackPurchase({ valueEur: eurForCredits(amount), transactionId: sessionId })
            localStorage.setItem(guardKey, '1')
          }
        }
        return
      }
      if (attempts >= MAX_ATTEMPTS) {
        setStatus('pending') // webhook nog niet verwerkt — geen bedragen verzinnen
        refreshCredits()
        return
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => { cancelled = true }
  }, [sessionId, findPurchase, refreshCredits])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md bg-surface border-border text-center">
        <CardHeader>
          {status === 'processing' ? (
            <>
              <div className="mx-auto bg-surface-elevated p-4 rounded-full mb-4">
                <Loader2 className="h-12 w-12 text-fg-muted animate-spin" />
              </div>
              <CardTitle className="text-2xl text-fg">Confirming your payment…</CardTitle>
            </>
          ) : (
            <>
              <div className="mx-auto bg-success-subtle p-4 rounded-full mb-4">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-2xl text-fg">Payment successful</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'confirmed' && creditsAdded != null ? (
            <div className="bg-bg p-5 rounded-lg border border-border space-y-1">
              <p className="text-fg">
                <span className="font-semibold">{creditsAdded.toLocaleString()}</span> credits added.
              </p>
              {credits != null && (
                <p className="text-sm text-fg-muted">
                  New balance: <span className="font-semibold text-fg">{credits.toLocaleString()}</span> credits
                </p>
              )}
            </div>
          ) : status === 'pending' ? (
            <p className="text-sm text-fg-muted">
              Your payment was received. Your credits will appear in your account within a
              minute — refresh your dashboard if they aren&apos;t visible yet.
            </p>
          ) : (
            <p className="text-sm text-fg-muted">
              Please wait while we confirm your payment.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Link href="/dashboard/library">
              <Button className="w-full h-12 bg-accent hover:bg-accent/90">
                Go to Library <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full h-12">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

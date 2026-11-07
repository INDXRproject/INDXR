'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { Button } from "@indxr/shared/components/ui/button"
import { XCircle } from "lucide-react"
import Link from 'next/link'
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import { EMPTY_ICON, NOTICE_BAR } from "@indxr/shared/lib/notice"

export default function BillingCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className={`w-full max-w-md rounded-none border-2 border-border-strong bg-bg text-center shadow-none ${NOTICE_BAR.warning}`}>
        <CardHeader>
          <div className={EMPTY_ICON}>
            <XCircle className="h-7 w-7 text-warning-fg" />
          </div>
          <CardTitle className="text-2xl font-bold text-fg-strong">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-fg">
            No worries! No charges were made to your card. You can try again whenever you're ready.
          </p>
          <div className="flex flex-col gap-3">
            <a href={marketingHref('/pricing')}>
                <Button className="w-full h-12">
                    Return to Pricing
                </Button>
            </a>
            <Link href="/dashboard">
                <Button variant="outline" className="w-full h-12">
                    Back to Dashboard
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

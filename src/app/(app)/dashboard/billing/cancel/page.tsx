'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from 'next/link'

export default function BillingCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md bg-surface border-border text-center">
        <CardHeader>
          <div className="mx-auto bg-error-subtle p-4 rounded-full mb-4">
            <XCircle className="h-12 w-12 text-error" />
          </div>
          <CardTitle className="text-2xl text-fg">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-fg-muted">
            No worries! No charges were made to your card. You can try again whenever you're ready.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/pricing">
                <Button className="w-full h-12">
                    Return to Pricing
                </Button>
            </Link>
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

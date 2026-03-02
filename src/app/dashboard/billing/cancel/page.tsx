'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from 'next/link'

export default function BillingCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md bg-card border-border text-center">
        <CardHeader>
          <div className="mx-auto bg-red-500/10 p-4 rounded-full mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-foreground">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            No worries! No charges were made to your card. You can try again whenever you're ready.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/pricing">
                <Button className="w-full h-12 bg-zinc-100 text-zinc-900 hover:bg-white">
                    Return to Pricing
                </Button>
            </Link>
            <Link href="/dashboard">
                <Button variant="outline" className="w-full h-12 border-zinc-700 hover:bg-zinc-800">
                    Back to Dashboard
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

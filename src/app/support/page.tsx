import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Support - YouTube Transcript Generator | INDXR.AI",
  description: "Get help with YouTube transcript generation. Contact our support team for assistance with extracting, downloading, and exporting transcripts.",
  openGraph: {
    title: "Support - YouTube Transcript Generator | INDXR.AI",
    description: "Get help with YouTube transcript generation. Contact our support team.",
    type: "website",
  },
}

export default function SupportPage() {
  return (
    <>
    <div className="container max-w-4xl py-24 px-4 mx-auto">
      <h1 className="text-4xl font-bold text-fg mb-8">Support</h1>

      <div className="space-y-8">
        <div className="p-6 rounded-xl border bg-surface">
          <h2 className="text-xl font-semibold text-fg mb-2">How do I get started?</h2>
          <p className="text-fg-muted">Simply visit the Transcript Generator page, paste a YouTube URL, and click Extract.</p>
        </div>

        <div className="p-6 rounded-xl border bg-surface">
          <h2 className="text-xl font-semibold text-fg mb-2">Is it really free?</h2>
          <p className="text-fg-muted">Yes! Our basic extraction tool is completely free for individual videos using YouTube auto-captions.</p>
        </div>

        <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold text-fg mb-4">More questions?</h3>
            <p className="text-fg-muted mb-6">Check our comprehensive FAQ or contact support</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/faq">
                <Button size="lg" variant="outline">View FAQ</Button>
              </Link>
              <Button size="lg">Contact Support</Button>
            </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}

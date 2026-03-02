import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText, Zap, Shield } from "lucide-react"
import { FeatureCard } from "@/components/FeatureCard"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 sm:py-24 lg:py-32 bg-background flex justify-center border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none"></div>
        <div className="container px-4 text-center relative z-10 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground mb-6 max-w-4xl leading-[1.1]">
            YouTube Transcripts.<br className="hidden sm:inline" />
            Commercial Grade. Free First.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-[640px] mx-auto mb-10 leading-relaxed">
            Extract high-quality transcripts from any YouTube video in seconds. 
            No limits on length. Export to JSON, TXT, SRT.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/youtube-transcript-generator" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                Get Free Transcript <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto bg-transparent border-border hover:bg-muted hover:text-foreground transition-all">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-16 sm:py-24 bg-background flex justify-center">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard 
              icon={Zap}
              title="Lightning Fast"
              description="Instant extraction using our optimized engine. No waiting queues, get your content immediately."
            />
            <FeatureCard 
              icon={FileText}
              title="Multiple Formats"
              description="Export to TXT, CSV, JSON, SRT, and VTT with a single click. Compatible with all major editing tools."
            />
            <FeatureCard 
              icon={Shield}
              title="Secure & Private"
              description="Your data is safe. We don't store video content, only the text you need. Enterprise-grade security."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

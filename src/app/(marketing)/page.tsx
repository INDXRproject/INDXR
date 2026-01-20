import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText, Zap, Shield } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-24 md:py-32 lg:py-40 bg-zinc-950 flex justify-center border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950 to-zinc-950"></div>
        <div className="container px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-6">
            YouTube Transcripts.<br />
            Commercial Grade. Free First.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-[600px] mx-auto mb-10">
            Extract high-quality transcripts from any YouTube video in seconds. 
            No limits on length. Export to JSON, TXT, SRT.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/free">
              <Button size="lg" className="h-12 px-8 text-base">
                Get Free Transcript <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent border-white/10 hover:bg-white/5 hover:text-white">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-24 bg-black flex justify-center">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
              <div className="p-3 rounded-full bg-zinc-800 mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Lightning Fast</h3>
              <p className="text-zinc-400">Instant extraction using our optimized engine. No waiting queues.</p>
            </div>
             <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
              <div className="p-3 rounded-full bg-zinc-800 mb-4">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Multiple Formats</h3>
              <p className="text-zinc-400">Export to TXT, CSV, JSON, SRT, and VTT with a single click.</p>
            </div>
             <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
              <div className="p-3 rounded-full bg-zinc-800 mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Secure & Private</h3>
              <p className="text-zinc-400">Your data is safe. We don't store video content, only the text you need.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import { Button } from "@/components/ui/button"

export default function SupportPage() {
  return (
    <div className="container max-w-4xl py-24 px-4 mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8">Support & FAQ</h1>
      
      <div className="space-y-8">
        <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/50">
          <h2 className="text-xl font-semibold text-white mb-2">How do I get started?</h2>
          <p className="text-zinc-400">Simply visit the Free Tool page, paste a YouTube URL, and click Extract.</p>
        </div>
        
        <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/50">
          <h2 className="text-xl font-semibold text-white mb-2">Is it really free?</h2>
          <p className="text-zinc-400">Yes! Our basic extraction tool is completely free for individual videos.</p>
        </div>

        <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
            <Button size="lg">Contact Support</Button>
        </div>
      </div>
    </div>
  )
}

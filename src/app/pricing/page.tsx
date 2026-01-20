import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="container py-24 px-4 mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple Pricing</h1>
        <p className="text-xl text-zinc-400">Start for free, upgrade for power.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex flex-col">
          <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
          <div className="text-4xl font-bold text-white mb-6">$0<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center text-zinc-300">
              <Check className="h-5 w-5 mr-3 text-green-500" /> Full Auto-Captions
            </li>
            <li className="flex items-center text-zinc-300">
              <Check className="h-5 w-5 mr-3 text-green-500" /> Unlimited Export Formats
            </li>
            <li className="flex items-center text-zinc-300">
              <Check className="h-5 w-5 mr-3 text-green-500" /> Basic Search
            </li>
          </ul>
          <Button className="w-full" variant="outline">Current Plan</Button>
        </div>

        {/* Pro Tier */}
        <div className="p-8 rounded-2xl border border-white/10 bg-zinc-900/80 relative overflow-hidden flex flex-col">
           <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
            COMING SOON
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
          <div className="text-4xl font-bold text-white mb-6">Credits<span className="text-lg text-zinc-500 font-normal">/pay-as-you-go</span></div>
          <ul className="space-y-4 mb-8 flex-1">
             <li className="flex items-center text-zinc-300">
              <Check className="h-5 w-5 mr-3 text-green-500" /> Bulk Extraction
            </li>
             <li className="flex items-center text-zinc-300">
              <Check className="h-5 w-5 mr-3 text-green-500" /> Advanced Search
            </li>
             <li className="flex items-center text-zinc-300">
              <Check className="h-5 w-5 mr-3 text-green-500" /> API Access
            </li>
          </ul>
          <Button className="w-full" disabled>Join Waitlist</Button>
        </div>
      </div>
    </div>
  )
}

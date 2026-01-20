import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl tracking-tighter text-white">
            INDXR.AI
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="/free" className="hover:text-white transition-colors">Free Tool</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/signup">
               <Button size="sm" variant="secondary" className="h-8 px-4">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/10 bg-black py-8">
        <div className="container flex items-center justify-between px-4 text-sm text-zinc-500">
          <p>© 2024 INDXR.AI. All rights reserved.</p>
          <div className="flex gap-4">
             <Link href="#" className="hover:text-white">Privacy</Link>
             <Link href="#" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

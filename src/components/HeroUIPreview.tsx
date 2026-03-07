"use client"

import { ArrowRight, Copy, Download, Moon, Sun } from "lucide-react"
import { Button } from "./ui/button"

export function HeroUIPreview() {
  return (
    <div className="w-full max-w-[780px] mx-auto mt-16 sm:mt-24 hidden sm:block">
      <div 
        className="relative rounded-[14px] border border-border bg-card overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both"
        style={{
          perspective: "1200px",
          transform: "rotateX(2deg)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Window Chrome */}
        <div className="h-10 px-4 flex items-center justify-between border-b border-border bg-[#F5F3EF] dark:bg-[#0A0A0F]">
          <div className="flex gap-1.5">
            <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
          </div>
          <div className="text-[11px] font-semibold text-muted-foreground tracking-tight">INDXR.AI</div>
          <div className="px-2 py-0.5 rounded-full border border-border bg-background flex items-center gap-1.5">
            <Moon className="w-2.5 h-2.5 text-muted-foreground block dark:hidden" />
            <Sun className="w-2.5 h-2.5 text-muted-foreground hidden dark:block" />
            <span className="text-[10px] font-medium text-muted-foreground leading-none">
              <span className="block dark:hidden">Starlight</span>
              <span className="hidden dark:block">Midnight</span>
            </span>
          </div>
        </div>

        {/* App Content Area */}
        <div className="flex flex-col md:flex-row h-[420px] bg-white dark:bg-[#111118]">
          {/* Left Column: Input Panel */}
          <div className="w-full md:w-[40%] p-6 border-r border-border flex flex-col gap-5">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block mb-2">
                YouTube URL
              </label>
              <div className="px-3 py-2 rounded-lg bg-muted border border-border text-[13px] text-foreground truncate font-medium">
                youtube.com/watch?v=dQw4w9WgXcQ
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="px-2 py-1 rounded-full bg-[#34C77A]/10 border border-[#34C77A]/20 text-[#34C77A] text-[10px] font-bold flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-[#34C77A]" />
                ✓ Captions found
              </div>
              <div className="px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-bold">
                4:32 duration
              </div>
            </div>

            <Button className="w-full h-11 bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
              Extract Transcript <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <div className="relative h-px bg-border flex items-center justify-center">
              <span className="bg-white dark:bg-[#111118] px-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">or</span>
            </div>

            <Button variant="outline" className="w-full h-11 border-border font-bold text-sm">
              Upload audio file
            </Button>

            <div className="mt-auto text-center">
              <span className="text-[10px] text-muted-foreground font-medium">1 credit · standard extraction</span>
            </div>
          </div>

          {/* Right Column: Transcript Area */}
          <div className="hidden md:flex md:w-[60%] flex-col p-6 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Transcript
              </label>
              <div className="flex gap-2">
                <div className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex gap-3">
                <span className="text-[11px] font-bold text-primary dark:text-primary/70 shrink-0 mt-0.5">[00:00]</span>
                <p className="text-[13px] text-foreground leading-relaxed">
                  Welcome back to the channel. Today we&apos;re going to cover something I get asked about constantly —
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-[11px] font-bold text-primary dark:text-primary/70 shrink-0 mt-0.5">[00:08]</span>
                <p className="text-[13px] text-foreground leading-relaxed">
                  how to actually retain what you learn from online courses and lectures.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-[11px] font-bold text-primary dark:text-primary/70 shrink-0 mt-0.5">[00:15]</span>
                <p className="text-[13px] text-foreground leading-relaxed">
                  Most people watch, feel like they understood it, and forget 80% within 48 hours.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-[11px] font-bold text-primary dark:text-primary/70 shrink-0 mt-0.5">[00:23]</span>
                <p className="text-[13px] text-foreground leading-relaxed">
                  The fix is simple. Transcript it. Summarise it. Read it back.
                </p>
              </div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-white dark:from-[#111118] to-transparent z-10" />

            {/* Export Badges */}
            <div className="absolute bottom-6 left-6 flex gap-2 z-20">
              <div className="px-2 py-0.5 rounded-full bg-muted border border-border text-[9px] font-bold text-muted-foreground">TXT</div>
              <div className="px-2 py-0.5 rounded-full bg-muted border border-border text-[9px] font-bold text-muted-foreground">JSON</div>
              <div className="px-2 py-0.5 rounded-full bg-muted border border-border text-[9px] font-bold text-muted-foreground">SRT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

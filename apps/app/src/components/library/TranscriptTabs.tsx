"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@indxr/shared/components/ui/sheet";
import { cn } from "@indxr/shared/lib/utils";

export interface ViewTab {
  id: string; // URL ?tab= value (stable): original | edited | summary | summary_edited | developer
  label: string;
}

/**
 * Tab navigation for the transcript page. Desktop: a horizontal strip. Mobile: a single
 * full-width "Transcript · 1 of N ▾" button that opens a bottom sheet — five tabs never fit on
 * 360px and horizontal scroll is not a solution. Tabs only appear when their content exists
 * (computed server-side); a disappeared active tab falls back to Transcript there.
 */
export function TranscriptTabs({ tabs, activeId, transcriptId }: { tabs: ViewTab[]; activeId: string; transcriptId: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();
  const activeIdx = Math.max(0, tabs.findIndex((t) => t.id === activeId));
  const activeLabel = tabs[activeIdx]?.label ?? "Transcript";
  const href = (id: string) => `/dashboard/library/${transcriptId}?tab=${id}`;

  return (
    <>
      {/* Desktop strip */}
      <div className="hidden md:flex items-center gap-1 border-b border-border text-sm" role="tablist">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={href(t.id)}
            role="tab"
            aria-selected={t.id === activeId}
            data-testid={`transcript-tab-${t.id}`}
            className={cn(
              "pb-3 border-b-2 px-2 transition-colors",
              t.id === activeId
                ? "border-accent font-medium text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Mobile view selector */}
      <button
        onClick={() => setSheetOpen(true)}
        className="md:hidden w-full flex items-center justify-between rounded-lg border border-border bg-surface px-3 h-11 text-sm text-fg"
        aria-label="Choose view"
        data-testid="transcript-view-selector"
      >
        <span className="font-medium">{activeLabel}</span>
        <span className="flex items-center gap-2 text-fg-muted">
          <span className="tabular-nums text-xs">{activeIdx + 1} of {tabs.length}</span>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>View</SheetTitle>
          </SheetHeader>
          <div className="pb-6 pt-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSheetOpen(false);
                  router.push(href(t.id));
                }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-2 min-h-[44px] text-sm transition-colors",
                  t.id === activeId ? "bg-accent-subtle text-accent font-medium" : "text-fg hover:bg-surface-elevated/60",
                )}
              >
                <span className="flex-1 text-left">{t.label}</span>
                {t.id === activeId && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

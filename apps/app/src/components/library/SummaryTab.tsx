"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@indxr/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@indxr/shared/components/ui/dialog";
import { BalanceLine } from "@indxr/shared/components/transcribe/CostBreakdown";
import { summaryCreditCost } from "@indxr/shared/lib/pricing";
import { appHref } from "@indxr/shared/lib/cross-host-links";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { useAuth } from "@indxr/shared/hooks/useAuth";
import type { JSONContent } from "@tiptap/react";
import { AiSummaryView } from "./AiSummaryView";

interface SummarySection {
  heading: string;
  start_time: number;
  end_time: number;
  content: string;
}

interface SummaryTabProps {
  id: string;
  initialSummary: {
    schema_version?: number;
    overview: string;
    sections: SummarySection[];
    generated_at: string;
  } | null;
  videoId?: string;
  editedContentUpdatedAt?: string | null;
  title?: string;
  channel?: string;
  language?: string;
  durationSeconds?: number;
  extractionMethod?: string;
  hasSummaryEdit?: boolean;
}

const POLL_MS = 3000;
const MAX_POLLS = 600; // ~30 min
const SESSION_KEY = "indxr-active-summary-job";

type PollState = { status: string; sectionsTotal: number | null; sectionsDone: number | null };

/**
 * Owner of the AI-summary lifecycle on the Summary tab: generation (with the canonical cost card),
 * live progress polling (chapter X of N), and the finished read view. Generation used to live in the
 * transcript overflow menu with only a spinner; it now lives here where the user is sent, and shows real
 * progress. The generated summary is never overwritten by an edit (that is the separate Edited tab); a
 * regenerate replaces it and reuses the existing POST — no credit logic here.
 */
export function SummaryTab(props: SummaryTabProps) {
  const { id, initialSummary, durationSeconds } = props;
  const router = useRouter();
  const supabase = createClient();
  const { user, credits, refreshCredits } = useAuth();

  const summaryCost = summaryCreditCost(durationSeconds ?? 0);
  const enough = credits == null || credits >= summaryCost;

  const [generating, setGenerating] = useState(false);
  const [poll, setPoll] = useState<PollState>({ status: "pending", sectionsTotal: null, sectionsDone: null });
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollingRef = useRef(false);

  const pollJob = useCallback(async (jobId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setGenerating(true);
    setError(null);
    try {
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        let job: { status?: string; sections_total?: number | null; sections_done?: number | null; error_message?: string };
        try {
          const res = await fetch(`/api/summary/jobs/${jobId}?user_id=${user?.id ?? ""}`);
          job = await res.json();
        } catch {
          continue; // transient network — keep polling
        }
        setPoll({ status: job.status ?? "summarizing", sectionsTotal: job.sections_total ?? null, sectionsDone: job.sections_done ?? null });
        if (job.status === "complete") {
          try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
          await refreshCredits();
          setGenerating(false);
          router.refresh(); // re-render the page → this tab now shows the summary
          return;
        }
        if (job.status === "error") {
          try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
          await refreshCredits(); // reservation refunded on failure
          setGenerating(false);
          setError(job.error_message || "The summary couldn't be generated. You were not charged.");
          return;
        }
      }
      setError("This is taking longer than expected — it may still finish on our servers. Refresh in a bit.");
      setGenerating(false);
    } finally {
      pollingRef.current = false;
    }
  }, [user?.id, refreshCredits, router]);

  // Resume: on mount, pick up a running job (sessionStorage first, then the DB — same rule the transcript
  // viewer used). No new POST → no re-charge. Runs regardless of whether a summary already exists (a
  // regenerate leaves the old summary until the new one lands).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { jobId?: string; transcriptId?: string };
          if (parsed.transcriptId === id && parsed.jobId) { if (!cancelled) pollJob(parsed.jobId); return; }
        }
      } catch { /* ignore */ }
      const { data } = await supabase
        .from("transcription_jobs")
        .select("id")
        .eq("transcript_id", id)
        .eq("source_kind", "ai_summary")
        .in("status", ["pending", "summarizing"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled && data && data.length > 0) pollJob(data[0].id as string);
    })();
    return () => { cancelled = true; };
  }, [id, supabase, pollJob]);

  const startGeneration = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript_id: id, user_id: user?.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.job_id) {
        setError(data.error || "Could not start the summary.");
        setSubmitting(false);
        return;
      }
      await refreshCredits(); // reservation already deducted
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ jobId: data.job_id, transcriptId: id })); } catch { /* ignore */ }
      setPoll({ status: "pending", sectionsTotal: null, sectionsDone: null });
      pollJob(data.job_id as string);
    } catch {
      setError("Could not start the summary.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Progress state ──
  if (generating) {
    const { status, sectionsTotal, sectionsDone } = poll;
    const analyzing = status === "pending" || sectionsTotal == null;
    const done = sectionsDone ?? 0;
    const total = sectionsTotal ?? 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return (
      <Shell>
        <div className="flex items-center gap-2 text-xl font-bold text-fg">
          <Sparkles className="h-6 w-6 text-amber-500" /> AI Summary
        </div>
        <div className="mt-8 flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="mt-4 text-base font-medium text-fg">
            {analyzing ? "Analyzing the transcript…" : `Writing your summary — chapter ${Math.min(done + 1, total)} of ${total}`}
          </p>
          {!analyzing && (
            <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="mt-4 max-w-md text-sm text-fg-muted">
            This runs on our servers — you can close this tab and come back; your summary will be waiting.
          </p>
        </div>
      </Shell>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-xl font-bold text-fg">
          <Sparkles className="h-6 w-6 text-amber-500" /> AI Summary
        </div>
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
        <div className="mt-4">
          <Button onClick={() => setShowConfirm(true)} className="gap-2">
            <Sparkles className="h-4 w-4" /> Try again
          </Button>
        </div>
        {confirmDialog()}
      </Shell>
    );
  }

  // ── Has a summary → the read view (with a Regenerate action) ──
  if (initialSummary) {
    return (
      <>
        <AiSummaryView
          id={id}
          initialSummary={initialSummary as unknown as { schema_version?: number; overview: string; sections: SummarySection[]; generated_at: string }}
          videoId={props.videoId}
          editedContentUpdatedAt={props.editedContentUpdatedAt ?? null}
          title={props.title}
          channel={props.channel}
          language={props.language}
          durationSeconds={props.durationSeconds}
          extractionMethod={props.extractionMethod}
          hasSummaryEdit={props.hasSummaryEdit}
          onRegenerate={() => setShowConfirm(true)}
        />
        {confirmDialog()}
      </>
    );
  }

  // ── No summary yet → empty state + primary Generate ──
  return (
    <Shell>
      <div className="flex items-center gap-2 text-xl font-bold text-fg">
        <Sparkles className="h-6 w-6 text-amber-500" /> AI Summary
      </div>
      <div className="mt-8 flex flex-col items-center text-center">
        <p className="text-base font-medium text-fg">No summary yet</p>
        <p className="mt-1 max-w-md text-sm text-fg-muted">
          Turn this transcript into a chapter-by-chapter summary with clickable timestamps.
        </p>
        <Button onClick={() => setShowConfirm(true)} disabled={submitting} className="mt-5 gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate AI summary — {summaryCost} credits
        </Button>
      </div>
      {confirmDialog()}
    </Shell>
  );

  // ── Shared cost-card confirm (first-gen + regenerate) — mirrors the transcription cost card ──
  function confirmDialog() {
    return (
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{initialSummary ? "Regenerate summary" : "Generate AI summary"}</DialogTitle>
            <DialogDescription>
              {initialSummary
                ? "This replaces the current generated summary. Any edited version is kept and marked outdated."
                : "A chapter-by-chapter summary with clickable timestamps."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
              <span className="font-medium">Total</span>
              <span className="text-[22px] font-semibold tabular-nums text-fg-strong">{summaryCost} credits</span>
            </div>
            <div className="flex flex-col gap-3 bg-surface-elevated px-4 py-3">
              <BalanceLine have={credits} cost={summaryCost} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setShowConfirm(false)} className="h-10 w-full sm:w-auto">Cancel</Button>
                {enough ? (
                  <Button onClick={startGeneration} disabled={submitting} className="h-10 w-full sm:w-auto gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {initialSummary ? "Regenerate" : "Generate"} — {summaryCost} credits
                  </Button>
                ) : (
                  <a href={appHref("/dashboard/credits")} className="w-full sm:w-auto">
                    <Button className="h-10 w-full">Buy credits</Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12 w-full" id="ai-summary">
      <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">{children}</div>
    </div>
  );
}

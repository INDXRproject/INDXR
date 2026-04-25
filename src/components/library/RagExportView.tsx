"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRagJson } from "@/utils/formatTranscript";
import type { TranscriptItem } from "@/utils/formatTranscript";

// profiles.rag_chunk_size (Settings → Developer Exports) geldt als default voor de eerste
// export vanuit TranscriptCard. In de library kiest de gebruiker per transcript zijn preset —
// de settings waarde heeft hier geen effect.

interface RagExport {
  chunk_size: number;
  exported_at: string;
  credits_spent: number;
}

interface RagExportViewProps {
  transcriptId: string;
  transcript: TranscriptItem[];
  videoId: string;
  title: string;
  processingMethod?: string | null;
  ragExports: RagExport[];
}

const CHUNK_LABELS: Record<number, string> = {
  30:  "Quote (30s)",
  60:  "Balanced (60s)",
  90:  "Precise (90s)",
  120: "Context (120s)",
};

const CHUNK_OPTIONS = [
  { value: 30  as const, label: "Quote",    sub: "30s",  tokens: "~100 tokens" },
  { value: 60  as const, label: "Balanced", sub: "60s",  tokens: "~200 tokens" },
  { value: 90  as const, label: "Precise",  sub: "90s",  tokens: "~300 tokens" },
  { value: 120 as const, label: "Context",  sub: "120s", tokens: "~390 tokens" },
];

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function RagExportView({
  transcript,
  videoId,
  title,
  processingMethod,
  ragExports,
}: RagExportViewProps) {
  const lastChunkSize = ragExports.length > 0
    ? (ragExports[ragExports.length - 1].chunk_size as 30 | 60 | 90 | 120)
    : 60;
  const [selectedChunkSize, setSelectedChunkSize] = useState<30 | 60 | 90 | 120>(lastChunkSize);

  const handleDownload = (chunkSize: number) => {
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30) || 'transcript';
    const json = buildRagJson(transcript, {
      videoId,
      title,
      extractionMethod: processingMethod ?? undefined,
      chunkSize,
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}_rag_${chunkSize}s.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Export history */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Export History</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Preset</th>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Credits</th>
                <th className="px-4 py-2.5 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ragExports.map((exp, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {CHUNK_LABELS[exp.chunk_size] ?? `${exp.chunk_size}s`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getRelativeTime(exp.exported_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {exp.credits_spent} credit{exp.credits_spent !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 gap-1.5 text-xs"
                      onClick={() => handleDownload(exp.chunk_size)}
                    >
                      <Download className="h-3 w-3" />
                      Re-download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New export */}
      <div className="rounded-xl border border-border bg-[var(--bg-surface)] p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-0.5">Export New Preset</h2>
          <p className="text-xs text-muted-foreground">
            Free — you&apos;ve already paid for this transcript.
          </p>
        </div>

        <div className="space-y-2">
          {CHUNK_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                selectedChunkSize === option.value
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="rag_chunk_size_library"
                  value={option.value}
                  checked={selectedChunkSize === option.value}
                  onChange={() => setSelectedChunkSize(option.value)}
                  className="accent-primary size-4"
                />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {option.label}
                    <span className="text-xs text-muted-foreground font-normal">({option.sub})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{option.tokens}</div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => handleDownload(selectedChunkSize)}
        >
          <Download className="h-4 w-4" />
          Export RAG JSON — Free
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { Button } from "@indxr/shared/components/ui/button";
import { buildRagJson } from "@indxr/shared/utils/formatTranscript";
import type { TranscriptItem } from "@indxr/shared/utils/formatTranscript";
import { RAG_CHUNK_PRESETS, RAG_CHUNK_LABELS, RAG_CHUNK_DEFAULT, type RagChunkSize } from "@indxr/shared/lib/pricing";

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

const CHUNK_LABELS = RAG_CHUNK_LABELS;
const CHUNK_OPTIONS = RAG_CHUNK_PRESETS;

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
  transcriptId,
  transcript,
  videoId,
  title,
  processingMethod,
  ragExports,
}: RagExportViewProps) {
  // Defense-in-depth: this view is only for re-downloads after a paid first export.
  // The page-level render-guard should prevent reaching this state, but we guard
  // here too so the component can never serve as a free bypass.
  if (ragExports.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <Lock className="h-8 w-8 text-fg-muted mx-auto" />
        <p className="text-fg-muted text-sm">
          No RAG exports yet. Use the <strong>Export → RAG JSON</strong> option in the transcript
          viewer to create your first export.
        </p>
        <Link href={`/dashboard/library/${transcriptId}`}>
          <Button variant="outline" size="sm">Back to transcript</Button>
        </Link>
      </div>
    );
  }

  const lastChunkSize = ragExports.length > 0
    ? (ragExports[ragExports.length - 1].chunk_size as RagChunkSize)
    : RAG_CHUNK_DEFAULT;
  const [selectedChunkSize, setSelectedChunkSize] = useState<RagChunkSize>(lastChunkSize);

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
        <h2 className="text-sm font-semibold text-fg mb-3">Export History</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated/50 text-fg-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Preset</th>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Credits</th>
                <th className="px-4 py-2.5 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ragExports.map((exp, i) => (
                <tr key={i} className="hover:bg-surface-elevated/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-fg">
                    {CHUNK_LABELS[exp.chunk_size] ?? `${exp.chunk_size}s`}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {getRelativeTime(exp.exported_at)}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
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
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-fg mb-0.5">Export New Preset</h2>
          <p className="text-xs text-fg-muted">
            Free — you&apos;ve already paid for this transcript.
          </p>
        </div>

        <div className="space-y-2">
          {CHUNK_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                selectedChunkSize === option.value
                  ? "border-primary/50 bg-accent/5"
                  : "border-border hover:bg-surface-elevated/40"
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
                  <div className="flex items-center gap-2 text-sm font-medium text-fg">
                    {option.label}
                    <span className="text-xs text-fg-muted font-normal">({option.sub})</span>
                  </div>
                  <div className="text-xs text-fg-muted">{option.tokens}</div>
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

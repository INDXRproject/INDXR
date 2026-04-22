"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { saveRagChunkSizeAction } from "@/app/actions/rag-export";

interface ChunkOption {
  value: 30 | 60 | 120;
  label: string;
  sub: string;
  tokens: string;
}

const CHUNK_OPTIONS: ChunkOption[] = [
  { value: 30,  label: "Quote",    sub: "30s",  tokens: "~100 tokens" },
  { value: 60,  label: "Balanced", sub: "60s",  tokens: "~200 tokens" },
  { value: 120, label: "Context",  sub: "120s", tokens: "~390 tokens" },
];

interface DeveloperExportsCardProps {
  initialChunkSize: 30 | 60 | 120;
}

export function DeveloperExportsCard({ initialChunkSize }: DeveloperExportsCardProps) {
  const [chunkSize, setChunkSize] = useState<30 | 60 | 120>(initialChunkSize);
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);

  const handleChange = async (value: 30 | 60 | 120) => {
    setChunkSize(value);
    setSaving(true);
    setSavedValue(null);
    await saveRagChunkSizeAction(value);
    setSaving(false);
    setSavedValue(value);
    setTimeout(() => setSavedValue(null), 2000);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-4">
      <div>
        <h2 className="text-[var(--text-primary)] font-semibold mb-1">Developer Exports</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Configure the default chunk size for RAG JSON exports.
        </p>
      </div>

      <div className="border-t border-[var(--border)]/50 pt-4 space-y-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">Chunk size</p>
        <div className="space-y-2">
          {CHUNK_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                chunkSize === option.value
                  ? "border-primary/50 bg-primary/5"
                  : "border-[var(--border)] hover:border-[var(--border)] hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="rag_chunk_size"
                  value={option.value}
                  checked={chunkSize === option.value}
                  onChange={() => handleChange(option.value)}
                  disabled={saving}
                  className="accent-primary size-4"
                />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    {option.label}
                    <span className="text-xs text-muted-foreground font-normal">({option.sub})</span>
                    {savedValue === option.value && (
                      <Check className="size-3.5 text-green-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{option.tokens}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Smaller chunks improve precision; larger chunks preserve more context per embedding.{" "}
          <a
            href="/blog/chunk-youtube-transcripts-for-rag"
            className="text-primary hover:underline"
          >
            Learn about RAG chunking →
          </a>
        </p>
      </div>
    </div>
  );
}

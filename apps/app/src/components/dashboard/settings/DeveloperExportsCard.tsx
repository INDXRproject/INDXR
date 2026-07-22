"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { saveRagChunkSizeAction } from "@indxr/shared/actions/rag-export";
import { RAG_CHUNK_PRESETS, type RagChunkSize } from "@indxr/shared/lib/pricing";
import { marketingHref } from "@indxr/shared/lib/cross-host-links";

const CHUNK_OPTIONS = RAG_CHUNK_PRESETS;

interface DeveloperExportsCardProps {
  initialChunkSize: RagChunkSize;
}

export function DeveloperExportsCard({ initialChunkSize }: DeveloperExportsCardProps) {
  const [chunkSize, setChunkSize] = useState<RagChunkSize>(initialChunkSize);
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);

  const handleChange = async (value: RagChunkSize) => {
    setChunkSize(value);
    setSaving(true);
    setSavedValue(null);
    await saveRagChunkSizeAction(value);
    setSaving(false);
    setSavedValue(value);
    setTimeout(() => setSavedValue(null), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div>
        <h2 className="text-fg font-semibold mb-1">Developer Exports</h2>
        <p className="text-fg-muted text-sm">
          Configure the default chunk size for RAG JSON exports.
        </p>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <p className="text-sm font-medium text-fg">Chunk size</p>
        <div className="space-y-2">
          {CHUNK_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                chunkSize === option.value
                  ? "border-primary/50 bg-accent/5"
                  : "border-border hover:border-border hover:bg-surface-elevated/40"
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
                  <div className="flex items-center gap-2 text-sm font-medium text-fg">
                    {option.label}
                    <span className="text-xs text-fg-muted font-normal">({option.sub})</span>
                    {savedValue === option.value && (
                      <Check className="size-3.5 text-success" />
                    )}
                  </div>
                  <div className="text-xs text-fg-muted">{option.tokens}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-fg-muted">
          Smaller chunks improve precision; larger chunks preserve more context per embedding.{" "}
          <a
            href={marketingHref("/articles/chunk-youtube-transcripts-for-rag")}
            className="text-accent hover:underline"
          >
            Learn about RAG chunking →
          </a>
        </p>
      </div>

    </div>
  );
}

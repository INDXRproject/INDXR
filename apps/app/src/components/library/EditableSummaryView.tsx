"use client";

import { useEffect, useState } from "react";
import { Sparkles, Save, Copy, Check, RotateCcw, Loader2, Bold, Italic, List, ListOrdered } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/react";
import { Button } from "@indxr/shared/components/ui/button";
import { createClient } from "@indxr/shared/utils/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@indxr/shared/lib/utils";
import { summaryToTiptapDoc, type TNode } from "@indxr/shared/utils/summaryDoc";

interface SummarySection {
  heading: string;
  start_time: number;
  end_time: number;
  content: string;
}

interface EditableSummaryViewProps {
  id: string;
  /** The GENERATED summary — the seed + the "revert to original" target. Never overwritten by an edit. */
  generatedSummary: {
    overview: string;
    sections: SummarySection[];
    generated_at: string;
  };
  /** The saved edited version (Tiptap JSON) — null until the user saves an edit. */
  editedContent: JSONContent | null;
  /** When the edit was last saved — stale if it predates the generated summary (regenerated since). */
  editedUpdatedAt: string | null;
}

/**
 * Editable AI summary — mirrors the transcript's Edited tab (TranscriptViewer edited mode): a Tiptap
 * editor seeded from the generated summary (or the last saved edit), saving to the SEPARATE
 * `ai_summary_edited` column so regenerating never overwrites it. Staleness follows the exact same
 * rule the transcript→summary notice uses: the edit is stale when it predates the generated version.
 */
export function EditableSummaryView({ id, generatedSummary, editedContent, editedUpdatedAt }: EditableSummaryViewProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const seed = (editedContent ?? (summaryToTiptapDoc(generatedSummary) as unknown as JSONContent));

  const editor = useEditor({
    editable: true,
    immediatelyRender: false,
    extensions: [StarterKit],
    content: seed,
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] text-fg/90 leading-relaxed" },
    },
    onUpdate: () => setIsDirty(true),
  });

  useEffect(() => {
    if (editor) editor.setEditable(true);
  }, [editor]);

  const handleSave = async () => {
    if (!editor) return;
    const json = editor.getJSON();
    if (!editor.getText().trim()) {
      setFeedback({ type: "error", message: "Cannot save an empty summary. Use Revert to restore the generated version." });
      return;
    }
    setIsSaving(true);
    // Separate column + its own timestamp — mirrors edited_content / edited_content_updated_at. The
    // timestamp lets the stale-notice compare against ai_summary.generated_at (moves on regenerate).
    const { error } = await supabase
      .from("transcripts")
      .update({ ai_summary_edited: json, ai_summary_edited_updated_at: new Date().toISOString() })
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      setFeedback({ type: "error", message: "Failed to save summary edits" });
    } else {
      setIsDirty(false);
      setFeedback({ type: "success", message: "Saved!" });
    }
  };

  const handleRevert = () => {
    editor?.commands.setContent(summaryToTiptapDoc(generatedSummary) as unknown as JSONContent);
    setIsDirty(true);
  };

  const handleCopy = () => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Stale when the edit predates the generated summary — i.e. the summary was regenerated after the
  // edit. Same shape as the transcript→summary notice (older version < newer source timestamp).
  const isStale =
    !!editedUpdatedAt && !!generatedSummary.generated_at &&
    new Date(editedUpdatedAt) < new Date(generatedSummary.generated_at);

  const btn = (active: boolean) =>
    cn("h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors",
      active ? "bg-accent-subtle text-accent" : "text-fg-muted hover:text-fg hover:bg-surface-elevated/60");

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12 w-full">
      <div className="rounded-xl border border-border bg-surface p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-xl font-bold text-fg">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI Summary — edited
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
              {copied ? <Check className="mr-2 h-3.5 w-3.5 text-success" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRevert} className="h-8" title="Restore the generated summary">
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Revert
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !editor || !isDirty} className="h-8 gap-1.5">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          </div>
        </div>

        {/* Stale notice — the summary was regenerated after this edit. Mirrors ADR-085's stale-summary UI. */}
        {isStale && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
            <span className="flex-1">This edited summary was written before the summary was last regenerated.</span>
            <button
              onClick={() => router.replace(`/dashboard/library/${id}?tab=summary`)}
              className="font-medium underline hover:no-underline shrink-0 cursor-pointer"
            >
              View current
            </button>
          </div>
        )}

        {feedback && (
          <div className={cn("rounded-lg px-3 py-2 text-sm", feedback.type === "error" ? "border border-error/20 bg-error/10 text-error" : "border border-success/20 bg-success/10 text-success")}>
            {feedback.message}
          </div>
        )}

        {/* Formatting toolbar */}
        <div className="flex items-center gap-1">
          <button className={btn(!!editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-4 w-4" /></button>
          <button className={btn(!!editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-4 w-4" /></button>
          <button className={btn(!!editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-4 w-4" /></button>
          <button className={btn(!!editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="h-4 w-4" /></button>
        </div>

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

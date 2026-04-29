"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Copy, X, Check, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AiSummaryViewProps {
  id: string;
  initialSummary: {
    text: string;
    action_points: string[];
    generated_at: string;
    edited: boolean;
    html?: string;
    edited_html?: string;
  };
  mode?: "original" | "edited";
}

export function AiSummaryView({ id, initialSummary, mode = "original" }: AiSummaryViewProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const defaultHtml = `
    <p>${summary.text}</p>
    <ul>
      ${summary.action_points?.map(pt => `<li><p>${pt}</p></li>`).join('') || ''}
    </ul>
  `;

  const isEditingTab = mode === "edited";
  const displayContent = mode === "edited" && summary.edited_html ? summary.edited_html : (summary.html || defaultHtml);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: displayContent,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] text-fg/90 leading-relaxed prose-li:marker:text-amber-500",
          (!isEditing && !isEditingTab) && "read-only-mode"
        )
      }
    }
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing || isEditingTab);
    }
  }, [editor, isEditing, isEditingTab]);

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    
    // We save the html directly to persist formatting (bold, italic, lists)
    const updatedSummary = { 
      ...summary, 
      edited_html: editor.getHTML(), 
      edited: true 
    };
    
    const { error } = await supabase
      .from("transcripts")
      .update({ ai_summary: updatedSummary })
      .eq("id", id);
      
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save summary edits");
    } else {
      toast.success("Summary saved");
      setSummary(updatedSummary);
      setIsEditing(false);
      
      // If we are saving from the original tab for the first time
      if (mode === "original") {
        router.replace(`?tab=summary_edited`);
      }
    }
  };

  const handleCopy = () => {
    const textToCopy = editor ? editor.getText() : "";
    navigator.clipboard.writeText(textToCopy);
    toast.success("Summary copied to clipboard");
  };

  const handleExportTxt = () => {
    const text = editor ? editor.getText() : "";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary_${id}.txt`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12 w-full" id="ai-summary">
      <div className="rounded-xl border border-border bg-surface p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-xl font-bold text-fg">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI Summary
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportTxt}>
                      Text File (.txt)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-5 w-px bg-border mx-1" />
                {mode === "original" && !summary.edited_html && (
                  <Button size="sm" onClick={() => setIsEditing(true)} className="h-8">
                    Edit
                  </Button>
                )}
                {mode === "edited" && (
                  <Button size="sm" onClick={() => setIsEditing(true)} className="h-8">
                    Edit
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => {
                  editor?.commands.setContent(summary.html || defaultHtml);
                  setIsEditing(false);
                }} className="h-8 gap-1.5 px-3 text-xs text-fg-muted hover:text-fg hover:bg-surface-elevated">
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <div className="h-5 w-px bg-border mx-1" />
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 gap-1.5 px-3 text-xs">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
           </div>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 p-2 rounded-lg border border-border flex-wrap mb-4 bg-surface-elevated/30">
            <Button
              variant="ghost" size="sm"
              className={cn("h-8 w-8 p-0", editor?.isActive("bold") && "bg-accent text-accent-foreground")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("h-8 w-8 p-0", editor?.isActive("italic") && "bg-accent text-accent-foreground")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("h-8 w-8 p-0", editor?.isActive("underline") && "bg-accent text-accent-foreground")}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>

            <div className="h-5 w-px bg-border/80 mx-1" />

            <Button
              variant="ghost" size="sm"
              className={cn("h-8 w-8 p-0", editor?.isActive("bulletList") && "bg-accent text-accent-foreground")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("h-8 w-8 p-0", editor?.isActive("orderedList") && "bg-accent text-accent-foreground")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className={cn(
          "space-y-8",
          isEditing && "rounded-xl border border-border bg-surface p-5 min-h-[400px]"
        )}>
          <EditorContent editor={editor} />
          {!isEditing && summary.edited && (
            <div className="text-xs text-fg-muted italic text-right mt-8 pt-4 border-t border-border/50">
              Edited manually
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

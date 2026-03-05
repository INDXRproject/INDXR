"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  ExternalLink,
  Eye,
  Loader2,
  Download,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generateTxt, generateCsv } from "@/utils/formatTranscript";

// Helper for relative time
function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export interface Transcript {
  id: string;
  title: string;
  video_id: string;
  video_url?: string;
  created_at: string;
  updated_at?: string;
  thumbnail_url?: string;
  duration?: number;
  character_count?: number;
  processing_method?: string | null;
  // New fields
  edited_content?: object | null;
  ai_summary?: object | null;
  collection_id?: string | null;
  playlist_id?: string | null;
  viewed_at?: string | null;
}

/** Build a human-readable metadata line under each transcript title */
function buildMetaLine(t: Transcript): string {
  const parts: string[] = [];

  // Size
  if (t.character_count) {
    const kb = t.character_count / 1024;
    parts.push(`${kb.toFixed(1)} KB`);
  }

  // Processing method
  const method = t.processing_method;
  if (!method || method === 'youtube_captions') {
    parts.push('Auto-captions');
  } else if (method === 'whisper_ai' || method === 'whisper') {
    parts.push('Whisper AI');
  }

  // Edited & Summarized
  if (t.edited_content) parts.push('Edited');
  if (t.ai_summary) parts.push('Summarized');

  return parts.join(' · ');
}

interface TranscriptListProps {
  transcripts: Transcript[];
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  viewMode: 'grid' | 'list';
}

export function TranscriptList({ transcripts, onDelete, onRename, viewMode }: TranscriptListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // Track locally-marked-as-read IDs so badge hides instantly
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());
  const editTitleRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  /** Mark a single transcript as viewed without navigating to it */
  const handleMarkAsRead = async (transcriptId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocallyReadIds(prev => new Set(prev).add(transcriptId));
    const { error } = await supabase
      .from('transcripts')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', transcriptId);
    if (error) {
      console.error('Mark as read failed:', error);
      // Rollback optimistic update
      setLocallyReadIds(prev => { const s = new Set(prev); s.delete(transcriptId); return s; });
    } else {
      window.dispatchEvent(new CustomEvent('transcripts-updated'));
    }
  };

  const isNew = (t: Transcript) => !t.viewed_at && !locallyReadIds.has(t.id);

  // Drag start — pass transcript id via dataTransfer
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("transcriptId", id);
    // Add plain text fallback for broader browser support
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    // Cancel any active rename on drag start
    if (editingId) setEditingId(null);
  };

  // Inline rename
  const handleRenameStart = (t: Transcript) => {
    setEditingId(t.id);
    setEditingTitle(t.title || `Video ${t.video_id}`);
    setTimeout(() => editTitleRef.current?.focus(), 0);
  };

  const handleRenameSave = (id: string) => {
    const name = editingTitle.trim();
    setEditingId(null);
    if (!name) return;
    const original = transcripts.find(t => t.id === id)?.title ?? "";
    if (name === original) return;
    onRename?.(id, name);
  };

  // Selection Handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transcripts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transcripts.map(t => t.id)));
    }
  };

  const handleBatchDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} transcripts?`)) return;
    selectedIds.forEach(id => onDelete(id));
    setSelectedIds(new Set());
  };

  // Batch Download Logic
  const handleBatchDownload = async (format: 'zip' | 'txt' | 'json' | 'csv') => {
    setIsDownloading(true);
    try {
      // 1. Fetch full content
      const { data, error } = await supabase
        .from('transcripts')
        .select('*, transcript') 
        .in('id', Array.from(selectedIds));

      if (error || !data) throw new Error("Failed to fetch transcript data");

      const zip = new JSZip();
      
      data.forEach((item: Record<string, unknown>) => {
        const safeTitle = ((item.title as string) || `video-${item.video_id as string}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const videoUrl = `https://www.youtube.com/watch?v=${item.video_id as string}`;
        
        let fileContent = "";
        let extension = "";

        // Use shared utilities for generation
        if (format === 'json') {
           fileContent = JSON.stringify({
              metadata: { title: item.title, videoUrl },
              transcript: item.transcript
           }, null, 2);
           extension = "json";
        } else if (format === 'csv') {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           fileContent = generateCsv(item.transcript as any, item.title as string, videoUrl);
           extension = "csv";
        } else {
           // Default to TXT (with timestamps for now for batch, could add option later)
           // For now, let's export TXT with timestamps as the standard "Text" export
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           fileContent = generateTxt(item.transcript as any, item.title as string, videoUrl, true);
           extension = "txt";
        }

        zip.file(`${safeTitle}.${extension}`, fileContent);
      });

      // 2. Generate and Save
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `transcripts-export-${new Date().toISOString().slice(0,10)}.zip`);
      toast.success("Download started");
      setSelectedIds(new Set()); // Clear selection

    } catch (e) {
      console.error(e);
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  if (transcripts.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/20">
        <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Library is empty</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Transcripts you extract will appear here
        </p>
        <Link href="/dashboard/transcribe">
           <Button variant="outline" className="mt-6">Go to Transcribe</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in">
           <div className="bg-card border border-border shadow-xl rounded-full px-6 py-3 flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
              
              <div className="h-6 w-px bg-border/50" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => handleBatchDownload('zip')}>
                    Download All (ZIP)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBatchDownload('txt')}>
                    Text Only (.zip)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('json')}>
                    JSON (.zip)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchDownload('csv')}>
                    CSV (.zip)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleBatchDelete}>
                 <Trash2 className="h-4 w-4" />
              </Button>
              
              <Button size="sm" variant="ghost" className="rounded-full h-6 w-6 p-0" onClick={() => setSelectedIds(new Set())}>
                ×
              </Button>
           </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-4 w-[40px]">
                  <Checkbox 
                     checked={selectedIds.size === transcripts.length && transcripts.length > 0}
                     onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium hidden md:table-cell">Duration</th>
                <th className="p-4 font-medium hidden sm:table-cell">Date</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transcripts.map((t) => (
                <tr key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} className={`group hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing ${selectedIds.has(t.id) ? 'bg-muted/40' : ''}`}>
                  <td className="p-4">
                     <Checkbox 
                       checked={selectedIds.has(t.id)}
                       onCheckedChange={() => toggleSelect(t.id)}
                     />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="group/title">
                          {editingId === t.id ? (
                            <input
                              ref={editTitleRef}
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={() => handleRenameSave(t.id)}
                              onKeyDown={e => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                if (e.key === "Escape") { setEditingId(null); }
                              }}
                              className="font-medium text-foreground w-full bg-transparent border-b border-border outline-none text-sm leading-none py-0.5"
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/dashboard/library/${t.id}`}
                                className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors"
                                onDoubleClick={e => { e.preventDefault(); handleRenameStart(t); }}
                              >
                                {t.title || `Video ${t.video_id}`}
                              </Link>
                              <button
                                onClick={() => handleRenameStart(t)}
                                className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-4 w-4 flex items-center justify-center shrink-0"
                                title="Rename"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                          {/* New metadata line: replaces Edited/AI badges */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <TooltipProvider delayDuration={200}>
                              {isNew(t) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="h-4 px-1 text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
                                      onClick={(e) => handleMarkAsRead(t.id, e)}
                                    >
                                      NEW
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Click to mark as read</TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                            <span className="text-xs text-muted-foreground">{buildMetaLine(t)}</span>
                          </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                     {t.duration ? formatDuration(t.duration) : '-'}
                  </td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">
                    {getRelativeTime(
                      t.updated_at && new Date(t.updated_at) > new Date(t.created_at)
                        ? t.updated_at
                        : t.created_at
                    )}
                  </td>
                  <td className="p-4 text-right">
                     <div className="flex justify-end gap-2">
                         <Link href={`/dashboard/library/${t.id}`}>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                         </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                           <a href={`https://youtu.be/${t.video_id}`} target="_blank" rel="noopener noreferrer">
                               <ExternalLink className="h-4 w-4" />
                           </a>
                        </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-destructive/10"
                            onClick={() => onDelete(t.id)}
                          >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {transcripts.map((t) => (
            <Card key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} className={`bg-muted/20 border-border hover:border-border/80 transition-all group cursor-grab active:cursor-grabbing ${selectedIds.has(t.id) ? 'ring-2 ring-primary border-transparent' : ''} relative`}>
                <div 
                   className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity data-[checked=true]:opacity-100" 
                   data-checked={selectedIds.has(t.id)}
                >
                   <Checkbox 
                     checked={selectedIds.has(t.id)}
                     onCheckedChange={() => toggleSelect(t.id)}
                     className="bg-background/80 border-foreground/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                   />
                </div>

                {t.thumbnail_url && (
                <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-background relative">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src={t.thumbnail_url} 
                        alt={t.title} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute bottom-2 right-2 bg-background/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground">
                        {t.duration ? formatDuration(t.duration) : '00:00'}
                    </div>
                </div>
                )}
                <CardHeader className="p-4 pb-2">
                   <CardTitle className="text-base font-medium line-clamp-1 text-foreground flex items-center gap-1.5" title={t.title}>
                     <Link href={`/dashboard/library/${t.id}`} className="hover:underline flex-1 truncate">
                       {t.title || `Video ${t.video_id}`}
                     </Link>
                     <TooltipProvider delayDuration={200}>
                       {isNew(t) && (
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Badge
                               variant="secondary"
                               className="h-4 px-1 text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20 shrink-0 cursor-pointer hover:bg-green-500/20 transition-colors"
                               onClick={(e) => handleMarkAsRead(t.id, e)}
                             >
                               NEW
                             </Badge>
                           </TooltipTrigger>
                           <TooltipContent>Click to mark as read</TooltipContent>
                         </Tooltip>
                       )}
                     </TooltipProvider>
                   </CardTitle>
                 <CardDescription className="text-xs text-muted-foreground mt-1">
                   {buildMetaLine(t)}
                 </CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-2 flex justify-end gap-2 border-t border-border/10 bg-muted/10">
                <Link href={`/dashboard/library/${t.id}`} className="flex-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs bg-muted/20 hover:bg-muted/40 text-foreground w-full"
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                    </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                    <a href={`https://youtu.be/${t.video_id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-destructive/10"
                    onClick={() => onDelete(t.id)}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

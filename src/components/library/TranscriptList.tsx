"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Trash2, 
  ExternalLink, 
  FileText, 
  Calendar, 
  Eye, 
  Loader2, 
  Download, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  thumbnail_url?: string;
  duration?: number;
  character_count?: number;
}

interface TranscriptListProps {
  transcripts: Transcript[];
  onDelete: (id: string) => void;
  viewMode: 'grid' | 'list';
}

export function TranscriptList({ transcripts, onDelete, viewMode }: TranscriptListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const supabase = createClient();

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
      
      data.forEach((item: any) => {
        const safeTitle = (item.title || `video-${item.video_id}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const videoUrl = `https://www.youtube.com/watch?v=${item.video_id}`;
        
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
           fileContent = generateCsv(item.transcript, item.title, videoUrl);
           extension = "csv";
        } else {
           // Default to TXT (with timestamps for now for batch, could add option later)
           // For now, let's export TXT with timestamps as the standard "Text" export
           fileContent = generateTxt(item.transcript, item.title, videoUrl, true);
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
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
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
              
              <div className="h-6 w-px bg-zinc-800" />
              
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

              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/50" onClick={handleBatchDelete}>
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
                <tr key={t.id} className={`group hover:bg-muted/30 transition-colors ${selectedIds.has(t.id) ? 'bg-muted/40' : ''}`}>
                  <td className="p-4">
                     <Checkbox 
                       checked={selectedIds.has(t.id)}
                       onCheckedChange={() => toggleSelect(t.id)}
                     />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {t.thumbnail_url && (
                          <div className="h-10 w-16 bg-zinc-800 rounded overflow-hidden shrink-0 relative">
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={t.thumbnail_url} alt="" className="object-cover w-full h-full" />
                          </div>
                      )}
                      <div>
                          <Link href={`/dashboard/library/${t.id}`} className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
                            {t.title || `Video ${t.video_id}`}
                          </Link>
                          <div className="text-xs text-muted-foreground line-clamp-1">{t.character_count ? Math.round(t.character_count / 1024) + ' KB' : 'Unknown size'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                     {t.duration ? formatDuration(t.duration) : '-'}
                  </td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">
                    {getRelativeTime(t.created_at)}
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
                          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
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
            <Card key={t.id} className={`bg-muted/30 border-border hover:border-zinc-700 transition-all group cursor-pointer ${selectedIds.has(t.id) ? 'ring-2 ring-primary border-transparent' : ''} relative`}>
                <div 
                   className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity data-[checked=true]:opacity-100" 
                   data-checked={selectedIds.has(t.id)}
                >
                   <Checkbox 
                     checked={selectedIds.has(t.id)}
                     onCheckedChange={() => toggleSelect(t.id)}
                     className="bg-black/80 border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
                    <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground">
                        {t.duration ? formatDuration(t.duration) : '00:00'}
                    </div>
                </div>
                )}
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-medium line-clamp-1 text-foreground" title={t.title}>
                  <Link href={`/dashboard/library/${t.id}`} className="hover:underline">
                    {t.title || `Video ${t.video_id}`}
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs flex items-center justify-between mt-1">
                    <span className="flex items-center gap-1">
                         <Calendar className="h-3 w-3" />
                         {new Date(t.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {t.character_count ? (t.character_count / 1000).toFixed(1) + 'k chars' : '-'}
                    </span>
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-2 flex justify-end gap-2 border-t border-white/5 bg-white/5">
                <Link href={`/dashboard/library/${t.id}`} className="flex-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs bg-white/5 hover:bg-white/10 text-foreground w-full"
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
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
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

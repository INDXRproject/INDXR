"use client";

import { useState } from "react";
import { 
  Download, 
  Copy, 
  Trash2, 
  ArrowLeft, 
  Type, 
  Video, 
  VideoOff 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { 
  generateTxt, 
  generateSrt, 
  generateVtt, 
  generateCsv,
  TranscriptItem 
} from "@/utils/formatTranscript";

interface TranscriptViewerProps {
  id: string; // Database ID for deletion/actions
  transcript: TranscriptItem[];
  title: string;
  videoUrl: string;
  channelTitle?: string;
  thumbnailUrl?: string;
}

export function TranscriptViewer({ 
  id,
  transcript, 
  title, 
  videoUrl, 
  channelTitle 
}: TranscriptViewerProps) {
  const router = useRouter();
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVideo, setShowVideo] = useState(false); // Default to HIDDEN

  // --- Helper Functions ---
  const formatUITimestamp = (seconds: number) => {
    return new Date(seconds * 1000).toISOString().substr(11, 8);
  };

  const getEmbedUrl = (url: string) => {
    try {
      if (!url) return "";
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = url.includes("v=") 
          ? url.split("v=")[1].split("&")[0]
          : url.split("/").pop();
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {
      console.error("Error parsing video URL", e);
    }
    return url;
  };

  // --- Download Logic ---

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = (format: 'txt' | 'json' | 'srt' | 'vtt' | 'csv') => {
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    try {
      if (format === 'txt') {
        const content = generateTxt(transcript, title, videoUrl, showTimestamps);
        downloadFile(content, `${safeTitle}.txt`, 'text/plain');
      } else if (format === 'json') {
        const content = JSON.stringify({ 
             metadata: { title, videoUrl, extractedAt: new Date().toISOString() }, 
             transcript 
        }, null, 2);
        downloadFile(content, `${safeTitle}.json`, 'application/json');
      } else if (format === 'csv') {
        const content = generateCsv(transcript, title, videoUrl);
        downloadFile(content, `${safeTitle}.csv`, 'text/csv');
      } else if (format === 'srt') {
        const content = generateSrt(transcript, title, videoUrl);
        downloadFile(content, `${safeTitle}.srt`, 'text/plain');
      } else if (format === 'vtt') {
         const content = generateVtt(transcript, title, videoUrl);
         downloadFile(content, `${safeTitle}.vtt`, 'text/vtt');
      }
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to download ${format.toUpperCase()}`);
    }
  };
  
  const handleCopy = () => {
    const content = generateTxt(transcript, title, videoUrl, showTimestamps);
    navigator.clipboard.writeText(content);
    toast.success("Transcript copied to clipboard");
  };

  const handleDelete = async () => {
     if (!confirm("Are you sure you want to delete this transcript?")) return;
     
     setIsDeleting(true);
     const supabase = createClient();
     const { error } = await supabase.from('transcripts').delete().eq('id', id);
     
     if (error) {
       toast.error("Failed to delete transcript");
       setIsDeleting(false);
     } else {
       toast.success("Transcript deleted");
       router.push("/dashboard/library");
     }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row overflow-hidden bg-background">
      
      {/* SIDEBAR (Video & Meta) */}
      <div 
        className={cn(
           "border-r bg-muted/10 shrink-0 transition-all duration-300 ease-in-out flex flex-col",
           showVideo ? "w-full lg:w-[400px] xl:w-[480px]" : "w-0 lg:w-0 border-r-0 pointer-events-none lg:pointer-events-auto" 
        )}
        style={{ overflow: 'hidden' }}
      >
        <div className="w-screen lg:w-[400px] xl:w-[480px] flex flex-col h-full"> {/* Force fixed width to prevent squishing during transition */}
            <div className="p-4 border-b flex items-center gap-2">
            <Link href="/dashboard/library">
                <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="font-semibold text-sm truncate flex-1">{title}</h1>
            <Button variant="ghost" size="sm" onClick={() => setShowVideo(false)}>
                <VideoOff className="h-4 w-4" />
            </Button>
            </div>

            <div className="aspect-video w-full bg-black shrink-0">
               {showVideo && (
                <iframe 
                    src={getEmbedUrl(videoUrl)} 
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
               )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    <div>
                        <h3 className="font-medium text-lg leading-tight mb-1">{title}</h3>
                        {channelTitle && <p className="text-sm text-muted-foreground">{channelTitle}</p>}
                    </div>

                    <div className="space-y-4 pt-2">
                        <Label>Reader Settings</Label>
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                                <Type className="h-3 w-3" /> Font Size
                            </Label>
                            <span className="text-xs text-muted-foreground">{fontSize}px</span>
                        </div>
                        <Slider 
                            value={[fontSize]} 
                            min={12} 
                            max={24} 
                            step={1} 
                            onValueChange={(vals) => setFontSize(vals[0])} 
                        />
                    </div>
                </div>
            </ScrollArea>
        </div>
      </div>

      {/* RIGHT: Transcript Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
        {/* Sticky Header */}
        <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur z-10">
           <div className="flex items-center gap-4">
             {!showVideo && (
                 <div className="flex items-center gap-2 mr-4">
                     <Link href="/dashboard/library">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                     </Link>
                     <Button variant="outline" size="sm" onClick={() => setShowVideo(true)} className="gap-2 h-8">
                         <Video className="h-4 w-4" />
                         <span className="hidden sm:inline">Show Video</span>
                     </Button>
                 </div>
             )}
             
             <div className="flex items-center space-x-2 border-l pl-4">
                <Switch id="ts-mode" checked={showTimestamps} onCheckedChange={setShowTimestamps} />
                <Label htmlFor="ts-mode" className="text-sm font-medium">Timestamps</Label>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
               <Copy className="mr-2 h-3.5 w-3.5" /> Copy
             </Button>

             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export As...</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleDownload('txt')}>Text File (.txt)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('json')}>JSON (.json)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('csv')}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownload('srt')}>SRT Subtitles</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('vtt')}>VTT Subtitles</DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem className="text-destructive" onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Transcript
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 w-full overflow-hidden">
            <ScrollArea className="h-full w-full">
            <div 
                className="max-w-3xl mx-auto space-y-4 p-6 lg:p-12 pb-20 transition-all font-sans" 
                style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
            >
                {transcript.map((item, idx) => (
                    <div key={idx} className={`group flex gap-4 ${!showTimestamps ? 'inline' : ''}`}>
                    {showTimestamps && (
                        <span className="text-muted-foreground font-mono text-xs w-16 shrink-0 pt-1 select-none opacity-50 group-hover:opacity-100 transition-opacity">
                        {formatUITimestamp(item.offset)}
                        </span>
                    )}
                    <span className={`${!showTimestamps ? 'inline' : 'block'} text-foreground/90`}>
                        {item.text}{!showTimestamps && " "}
                    </span>
                    </div>
                ))}
            </div>
            </ScrollArea>
        </div>
      </div>

    </div>
  );
}

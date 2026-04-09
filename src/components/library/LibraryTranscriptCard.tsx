"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Download, Trash2, FileText, Play } from "lucide-react"
import { format } from "date-fns"

export interface Transcript {
  id: string
  title: string
  created_at: string
  thumbnail_url?: string | null
  duration?: number
  character_count?: number
  video_id: string
  is_favorite?: boolean
}

interface TranscriptCardProps {
  transcript: Transcript
  onDelete: (id: string) => void
  onExport: (transcript: Transcript) => void
}

export function LibraryTranscriptCard({ transcript, onDelete, onExport }: TranscriptCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch {
      return dateString
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ""
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer bg-muted/40 border-border">
      
      {/* Thumbnail section */}
      <div className="aspect-video relative bg-card overflow-hidden">
        {transcript.thumbnail_url ? (
          <img 
            src={transcript.thumbnail_url} 
            alt={transcript.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-zinc-800/50">
            <FileText className="size-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
             <div className="p-3 bg-white/20 rounded-full border border-white/30">
                <Play className="size-6 text-foreground fill-white" />
             </div>
        </div>

        {/* Duration badge */}
        {transcript.duration ? (
          <Badge className="absolute bottom-2 right-2 bg-black/80 text-foreground border-0 font-mono text-xs hover:bg-black/80">
            {formatDuration(transcript.duration)}
          </Badge>
        ) : null}
      </div>
      
      {/* Card content */}
      <CardContent className="p-4 sm:p-5 space-y-3">
        
        {/* Title */}
        <h3 className="font-semibold text-base sm:text-lg line-clamp-2 text-foreground group-hover:text-primary transition-colors h-14" title={transcript.title}>
          {transcript.title}
        </h3>
        
        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Calendar className="size-3.5 sm:size-4" />
          <span>{formatDate(transcript.created_at)}</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 hover:bg-primary hover:text-primary-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onExport(transcript);
            }}
          >
            <Download className="size-3.5 sm:size-4 mr-2" />
            Export
          </Button>
          
          <Button 
            size="sm"
            variant="ghost"
            className="h-9 w-9 px-0 text-muted-foreground hover:text-[var(--color-error)] hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(transcript.id);
            }}
          >
            <Trash2 className="size-3.5 sm:size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, LayoutGrid, List as ListIcon, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { TranscriptList, Transcript } from "@/components/library/TranscriptList"
import { StorageMeter } from "@/components/library/StorageMeter"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

// 100MB limit for free users (example)
const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024

export default function LibraryPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  
  const supabase = createClient()

  useEffect(() => {
    fetchTranscripts()
  }, [])

  const fetchTranscripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setTranscripts(data || [])
    } catch (error) {
      console.error('Error fetching transcripts:', error)
      toast.error('Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTranscripts(prev => prev.filter(t => t.id !== id))
      toast.success('Transcript deleted')
    } catch (error) {
      console.error('Error deleting transcript:', error)
      toast.error('Failed to delete transcript')
    }
  }

  // Filter transcripts based on search query
  const filteredTranscripts = transcripts.filter(t => 
    (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    t.video_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate storage usage (sum of character_count approx or specific file_size if we had it)
  // Using character_count as bytes proxy (1 char ~= 1 byte for now)
  const usedBytes = transcripts.reduce((acc, t) => acc + (t.character_count || 0), 0)

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Library</h1>
                <p className="text-muted-foreground">Manage your saved transcripts and playlists.</p>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="relative w-full md:w-64">
                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                        <Search className="h-4 w-4" />
                    </div>
                     <Input 
                        placeholder="Search transcripts..." 
                        className="pl-9 bg-background border-input text-foreground h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                 </div>
                 <div className="flex items-center border border-border rounded-lg p-1 bg-background">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 rounded ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 rounded ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setViewMode('list')}
                    >
                        <ListIcon className="h-4 w-4" />
                    </Button>
                 </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <TranscriptList 
                        transcripts={filteredTranscripts} 
                        onDelete={handleDelete}
                        viewMode={viewMode}
                    />
                )}
            </div>
            
            <div className="lg:col-span-1 space-y-6">
                <StorageMeter usedBytes={usedBytes} totalBytes={STORAGE_LIMIT_BYTES} />
                
                {/* Future: Filters or Tags could go here */}
                <div className="p-4 rounded-xl border border-border bg-card">
                    <h3 className="font-medium text-foreground mb-2">Quick Stats</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Total Files</span>
                            <span className="text-foreground">{transcripts.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>This Month</span>
                            <span className="text-foreground">
                                {transcripts.filter(t => {
                                    const d = new Date(t.created_at)
                                    const now = new Date()
                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                                }).length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let transcriptCount = 0
  let totalMinutes = 0
  
  if (user) {
      const { data, error } = await supabase
        .from('transcripts')
        .select('duration')
        .eq('user_id', user.id)
        
      if (data && !error) {
          transcriptCount = data.length
          // duration is in seconds
          const totalSeconds = data.reduce((acc, curr) => acc + (curr.duration || 0), 0)
          totalMinutes = Math.round(totalSeconds / 60)
      }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <Link href="/dashboard/transcribe">
            <Button>
                <Plus className="mr-2 h-4 w-4" /> New Transcription
            </Button>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{transcriptCount}</div>
            <p className="text-xs text-muted-foreground">Saved in your library</p>
          </CardContent>
        </Card>
         <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalMinutes}m</div>
            <p className="text-xs text-muted-foreground">Video content processed</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
             {/* We could fetch recent logs here later */}
            <div className="text-muted-foreground text-sm">Check the Library for your recent transcripts.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

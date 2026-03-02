"use client"


import { Database } from "lucide-react"

interface StorageMeterProps {
  usedBytes: number
  totalBytes: number
}

export function StorageMeter({ usedBytes, totalBytes }: StorageMeterProps) {
  // Convert bytes to MB for display
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2)
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(0)
  const percentage = Math.min(100, (usedBytes / totalBytes) * 100)

  return (
    <div className="p-4 rounded-xl border border-border bg-muted/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">Storage Usage</span>
        </div>
        <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
      </div>
      
      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div 
            className="h-full bg-white transition-all duration-500 ease-in-out" 
            style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-foreground font-medium">{usedMB} MB</span>
        <span className="text-muted-foreground">{totalMB} MB Limit</span>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  Home, Library, Mic, CreditCard, Settings, User, LogOut,
  ChevronRight, Plus, Folder, FolderOpen, Pencil, Check, X, Trash2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { UserAvatar } from "@/components/UserAvatar"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Collection {
  id: string
  name: string
  user_id: string
  created_at: string
}

interface SimplifiedTranscript {
  id: string
  collection_id: string | null
  character_count: number | null
}

const topNavItems = [
  { title: "Overview",   url: "/dashboard",           icon: Home },
  { title: "Transcribe", url: "/dashboard/transcribe", icon: Mic },
  { title: "Credits",    url: "/dashboard/billing",    icon: CreditCard },
]

const footerItems = [
  { title: "Account",  url: "/dashboard/account",  icon: User },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
]

export function AppSidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // ── Collections state ──────────────────────────────────────────────────────
  const [collections, setCollections]         = useState<Collection[]>([])
  const [transcripts, setTranscripts]         = useState<{id: string, collection_id: string | null, character_count: number | null}[]>([])
  const [libraryOpen, setLibraryOpen]         = useState(true)

  // Inline create
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Inline rename
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const editRef = useRef<HTMLInputElement>(null)

  // Delete confirm (inline)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Drag over
  const [dragOverId, setDragOverId] = useState<string | "all" | null>(null)

  // Active collection from URL
  const isLibraryPage = pathname === "/dashboard/library"

  // We read the search params via URL directly to avoid Suspense requirement
  const getSelectedId = useCallback((): string | null => {
    if (typeof window === "undefined") return null
    const params = new URLSearchParams(window.location.search)
    return params.get("collection")
  }, [])

  const navigateToCollection = useCallback((id: string | null) => {
    if (id) {
      router.push(`/dashboard/library?collection=${id}`)
    } else {
      router.push("/dashboard/library")
    }
  }, [router])

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [txRes, colRes] = await Promise.all([
      supabase.from("transcripts").select("id, collection_id, character_count").eq("user_id" as never, user.id as never),
      supabase.from("collections").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    ])

    if (colRes.data) setCollections(colRes.data as Collection[])
    if (txRes.data) setTranscripts(txRes.data as SimplifiedTranscript[])
  }

  useEffect(() => {
    fetchData()

    // Listen for cross-component refresh events (e.g. after extraction)
    const handleRefresh = () => fetchData()
    window.addEventListener("indxr-library-refresh", handleRefresh)
    window.addEventListener("transcripts-updated", handleRefresh)
    return () => {
      window.removeEventListener("indxr-library-refresh", handleRefresh)
      window.removeEventListener("transcripts-updated", handleRefresh)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived state
  const counts = transcripts.reduce((acc, t) => {
    if (t.collection_id) acc[t.collection_id] = (acc[t.collection_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const totalCharacters = transcripts.reduce((acc, t) => acc + (t.character_count || 0), 0)
  const usedKB = totalCharacters / 1024
  const usedMB = usedKB / 1024
  const MAX_MB = 10
  const storagePercentage = Math.min(100, Math.max(0, (usedMB / MAX_MB) * 100))

  // Auto-open library section when on library page
  useEffect(() => {
    if (isLibraryPage) setLibraryOpen(true)
  }, [isLibraryPage])

  // Focus rename input
  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from("collections").insert({ name, user_id: user.id }).select().single()
      if (error) throw error
      setCollections(prev => [...prev, data as Collection])
      setNewName("")
      setCreating(false)
      toast.success(`Collection "${name}" created`)
    } catch { toast.error("Failed to create collection") }
    finally { setIsSaving(false) }
  }

  const handleRenameStart = (col: Collection) => {
    setEditingId(col.id)
    setEditingName(col.name)
    setConfirmDeleteId(null)
  }

  const handleRenameSave = async () => {
    const name = editingName.trim()
    if (!name || !editingId) { setEditingId(null); return }
    if (name.length > 150) { toast.error("Name must be 150 characters or fewer"); return }
    const original = collections.find(c => c.id === editingId)?.name ?? ""
    if (name === original) { setEditingId(null); return }
    try {
      const { error } = await supabase
        .from("collections").update({ name }).eq("id", editingId)
      if (error) throw error
      setCollections(prev => prev.map(c => c.id === editingId ? { ...c, name } : c))
      // Dispatch so library/page.tsx re-fetches collections and refreshes the page title
      window.dispatchEvent(new CustomEvent("transcripts-updated"))
      toast.success("Renamed")
    } catch { toast.error("Rename failed") }
    finally { setEditingId(null) }
  }

  const handleDeleteConfirm = async (colId: string) => {
    setIsDeleting(true)
    try {
      // 1. Move all transcripts in this collection to "All Transcripts"
      const { error: moveError } = await supabase
        .from("transcripts")
        .update({ collection_id: null })
        .eq("collection_id", colId)
      if (moveError) throw moveError

      // 2. Delete the collection
      const { error: deleteError } = await supabase
        .from("collections")
        .delete()
        .eq("id", colId)
      if (deleteError) throw deleteError

      // 3. Update local state
      const col = collections.find(c => c.id === colId)
      setCollections(prev => prev.filter(c => c.id !== colId))
      setTranscripts(prev => prev.map(t => t.collection_id === colId ? { ...t, collection_id: null } : t))
      setConfirmDeleteId(null)

      // 4. If we were viewing this collection, navigate away
      if (getSelectedId() === colId) {
        router.push("/dashboard/library")
      }

      // 5. Notify library to re-fetch
      window.dispatchEvent(new CustomEvent("transcripts-updated"))
      toast.success(`"${col?.name}" deleted — transcripts moved to All Transcripts`)
    } catch {
      toast.error("Failed to delete collection")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDragOver = (e: React.DragEvent, id: string | "all") => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverId(id)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault()
    setDragOverId(null)
    const transcriptId = e.dataTransfer.getData("transcriptId") || e.dataTransfer.getData("text/plain")
    
    if (!transcriptId) {
      console.error("Drop failed: No transcriptId found in dataTransfer")
      return
    }

    console.log("Attempting to move transcript:", { transcriptId, targetId })

    const { data, error } = await supabase
      .from("transcripts").update({ collection_id: targetId }).eq("id", transcriptId).select()
    
    if (error) { 
      console.error("Supabase move error details:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details
      })
      toast.error("Failed to move transcript")
      return 
    }

    console.log("Supabase move success response:", data)
    
    // Update local transcripts array
    setTranscripts(prev => prev.map(t => t.id === transcriptId ? { ...t, collection_id: targetId } : t))
    
    // Notify library page to re-fetch
    window.dispatchEvent(new CustomEvent("transcripts-updated"))
    
    const colName = targetId
      ? (collections.find(c => c.id === targetId)?.name ?? "collection")
      : "All Transcripts"
    toast.success(`Moved to "${colName}"`)
  }

  const selectedId = getSelectedId()
  const dropHighlight = "ring-2 ring-primary ring-inset bg-primary/10"

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar variant="inset">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>

                {/* ── Top nav items ── */}
                {topNavItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* ── Library + Collections ── */}
                <SidebarMenuItem>
                  {/* Library row — click navigates, chevron expands */}
                  <div className="flex items-center w-full group/library">
                    <SidebarMenuButton
                      asChild
                      className="flex-1"
                    >
                      <Link href="/dashboard/library">
                        <Library />
                        <span>Library</span>
                      </Link>
                    </SidebarMenuButton>
                    <button
                      onClick={(e) => { e.preventDefault(); setLibraryOpen(o => !o) }}
                      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 mr-1 cursor-pointer"
                      aria-label={libraryOpen ? "Collapse library" : "Expand library"}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          libraryOpen && "rotate-90"
                        )}
                      />
                    </button>
                  </div>

                  {/* Collapsible sub-section */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      libraryOpen ? "opacity-100" : "max-h-0 opacity-0"
                    )}
                    style={libraryOpen ? { maxHeight: "40vh" } : { maxHeight: 0 }}
                  >
                    <div className="overflow-y-auto" style={{ maxHeight: "40vh" }}>
                      <div className="pl-4 py-1 space-y-0.5">

                        {/* All Transcripts */}
                        <button
                          onClick={() => navigateToCollection(null)}
                          onDragOver={(e) => handleDragOver(e, "all")}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={(e) => handleDrop(e, null)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                            isLibraryPage && !selectedId
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            dragOverId === "all" && dropHighlight
                          )}
                        >
                          <Library className="h-3 w-3 shrink-0" />
                          <span className="flex-1 text-left">All Transcripts</span>
                          <span className="tabular-nums opacity-60">{transcripts.length}</span>
                        </button>

                        {/* Per-collection */}
                        {collections.map(col => {
                          const isSelected = isLibraryPage && selectedId === col.id
                          const isDragging = dragOverId === col.id
                          const isEditing  = editingId === col.id
                          const isConfirmDelete = confirmDeleteId === col.id

                          return (
                            <div key={col.id} className="space-y-0">
                              {/* Collection row */}
                              <div
                                className={cn(
                                  "group/col flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors",
                                  isSelected
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                  isDragging && dropHighlight
                                )}
                                onDragOver={(e) => handleDragOver(e, col.id)}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={(e) => handleDrop(e, col.id)}
                              >
                                {isSelected
                                  ? <FolderOpen className="h-3 w-3 shrink-0" />
                                  : <Folder className="h-3 w-3 shrink-0" />
                                }

                                {isEditing ? (
                                  /* ── Inline rename input ── */
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <input
                                        ref={editRef}
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value.slice(0, 150))}
                                        onBlur={handleRenameSave}
                                        onKeyDown={e => {
                                          if (e.key === "Enter") { e.currentTarget.blur() }
                                          if (e.key === "Escape") { setEditingId(null) }
                                        }}
                                        className="w-full bg-transparent border-b border-border outline-none text-xs text-foreground"
                                        maxLength={150}
                                      />
                                      {editingName.length > 120 && (
                                        <span className={`text-[10px] ${editingName.length >= 150 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                          {editingName.length}/150
                                        </span>
                                      )}
                                    </div>
                                    <button onClick={handleRenameSave} className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                                      <Check className="h-2.5 w-2.5" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </>
                                ) : (
                                  /* ── Normal row ── */
                                  <>
                                    <button
                                      className="flex-1 text-left truncate cursor-pointer"
                                      onClick={() => navigateToCollection(col.id)}
                                    >
                                      {col.name}
                                    </button>
                                    <span className="tabular-nums opacity-60 shrink-0">{counts[col.id] ?? 0}</span>
                                    {/* Action icons — only visible on hover */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRenameStart(col) }}
                                      className="h-4 w-4 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                      title="Rename"
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(isConfirmDelete ? null : col.id); setEditingId(null) }}
                                      className="h-4 w-4 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0 cursor-pointer"
                                      title="Delete collection"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Inline delete confirmation */}
                              {isConfirmDelete && (
                                <div className="mx-2 mb-1 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs">
                                  <p className="text-foreground mb-2 leading-snug">
                                    Delete <span className="font-medium">&ldquo;{col.name}&rdquo;</span>?{" "}
                                    <span className="text-muted-foreground">Transcripts will be moved to All Transcripts.</span>
                                  </p>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="flex-1 py-1 rounded text-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleDeleteConfirm(col.id)}
                                      disabled={isDeleting}
                                      className="flex-1 py-1 rounded text-center bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {isDeleting ? "…" : "Delete"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* + New Collection */}
                        {creating ? (
                          <div className="px-2 py-1.5 space-y-1.5">
                            <Input
                              autoFocus
                              placeholder="Collection name…"
                              value={newName}
                              onChange={e => setNewName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleCreate()
                                if (e.key === "Escape") { setCreating(false); setNewName("") }
                              }}
                              className="h-6 text-xs px-2"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1 px-2" onClick={handleCreate} disabled={isSaving || !newName.trim()}>
                                {isSaving ? "…" : "Create"}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setCreating(false); setNewName("") }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCreating(true)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>New Collection</span>
                          </button>
                        )}

                      </div>
                    </div>
                  </div>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {/* Transcript stats — StorageMeter */}
          <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-4 mt-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-foreground">Storage</span>
              <span className="text-[10px] text-muted-foreground">{usedMB > 0.1 ? usedMB.toFixed(1) + ' MB' : usedKB.toFixed(0) + ' KB'} / {MAX_MB} MB</span>
            </div>
            <Progress 
              value={storagePercentage} 
              className={cn("h-1.5", storagePercentage > 80 && "bg-destructive/20")}
            />
            <p className="text-[10px] text-muted-foreground">
              {transcripts.length} transcript{transcripts.length !== 1 ? "s" : ""} saved
            </p>
          </div>

          <SidebarMenu>
            {footerItems.map(item => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    {item.title === "Account" ? <UserAvatar className="h-4 w-4 text-[10px]" /> : <item.icon />}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

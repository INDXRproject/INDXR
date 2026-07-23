"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { marketingHref } from "@indxr/shared/lib/cross-host-links"
import Link from "next/link"
import {
  Home, Library, AudioLines, Inbox, BookOpen, Settings, User, LogOut,
  ChevronRight, Plus, Folder, FolderOpen, Pencil, Check, X, Trash2,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import { useUnreadMessages } from "../hooks/useUnreadMessages"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@indxr/shared/components/ui/sidebar"
import {
  TooltipProvider,
} from "@indxr/shared/components/ui/tooltip"
import { Input } from "@indxr/shared/components/ui/input"
import { Button } from "@indxr/shared/components/ui/button"
import { createClient } from "@indxr/shared/utils/supabase/client"
import { UserAvatar } from "@indxr/shared/components/UserAvatar"
import { Progress } from "@indxr/shared/components/ui/progress"
import { cn } from "@indxr/shared/lib/utils"

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
  { title: "Home",      url: "/dashboard",            icon: Home      },
  { title: "Transcribe", url: "/dashboard/transcribe", icon: AudioLines },
  { title: "Messages",  url: "/dashboard/messages",   icon: Inbox     },
]

const footerItems = [
  { title: "Account",  url: "/dashboard/account",  icon: User },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
]

export function AppSidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const hasUnreadMessages = useUnreadMessages()

  // ── Collections state ──────────────────────────────────────────────────────
  const [collections, setCollections]         = useState<Collection[]>([])
  const [transcripts, setTranscripts]         = useState<{id: string, collection_id: string | null, character_count: number | null}[]>([])
  const [libraryOpen, setLibraryOpen]         = useState(() => !!pathname?.startsWith('/dashboard/library'))

  // ── Collapsible sidebar state ──────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed")
      return saved === "true"
    }
    return false
  })

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

  // Compact feedback banner above collection list
  const [sidebarFeedback, setSidebarFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  // Pending navigation — set when user tries to navigate during active extraction
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null)

  // Active collection from URL
  const isLibraryPage = pathname === "/dashboard/library"

  // We read the search params via URL directly to avoid Suspense requirement
  const getSelectedId = useCallback((): string | null => {
    if (typeof window === "undefined") return null
    const params = new URLSearchParams(window.location.search)
    return params.get("collection")
  }, [])

  // Guard client-side navigation while a playlist job is active.
  // Sets pendingNavHref to show the inline confirmation card instead of navigating.
  const guardedNavigate = (href: string) => {
    const activeJob = sessionStorage.getItem('indxr-active-playlist-job')
    if (!activeJob) {
      router.push(href)
      return
    }
    setPendingNavHref(href)
  }

  const navigateToCollection = useCallback((id: string | null) => {
    const href = id ? `/dashboard/library?collection=${id}` : "/dashboard/library"
    guardedNavigate(href)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [txRes, colRes] = await Promise.all([
      supabase.from("transcripts").select("id, collection_id, character_count").eq("user_id" as never, user.id as never),
      supabase.from("collections").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
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
  const MAX_MB = 500
  const storagePercentage = Math.min(100, Math.max(0, (usedMB / MAX_MB) * 100))

  // Auto-open library section when on library page
  useEffect(() => {
    if (isLibraryPage) setLibraryOpen(true)
  }, [isLibraryPage])

  // Focus rename input
  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  // Save collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", collapsed.toString())
    }
  }, [collapsed])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleCollapse = () => {
    setCollapsed(!collapsed)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = marketingHref('/login')
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
      setSidebarFeedback({ type: 'success', message: `Collection "${name}" created` })
    } catch { setSidebarFeedback({ type: 'error', message: 'Failed to create collection' }) }
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
    if (name.length > 150) { setSidebarFeedback({ type: 'error', message: 'Name must be 150 characters or fewer' }); return }
    const original = collections.find(c => c.id === editingId)?.name ?? ""
    if (name === original) { setEditingId(null); return }
    try {
      const { error } = await supabase
        .from("collections").update({ name }).eq("id", editingId)
      if (error) throw error
      setCollections(prev => prev.map(c => c.id === editingId ? { ...c, name } : c))
      window.dispatchEvent(new CustomEvent("transcripts-updated"))
      setSidebarFeedback({ type: 'success', message: 'Renamed' })
    } catch { setSidebarFeedback({ type: 'error', message: 'Rename failed' }) }
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

      if (getSelectedId() === colId) {
        router.push("/dashboard/library")
      }

      window.dispatchEvent(new CustomEvent("transcripts-updated"))
      setSidebarFeedback({ type: 'success', message: `"${col?.name}" deleted — transcripts moved to All Transcripts` })
    } catch {
      setSidebarFeedback({ type: 'error', message: 'Failed to delete collection' })
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

    const { data, error } = await supabase
      .from("transcripts").update({ collection_id: targetId }).eq("id", transcriptId).select()
    
    if (error) {
      console.error("Supabase move error details:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details
      })
      setSidebarFeedback({ type: 'error', message: 'Failed to move transcript' })
      return
    }

    setTranscripts(prev => prev.map(t => t.id === transcriptId ? { ...t, collection_id: targetId } : t))
    window.dispatchEvent(new CustomEvent("transcripts-updated"))

    const colName = targetId
      ? (collections.find(c => c.id === targetId)?.name ?? "collection")
      : "All Transcripts"
    setSidebarFeedback({ type: 'success', message: `Moved to "${colName}"` })
  }

  const selectedId = getSelectedId()
  const dropHighlight = "ring-2 ring-accent ring-inset bg-accent/10"

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="none" className={cn("h-full border-r", collapsed ? "w-14" : "w-64")}>
        <SidebarContent>
          {/* Collapse toggle button — desktop only; mobile uses SidebarTrigger in AppTopbar */}
          <div className="hidden md:block px-3 py-2 border-b border-border/50">
            <button
              onClick={handleToggleCollapse}
              className="h-8 w-8 flex items-center justify-center rounded text-fg-muted hover:text-fg hover:bg-surface-elevated transition-colors cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <SidebarGroup className="flex-1 min-h-0">
            <SidebarGroupContent className="flex-1 min-h-0 flex flex-col">
              <SidebarMenu className="flex-1 min-h-0">

                {/* ── Top nav items ── */}
                {topNavItems.map(item => {
                  const isActive = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a 
                          href={item.url} 
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150",
                            isActive 
                              ? "bg-accent-subtle text-accent [&_svg]:text-accent" 
                              : "text-fg-subtle [&_svg]:text-fg-muted hover:bg-surface-elevated hover:text-fg",
                            collapsed && "justify-center"
                          )}
                          title={collapsed ? item.title : undefined}
                        >
                          <div className="relative shrink-0">
                            <item.icon className="h-4 w-4" />
                            {item.title === "Messages" && hasUnreadMessages && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
                            )}
                          </div>
                          <span className={cn(collapsed && "hidden")}>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* ── Library + Collections ── */}
                <SidebarMenuItem className="flex-1 min-h-0 flex flex-col">
                  {/* Library row — click navigates, chevron expands */}
                  <div className="flex items-center w-full group/library">
                    <SidebarMenuButton
                      asChild
                      className="flex-1"
                    >
                      <Link
                        href="/dashboard/library"
                        onClick={(e) => {
                          if (sessionStorage.getItem('indxr-active-playlist-job')) {
                            e.preventDefault()
                            guardedNavigate('/dashboard/library')
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150",
                          pathname === "/dashboard/library" || pathname?.startsWith("/dashboard/library/")
                            ? "bg-accent-subtle text-accent [&_svg]:text-accent" 
                            : "text-fg-subtle [&_svg]:text-fg-muted hover:bg-surface-elevated hover:text-fg",
                          collapsed && "justify-center"
                        )}
                        title={collapsed ? "Library" : undefined}
                      >
                        <Library className="h-4 w-4" />
                        <span className={cn(collapsed && "hidden")}>Library</span>
                      </Link>
                    </SidebarMenuButton>
                    {!collapsed && (
                      <button
                        onClick={(e) => { e.preventDefault(); setLibraryOpen(o => !o) }}
                        className="h-6 w-6 flex items-center justify-center rounded text-fg-muted hover:text-fg hover:bg-surface-elevated transition-colors shrink-0 mr-1 cursor-pointer"
                        aria-label={libraryOpen ? "Collapse library" : "Expand library"}
                      >
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            libraryOpen && "rotate-90"
                          )}
                        />
                      </button>
                    )}
                  </div>

                  {/* Collapsible sub-section - hidden when sidebar is collapsed */}
                  {!collapsed && (
                    <div
                      className={cn(
                        "flex flex-col overflow-hidden transition-all duration-200",
                        libraryOpen ? "flex-1 min-h-0 opacity-100 mt-0.5" : "flex-none max-h-0 opacity-0"
                      )}
                    >
                      {/* Scroll region — fills the available space, scrolls only when it truly overflows */}
                      <div className="overflow-y-auto min-h-0 flex-1">
                        <div className="pl-12 py-1 space-y-0.5">

                        {sidebarFeedback && (
                          <div className={cn(
                            "mx-2 mb-1 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[10px] leading-snug",
                            sidebarFeedback.type === 'error'
                              ? "bg-error/10 border-error/20 text-error"
                              : "bg-success/10 border-success/20 text-success"
                          )}>
                            <span className="flex-1">{sidebarFeedback.message}</span>
                            <button onClick={() => setSidebarFeedback(null)} className="opacity-60 hover:opacity-100 shrink-0 cursor-pointer">✕</button>
                          </div>
                        )}

                        {/* All Transcripts */}
                        <button
                          onClick={() => navigateToCollection(null)}
                          onDragOver={(e) => handleDragOver(e, "all")}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={(e) => handleDrop(e, null)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                            isLibraryPage && !selectedId
                              ? "bg-accent-subtle text-accent font-medium"
                              : "text-fg-muted hover:text-fg hover:bg-accent/50",
                            dragOverId === "all" && dropHighlight
                          )}
                        >
                          <BookOpen className="h-3 w-3 shrink-0" />
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
                                    ? "bg-accent-subtle text-accent font-medium"
                                    : "text-fg-muted hover:text-fg hover:bg-accent/50",
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
                                        className="w-full bg-transparent border-b border-border outline-none text-xs text-fg"
                                        maxLength={150}
                                      />
                                      {editingName.length > 120 && (
                                        <span className={`text-[10px] ${editingName.length >= 150 ? 'text-error' : 'text-fg-muted'}`}>
                                          {editingName.length}/150
                                        </span>
                                      )}
                                    </div>
                                    <button onClick={handleRenameSave} className="h-4 w-4 flex items-center justify-center text-fg-muted hover:text-fg cursor-pointer shrink-0">
                                      <Check className="h-2.5 w-2.5" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="h-4 w-4 flex items-center justify-center text-fg-muted hover:text-fg cursor-pointer shrink-0">
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
                                      className="h-4 w-4 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity text-fg-muted hover:text-fg shrink-0 cursor-pointer"
                                      title="Rename"
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(isConfirmDelete ? null : col.id); setEditingId(null) }}
                                      className="h-4 w-4 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity text-fg-muted hover:text-fg shrink-0 cursor-pointer"
                                      title="Delete collection"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Inline delete confirmation */}
                              {isConfirmDelete && (
                                <div className="mx-2 mb-1 p-2 rounded-md bg-error/10 border border-error/20 text-xs">
                                  <p className="text-fg mb-2 leading-snug">
                                    Delete <span className="font-medium">&ldquo;{col.name}&rdquo;</span>?{" "}
                                    <span className="text-fg-muted">Transcripts will be moved to All Transcripts.</span>
                                  </p>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="flex-1 py-1 rounded text-center text-fg-muted hover:text-fg hover:bg-surface-elevated/50 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleDeleteConfirm(col.id)}
                                      disabled={isDeleting}
                                      className="flex-1 py-1 rounded text-center bg-error text-error-foreground hover:bg-error/80 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {isDeleting ? "…" : "Delete"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        </div>
                      </div>

                      {/* + New Collection — pinned below the scroll area, always visible */}
                      <div className="pl-12 pt-1 pb-1 shrink-0 border-t border-border/30 mt-1">
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
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-fg-muted hover:text-fg hover:bg-accent/50 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>New Collection</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {/* Nav guard — inline confirmation card when user tries to leave during active extraction */}
          {pendingNavHref && (
            <div className="mx-3 mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-semibold text-fg mb-1">Are you sure you want to leave?</p>
              <p className="text-[11px] text-fg-muted mb-3 leading-snug">
                Your extraction will continue in the background, but leaving may cause unexpected behavior. We recommend staying on this page until extraction is complete.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => setPendingNavHref(null)}
                >
                  Stay on page
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs flex-1 text-fg-muted"
                  onClick={() => {
                    router.push(pendingNavHref)
                    setPendingNavHref(null)
                  }}
                >
                  Leave anyway
                </Button>
              </div>
            </div>
          )}

          <SidebarMenu className="border-t border-border/50 pt-1">
            {footerItems.map(item => {
              const isActive = pathname === item.url || (item.url === "/dashboard/account" && pathname?.startsWith("/dashboard/account"));
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a 
                      href={item.url} 
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150",
                        isActive 
                          ? "bg-accent-subtle text-accent [&_svg]:text-accent" 
                          : "text-fg-subtle [&_svg]:text-fg-muted hover:bg-surface-elevated hover:text-fg",
                        collapsed && "justify-center"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={cn(collapsed && "hidden")}>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150 w-full cursor-pointer",
                  "text-fg-subtle [&_svg]:text-fg-muted hover:bg-surface-elevated hover:text-fg",
                  collapsed && "justify-center"
                )}
                title={collapsed ? "Sign Out" : undefined}
              >
                <LogOut className="h-4 w-4" />
                <span className={cn(collapsed && "hidden")}>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

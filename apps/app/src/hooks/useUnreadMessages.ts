"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@indxr/shared/utils/supabase/client"

// Single HEAD COUNT query — no body data transferred.
// Refreshes when: (1) pathname changes, (2) "indxr-messages-read" event fires.
export function useUnreadMessages(): boolean {
  const [hasUnread, setHasUnread] = useState(false)
  const pathname = usePathname()
  const supabaseRef = useRef(createClient())

  const check = useCallback(async () => {
    const { count } = await supabaseRef.current
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .neq("sender_role", "user")
    setHasUnread((count ?? 0) > 0)
  }, [])

  // Re-check when user navigates (e.g. away from messages page after reading)
  useEffect(() => { check() }, [check, pathname])

  // Re-check when MessagesClient explicitly marks something as read
  useEffect(() => {
    window.addEventListener("indxr-messages-read", check)
    return () => window.removeEventListener("indxr-messages-read", check)
  }, [check])

  return hasUnread
}

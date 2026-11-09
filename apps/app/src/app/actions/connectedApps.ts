"use server"

import { createClient } from "@indxr/shared/utils/supabase/server"

// Connected apps (Gevonden 9-11 B6, ADR-108) — lists/revokes this user's own MCP OAuth connections
// against backend/oauth_server.py. The backend verifies the session token itself (supabase.auth.get_user),
// never trusts a claimed user_id — same pattern as the consent screen's approve/deny actions.

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

export type Connection = {
  client_id: string
  name: string
  redirect_host: string
  connected_at: string
  last_used_at: string | null
}

export async function listConnectedApps(): Promise<Connection[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const res = await fetch(`${PYTHON_BACKEND_URL}/oauth/connections`, {
    headers: {
      "X-Backend-Secret": process.env.BACKEND_API_SECRET || "",
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  return data?.connections ?? []
}

export async function disconnectApp(clientId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false }

  const res = await fetch(`${PYTHON_BACKEND_URL}/oauth/connections/${encodeURIComponent(clientId)}/disconnect`, {
    method: "POST",
    headers: {
      "X-Backend-Secret": process.env.BACKEND_API_SECRET || "",
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  })
  return { success: res.ok }
}

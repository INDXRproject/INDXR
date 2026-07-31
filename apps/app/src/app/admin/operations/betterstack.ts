// Server-side BetterStack Uptime status for the Operations dashboard (option B).
// Reads BETTERSTACK_API_TOKEN (server env only — no NEXT_PUBLIC_ prefix, never reaches the browser).
// Env-gated + fully graceful: no token → { configured:false } (placeholder); API error/timeout →
// { configured:true, ok:false, error } — it must NEVER break the rest of the dashboard.

export type UptimeItem = {
  kind: "monitor" | "heartbeat"
  name: string
  url?: string
  status: string // up | down | pending | validating | paused | maintenance | unknown
  lastChecked?: string | null
}
export type UptimeStatus = { configured: boolean; ok: boolean; items: UptimeItem[]; error?: string }

const API = "https://uptime.betterstack.com/api/v2"

async function getJson(path: string, token: string): Promise<{ data?: unknown[] }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 5000) // never hang the admin page on a slow BetterStack
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store", // uptime is live — always fetch fresh
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
    return (await res.json()) as { data?: unknown[] }
  } finally {
    clearTimeout(t)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attrs(d: any): any {
  return (d && d.attributes) || {}
}

export async function fetchUptime(): Promise<UptimeStatus> {
  const token = process.env.BETTERSTACK_API_TOKEN
  if (!token) return { configured: false, ok: false, items: [] }
  try {
    // Monitors are required; heartbeats best-effort (a team may have none).
    const monitors = await getJson("/monitors", token)
    const items: UptimeItem[] = (monitors.data ?? []).map((d) => {
      const a = attrs(d)
      return {
        kind: "monitor" as const,
        name: a.pronounceable_name || a.url || "monitor",
        url: a.url,
        status: a.status || "unknown",
        lastChecked: a.last_checked_at ?? null,
      }
    })
    try {
      const hb = await getJson("/heartbeats", token)
      for (const d of hb.data ?? []) {
        const a = attrs(d)
        items.push({ kind: "heartbeat", name: a.name || "heartbeat", status: a.status || "unknown" })
      }
    } catch {
      /* heartbeats optional — ignore */
    }
    return { configured: true, ok: true, items }
  } catch (e) {
    return { configured: true, ok: false, items: [], error: e instanceof Error ? e.message : String(e) }
  }
}

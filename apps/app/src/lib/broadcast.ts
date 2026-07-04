import type { SupabaseClient } from "@supabase/supabase-js"

export type BroadcastTarget = "all" | "paid" | "free" | "manual"
export interface Recipient {
  id: string
  email: string | null
}

// Paginate through ALL auth users (listUsers is capped at perPage:1000, so a
// single call silently truncates once the base grows past 1000).
export async function listAllUsers(admin: SupabaseClient): Promise<Recipient[]> {
  const users: Recipient[] = []
  const perPage = 1000
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const batch = data?.users ?? []
    for (const u of batch) users.push({ id: u.id, email: u.email ?? null })
    if (batch.length < perPage) break
    page++
  }
  return users
}

// Paying users = distinct user_id in credit_transactions where type='credit'
// AND metadata->>stripe_session_id IS NOT NULL (same derivation as admin/paid-users).
export async function getPaidUserIds(admin: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await admin
    .from("credit_transactions")
    .select("user_id, metadata")
    .eq("type", "credit")
    .not("metadata->>stripe_session_id", "is", null)
  if (error) throw error
  const ids = new Set<string>()
  for (const tx of data ?? []) {
    if ((tx as { metadata?: { stripe_session_id?: string } }).metadata?.stripe_session_id) {
      ids.add((tx as { user_id: string }).user_id)
    }
  }
  return ids
}

// Resolve a target (+ optional manual id list) to the concrete recipient set.
export async function resolveRecipients(
  admin: SupabaseClient,
  target: BroadcastTarget,
  manualIds?: string[],
): Promise<Recipient[]> {
  const all = await listAllUsers(admin)
  if (target === "manual") {
    const set = new Set(manualIds ?? [])
    return all.filter((u) => set.has(u.id))
  }
  if (target === "all") return all
  const paid = await getPaidUserIds(admin)
  if (target === "paid") return all.filter((u) => paid.has(u.id))
  // "free" = the inverse: everyone who has never made a Stripe purchase.
  return all.filter((u) => !paid.has(u.id))
}

"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

// Buy permanent extra library storage as a credit-sink (ADR-078). The purchase RPC is
// service_role-only and takes a user id, so we pass the SERVER-VERIFIED user id here — a client
// can never spoof another user's id. Reservation/settlement are untouched; this only deducts
// credits (like any other credit spend) and grows the user's storage bonus.
export async function purchaseStorageAction(blocks: number = 1): Promise<
  { success: true; newBalance: number; newCapBytes: number } | { success: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "You need to be signed in." }

  const n = Math.floor(blocks)
  if (!Number.isFinite(n) || n < 1 || n > 50) return { success: false, error: "Invalid amount." }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("purchase_library_space", {
    p_user_id: user.id,
    p_blocks: n,
  })
  if (error) {
    console.error("[purchaseStorage]", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }

  const res = data as { success: boolean; error?: string; new_balance?: number; new_cap_bytes?: number }
  if (!res?.success) {
    const friendly =
      res?.error === "Insufficient credits" ? "Not enough credits."
      : res?.error === "Storage limit reached" ? "You've reached the maximum library storage (500 MB)."
      : (res?.error ?? "Purchase failed.")
    return { success: false, error: friendly }
  }

  // Both surfaces that render the storage meter must refresh their server-read cap/footprint.
  revalidatePath("/dashboard/account")
  revalidatePath("/dashboard")
  return { success: true, newBalance: res.new_balance ?? 0, newCapBytes: res.new_cap_bytes ?? 0 }
}

'use server'

import { createClient } from "@indxr/shared/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveEmailNotificationsAction(value: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ email_notifications: value })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// Marketing opt-out toggle. `subscribed = true` means the user WANTS marketing
// emails → marketing_unsubscribed = false (and vice versa). Separate from
// email_notifications (support-ticket replies) — do not conflate the two.
// Upsert (not update) so a user without an existing profiles row is handled:
// update().eq('id') would silently touch 0 rows for a missing profile.
export async function saveMarketingOptOutAction(subscribed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, marketing_unsubscribed: !subscribed }, { onConflict: 'id' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function saveLibraryPageSizeAction(size: 25 | 50 | 100) {
  if (![25, 50, 100].includes(size)) return { error: 'Invalid page size' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ library_page_size: size })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

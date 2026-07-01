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

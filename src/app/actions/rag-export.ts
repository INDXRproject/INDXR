'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveRagChunkSizeAction(chunkSize: 30 | 60 | 120) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ rag_chunk_size: chunkSize })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deductRagExportCreditsAction(
  durationSeconds: number,
  confirmExport: boolean
): Promise<{ success: true; cost: number; newBalance: number } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const cost = Math.max(1, Math.ceil(durationSeconds / 900))

  const { data, error } = await supabase.rpc('deduct_credits_atomic', {
    p_user_id: user.id,
    p_amount: cost,
    p_reason: 'RAG JSON Export',
    p_metadata: { duration_seconds: durationSeconds },
  })

  if (error) return { success: false, error: error.message }

  const result = data as { success: boolean; new_balance: number; error?: string }
  if (!result.success) return { success: false, error: result.error ?? 'Insufficient credits' }

  if (confirmExport) {
    await supabase
      .from('profiles')
      .update({ rag_export_confirmed: true })
      .eq('id', user.id)
  }

  return { success: true, cost, newBalance: result.new_balance }
}

export async function resetRagExportConfirmationAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ rag_export_confirmed: false })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

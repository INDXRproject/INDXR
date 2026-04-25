'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import type { TranscriptItem } from "@/utils/formatTranscript"

export async function saveRagChunkSizeAction(chunkSize: 30 | 60 | 90 | 120) {
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
  confirmExport: boolean,
  transcriptId?: string,
  chunkSize?: number,
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

  if (transcriptId) {
    const { data: row } = await supabase
      .from('transcripts')
      .select('rag_exports')
      .eq('id', transcriptId)
      .eq('user_id', user.id)
      .single()

    const current = (row?.rag_exports as object[] | null) ?? []
    await supabase
      .from('transcripts')
      .update({
        rag_exports: [
          ...current,
          { chunk_size: chunkSize ?? 60, exported_at: new Date().toISOString(), credits_spent: cost },
        ],
      })
      .eq('id', transcriptId)
      .eq('user_id', user.id)

    revalidatePath(`/dashboard/library/${transcriptId}`)
  }

  return { success: true, cost, newBalance: result.new_balance }
}

export async function downloadRagJsonFromLibraryAction(
  transcriptId: string,
): Promise<{
  success: true;
  transcript: TranscriptItem[];
  videoId: string | null;
  title: string | null;
  processingMethod: string | null;
  durationSeconds: number | null;
} | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('transcripts')
    .select('transcript, video_id, title, processing_method, duration')
    .eq('id', transcriptId)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Not found' }

  return {
    success: true,
    transcript: data.transcript as TranscriptItem[],
    videoId: data.video_id ?? null,
    title: data.title ?? null,
    processingMethod: data.processing_method ?? null,
    durationSeconds: data.duration ?? null,
  }
}


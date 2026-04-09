'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function claimWelcomeRewardAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Defense-in-depth: check credit_transactions before calling RPC
  // The RPC also checks welcome_reward_claimed atomically, but this avoids
  // unnecessary DB work if the reward was clearly already given.
  const { data: existing } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('reason', 'Welcome Reward')
    .maybeSingle()

  if (existing) {
    return { error: 'Reward already claimed' }
  }

  // Atomic RPC call to prevent race conditions and partial failures
  const { data, error: rpcError } = await supabase.rpc('claim_welcome_reward', {
    p_user_id: user.id
  })

  if (rpcError) {
    console.error('Error claiming reward:', rpcError)
    return { error: 'Failed to claim reward' }
  }

  // Check the JSON result from the function
  if (data && data.success === false) {
      return { error: data.error || 'Reward already claimed or unavailable' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

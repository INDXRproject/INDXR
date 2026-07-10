import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@indxr/shared/utils/supabase/admin'

// Eén Stripe Customer per user: hergebruikt profiles.stripe_customer_id of maakt er één
// en slaat het id op. Gebruikt door zowel de checkout (payment attach) als de on-demand
// factuurroute, zodat alle betalingen én facturen onder dezelfde Customer vallen.
export async function getOrCreateStripeCustomer(userId: string, email?: string | null): Promise<string> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  const existing = profile?.stripe_customer_id as string | null | undefined
  if (existing) {
    return existing
  }

  const customer = await stripe.customers.create(
    {
      email: email ?? undefined,
      metadata: { userId },
    },
    { idempotencyKey: `customer_${userId}` },
  )

  await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

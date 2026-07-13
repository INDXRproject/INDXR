import { createAdminClient } from "@indxr/shared/utils/supabase/admin"
import { FinanceView } from "./FinanceView"
import type { GeldSummary } from "../adminTypes"

export default async function AdminFinancePage() {
  const admin = createAdminClient()
  const { data } = await admin.rpc("admin_geld_summary")
  const geld = data as GeldSummary | null

  if (!geld) {
    return (
      <div className="rounded-xl border bg-surface p-6 text-sm text-fg-muted">
        Finance data unavailable.
      </div>
    )
  }

  return <FinanceView data={geld} />
}

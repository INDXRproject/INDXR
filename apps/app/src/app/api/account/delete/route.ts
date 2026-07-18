import { NextResponse } from "next/server"
import { createClient } from "@indxr/shared/utils/supabase/server"
import { createAdminClient } from "@indxr/shared/utils/supabase/admin"

export const runtime = "nodejs"

// Self-service account-verwijdering. Onomkeerbaar: verwijdert de auth-user → ON DELETE
// CASCADE ruimt alle user-data op, de BEFORE DELETE-trigger op auth.users nult
// usage_logs.ip_address en payment_attempts cascadet (migratie 20260718173000).
export async function POST() {
  const supabase = await createClient()

  // Auth-grens: UITSLUITEND de ingelogde sessie-user. Het te verwijderen id komt uit de
  // gevalideerde sessie (getUser), NOOIT uit de request-body — een user kan alleen zichzelf wissen.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Service-role (bypass RLS) is nodig om auth.users te verwijderen — alleen server-side.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sessie-cookies wissen zodat de client uitgelogd is (user bestaat niet meer).
  try {
    await supabase.auth.signOut()
  } catch {
    // sign-out mag niet de succesvolle delete blokkeren
  }

  return NextResponse.json({ success: true })
}

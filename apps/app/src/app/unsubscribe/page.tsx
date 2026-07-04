import type { Metadata } from "next"
import { verifyUnsubscribe } from "@/lib/unsubscribe-token"
import { UnsubscribeConfirm } from "./UnsubscribeConfirm"

export const metadata: Metadata = {
  title: "Unsubscribe — INDXR.AI",
  robots: { index: false },
}

// Public page (not under /dashboard or /admin, so the middleware lets it through
// without auth). Verifies the signed token server-side; the actual opt-out only
// happens on the explicit confirm POST.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const valid = token ? verifyUnsubscribe(token) !== null : false

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold text-fg">Unsubscribe from broadcasts</h1>
        {valid ? (
          <UnsubscribeConfirm token={token as string} />
        ) : (
          <p className="text-sm text-fg-muted">
            This unsubscribe link is invalid or has expired. If you keep receiving
            unwanted emails, contact support@indxr.ai.
          </p>
        )}
      </div>
    </div>
  )
}

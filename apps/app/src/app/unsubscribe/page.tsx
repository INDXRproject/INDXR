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
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex justify-center">
          <img
            src="/logo/indxr-wordmark-black-transparent.png"
            alt="INDXR.AI"
            className="dark:hidden"
            style={{ height: "32px", width: "auto" }}
          />
          <img
            src="/logo/indxr-wordmark-white-transparent.png"
            alt="INDXR.AI"
            className="hidden dark:block"
            style={{ height: "32px", width: "auto" }}
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm text-center space-y-4">
          {valid ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">
                Email preferences
              </h1>
              <UnsubscribeConfirm token={token as string} />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">
                Link expired
              </h1>
              <p className="text-sm text-fg-muted">
                This unsubscribe link is invalid or has expired. If you keep receiving
                unwanted emails, reach out to{" "}
                <a href="mailto:support@indxr.ai" className="text-accent hover:underline">
                  support@indxr.ai
                </a>
                .
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-fg-subtle">
          © INDXR.AI — YouTube transcripts &amp; summaries
        </p>
      </div>
    </div>
  )
}

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Account paused — INDXR.AI",
  robots: { index: false },
}

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <h1 className="text-2xl font-semibold text-[var(--fg)]">Your account is paused</h1>
        <p className="text-[var(--fg-muted)] leading-relaxed">
          Access to your account has been temporarily restricted.
        </p>
        <p className="text-sm text-[var(--fg-muted)]">
          {/* KHIDR: voeg contact email / link toe */}
          If you have questions, please get in touch with us.
        </p>
      </div>
    </div>
  )
}

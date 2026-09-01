"use client"
import { User } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

// Neutral avatar, straight from the design tokens: a plain surface disc with the user's initial.
// The old per-user colour generation (a bright palette hashed off the username/email) is gone — that
// was a leftover from a removed colour-picker, clashed with the design, and flickered because the seed
// switched once profile.username loaded in. The initial is taken from user.email, which is present on
// first paint (server-provided initialUser), so the neutral disc is correct immediately with no
// intermediate state.
export function UserAvatar({ className = "h-9 w-9 text-sm" }: { className?: string }) {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className={`rounded-full bg-surface-elevated border border-border flex items-center justify-center ${className}`}>
        <User className="h-1/2 w-1/2 text-fg-muted" />
      </div>
    )
  }

  const userInitial = (user.email?.charAt(0) || "U").toUpperCase()

  return (
    <div className={`rounded-full bg-surface-elevated border border-border text-fg flex items-center justify-center ${className}`}>
      <span className="font-semibold select-none leading-none flex items-center justify-center h-full w-full">{userInitial}</span>
    </div>
  )
}

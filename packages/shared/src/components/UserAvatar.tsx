"use client"
import { User } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

// Avatar colour is derived deterministically from the user's username/email — every user (new
// and existing) gets the same stable coloured initial, with no colour picker and no stored
// column to keep in sync. (The old avatar_color picker was removed; nothing writes that column
// any more.)
const PALETTE = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-500", "bg-teal-500",
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-pink-500", "bg-rose-500",
]

function colourFor(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function UserAvatar({ className = "h-9 w-9 text-sm" }: { className?: string }) {
  const { user, profile } = useAuth()

  if (!user) {
    return (
      <div className={`rounded-full bg-surface-elevated border-2 border-border flex items-center justify-center ${className}`}>
        <User className="h-1/2 w-1/2 text-fg-muted" />
      </div>
    )
  }

  const seed = profile?.username || user.email || user.id
  const avatarBg = colourFor(seed)
  const userInitial = (profile?.username?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()

  return (
    <div className={`rounded-full flex items-center justify-center text-white border border-border shadow-sm ${avatarBg} ${className}`}>
      <span className="font-semibold select-none leading-none flex items-center justify-center h-full w-full">{userInitial}</span>
    </div>
  )
}

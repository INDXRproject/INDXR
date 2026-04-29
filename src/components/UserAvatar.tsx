"use client"
import { User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export function UserAvatar({ className = "h-9 w-9 text-sm" }: { className?: string }) {
  const { user, profile } = useAuth()

  if (!user) {
      return (
          <div className={`rounded-full bg-surface-elevated border-2 border-border flex items-center justify-center ${className}`}>
              <User className="h-1/2 w-1/2 text-fg-muted" />
          </div>
      )
  }

  const avatarBg = profile?.avatar_color || "bg-surface-elevated"
  const userInitial = profile?.username
    ? profile.username.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U"

  return (
    <div className={`rounded-full flex items-center justify-center text-fg-on-accent border border-border shadow-sm ${avatarBg} ${className}`}>
        {profile?.avatar_color ? (
            <span className="font-semibold select-none leading-none flex items-center justify-center h-full w-full">{userInitial}</span>
        ) : (
            <User className="h-1/2 w-1/2 text-fg-subtle" />
        )}
    </div>
  )
}
